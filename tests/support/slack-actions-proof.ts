import assert from 'node:assert/strict';
import {testAuth} from './test-auth';
import type {SlackFixture} from './slack-notices-proof';
import {random} from '../../src/core/features/delegation/protocol';
import {challenge} from '../../src/core/features/delegation/token';

/** The same explicit consent and PKCE journey as the cited brief handoff proof. */
async function proposeScopedHandoff(f:SlackFixture,deal:string){
 const client='synthetic-orbit-handoff',redirect='https://synthetic-orbit.test/callback';
 const form=(path:string,body:Record<string,string>)=>f.app.request('https://orbit.test/delegation'+path,{method:'POST',headers:{Cookie:`__Host-orbit_session=${f.token}`,Origin:'https://orbit.test'},body:new URLSearchParams(body)});
 assert.equal((await form('/clients',{id:client,redirect_uri:redirect})).status,303);
 const verifier=random(),consent=await form('/authorize',{client_id:client,redirect_uri:redirect,response_type:'code',state:random(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.handoff.write',targets:JSON.stringify([`opportunities/${deal}`])});
 assert.equal(consent.status,303,await consent.clone().text());
 const code=new URL(consent.headers.get('Location')!).searchParams.get('code')!;
 const exchange=await f.app.request('https://orbit.test/api/delegation/v1/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',client_id:client,redirect_uri:redirect,code,code_verifier:verifier})});
 assert.equal(exchange.status,200,await exchange.clone().text());
 const token=(await exchange.json() as {access_token:string}).access_token;
 const delegated=(path:string,body?:unknown)=>f.app.request('https://orbit.test/api/delegation/v1'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const identity=await(await delegated('/identity')).json() as any;
 assert.deepEqual(identity.targets,[`opportunities/${deal}`]);
 assert.deepEqual(identity.scopes,['crm.evidence.read','crm.handoff.write']);
 assert.equal(identity.principalId,f.actor);
 // Cite an actual customer signal already read through the application's scoped brief.
 const brief=await(await delegated('/brief')).json() as any;
 const evidence=brief.brief.accounts.flatMap((account:any)=>account.lines).find((line:any)=>line.kind==='signal')?.evidence.id;
 assert.ok(evidence,'The scoped brief supplies real evidence for the proposal');
 const target=`opportunities/${deal}/handoffs/${random().slice(0,32)}`;
 const check=await(await delegated('/check?target='+encodeURIComponent(target))).json() as any;
 const audience=await(await delegated('/audience?operation=orbit.handoff.upsert&target='+encodeURIComponent(target))).json() as any;
 const content={title:'Review synthetic-orbit-1',description:'Cited application proposal',assigneeId:f.actor,dueAt:null,status:'open',evidence:[evidence]};
 const proposal=await delegated('/effects',{operationKey:'synthetic-orbit-proposal',operation:'orbit.handoff.upsert',target,expectedRevision:check.revision,expectedAudienceRevision:audience.audienceRevision,content});
 assert.equal(proposal.status,200,await proposal.clone().text());
 assert.equal((await proposal.json() as any).receipt.target,target);
 const read=async()=>{
  const response=await f.app.request('https://orbit.test/delegation/handoffs/'+deal,{headers:{Cookie:`__Host-orbit_session=${f.token}`}});
  assert.equal(response.status,200,await response.clone().text());
  const entry=(await response.json() as any).tasks.find((item:any)=>item.target===target);
  assert.ok(entry,'The native handoff list retains the proposed identity');
  return entry;
 };
 const initial=await read();
 assert.deepEqual([initial.task.id,initial.task.source_client_id,initial.task.actor_id,initial.task.title,initial.task.description,initial.task.assignee_id,initial.task.status,initial.task.evidence],[target.split('/')[3],client,f.actor,content.title,content.description,f.actor,'open',[evidence]]);
 const remainsProposed=async()=>{
  assert.deepEqual(await read(),initial,'Slack acknowledgment preserves the entire proposal and its revision');
  const response=await f.request('today');assert.equal(response.status,200);
  const current=await response.json() as any;
  assert.ok(current.brief.accounts.flatMap((account:any)=>account.lines).some((line:any)=>line.kind==='handoff-proposed'&&line.evidence.id===initial.task.id),'The native brief still offers the handoff as a proposal');
 };
 await remainsProposed();
 return {remainsProposed};
}
export async function proveSlackActions(f:SlackFixture,{deal,posts,call,signed}:any){
 const button=(message:any,kind:string)=>message.blocks[1].elements.find((b:any)=>b.action_id===kind).value;
 const action=(user='UMAPPED',kind='orbit_ack',change:any={},message=posts[0])=>({type:'block_actions',api_app_id:'AORBIT',team:{id:'TWORKSPACE'},enterprise:null,user:{id:user,team_id:'TWORKSPACE'},channel:{id:'CINTERNAL'},container:{channel_id:'CINTERNAL',message_ts:message.ts},message:{ts:message.ts,user:'UBOT'},actions:[{action_id:kind,value:button(message,kind==='orbit_task'?'orbit_task':'orbit_ack'),action_ts:'1800000001.123456'}],response_url:'https://hooks.slack.com/actions/test-only/response',...change});
 const counts=async()=>({actions:await f.db.prepare('SELECT count(*) n FROM slack_actions').first('n'),tasks:await f.db.prepare('SELECT count(*) n FROM sales_tasks').first('n')});
 const refused=async(payload:any)=>{const before=await counts(),result=await signed(payload);assert.match(result.text,/Not changed/);assert.deepEqual(await counts(),before);};
 assert.equal((await signed(action(),'actions',{unsigned:true})).status,401);assert.equal((await signed(action(),'actions',{stale:true})).status,401);assert.equal((await signed(action(),'actions',{bad:true})).status,401);
 await refused(action());await call('mappings','PUT',{slackUserId:'UMAPPED',operatorId:f.actor,revoked:false});
 for(const change of [{team:{id:'TFOREIGN'}},{api_app_id:'AFOREIGN'},{enterprise:{id:'EFOREIGN'}},{user:{id:'UMAPPED',team_id:'TFOREIGN'}},{channel:{id:'CFOREIGN'}},{message:{ts:posts[0].ts,user:'UOTHER'}}])await refused(action('UMAPPED','orbit_ack',change));
 await refused(action('UMAPPED','mail_approve'));
 await call('mappings','PUT',{slackUserId:'UMAPPED',operatorId:f.actor,revoked:true});await refused(action());await call('mappings','PUT',{slackUserId:'UMAPPED',operatorId:f.actor,revoked:false});
 const proposal=await proposeScopedHandoff(f,deal);
 const unchanged=async()=>Object.fromEntries(await Promise.all(['handoff_tasks','drafts','outbound_messages','sales_tasks'].map(async table=>[table,await f.db.prepare(`SELECT count(*) n FROM ${table}`).first('n')])));
 const beforeAck=await unchanged(),ack=action(),notice=(await call('')).notices.find((n:any)=>n.message_ts===posts[0].ts);
 assert.equal(notice.record_id,deal,'A legitimate issued notice concerns the same deal as the proposal');
 const acknowledgment=await signed(ack);assert.equal(acknowledgment.status,200);assert.match(acknowledgment.text,/acknowledged/);
 const readAck=async()=>{
  const saved=(await call('')).notices.find((n:any)=>n.id===notice.id);
  assert.equal(saved.acknowledged_by,f.actor);assert.ok(saved.acknowledged_at);
  return {at:saved.acknowledged_at,actions:(await f.db.prepare('SELECT id,notice_id,slack_user_id,operator_id,action,task_id FROM slack_actions WHERE notice_id=?').bind(notice.id).all()).results,tokens:(await f.db.prepare('SELECT consumed_at,operator_id FROM slack_action_tokens WHERE id=?').bind(ack.actions[0].value).all()).results,audits:(await f.db.prepare("SELECT actor_id FROM audit_entries WHERE action='slack.acknowledged' AND entity_id=?").bind(ack.actions[0].value).all()).results};
 };
 const acknowledged=await readAck();
 assert.deepEqual(acknowledged.actions,[{id:ack.actions[0].value,notice_id:notice.id,slack_user_id:'UMAPPED',operator_id:f.actor,action:'orbit_ack',task_id:null}]);
 assert.deepEqual(acknowledged.tokens,[{consumed_at:acknowledged.at,operator_id:f.actor}]);
 assert.deepEqual(acknowledged.audits,[{actor_id:f.actor}]);
 await proposal.remainsProposed();assert.deepEqual(await unchanged(),beforeAck);
 assert.equal(await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='handoff.accepted'").first('n'),0);
 await refused(ack);await refused({...ack,actions:ack.actions.map((item:any)=>({...item,action_ts:'1800000003.000000'}))});
 assert.deepEqual(await readAck(),acknowledged,'Replayed delivery cannot consume the issued action twice');
 await proposal.remainsProposed();assert.deepEqual(await unchanged(),beforeAck);
 assert.equal(await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='handoff.accepted'").first('n'),0);
 const makeTask=action('UMAPPED','orbit_task');assert.match((await signed(makeTask)).text,/task created/);await refused({...makeTask,actions:makeTask.actions.map((a:any)=>({...a,action_ts:'1800000002.000000'}))});
 const task=await f.db.prepare("SELECT t.* FROM sales_tasks t JOIN slack_actions a ON a.task_id=t.id WHERE a.action='orbit_task'").first<any>();assert.equal(task.created_by,f.actor);assert.equal(task.owner_id,f.actor);assert.equal(task.notes,'');assert.equal(await f.db.prepare('SELECT source FROM timeline_entries WHERE id IN(SELECT entry_id FROM sales_task_timeline WHERE task_id=?) LIMIT 1').bind(task.id).first('source'),'Slack');
 const removed=await(await f.request('settings/operators','POST',{email:'removed@orbit.test',displayName:'Removed seller'})).json() as any;await call('mappings','PUT',{slackUserId:'UREMOVED',operatorId:removed.id,revoked:false});const viewer=await testAuth(f.db).createSession(removed.id),visible=await(await f.request('settings/slack','GET',undefined,{Cookie:'__Host-orbit_session='+viewer.token})).json() as any;assert.equal(visible.admin,false);assert.deepEqual(visible.mappings.map((m:any)=>m.slack_user_id),['UREMOVED'],'Mapped operator sees their own explicit mapping');const response=await f.request(`settings/operators/${removed.id}`,'DELETE',{confirmed:true});assert.equal(response.status,200,await response.clone().text());await refused(action('UREMOVED','orbit_ack',{},posts[2]));
 // A mapping's old permission epoch is dead immediately after access changes.
 await call('mappings','PUT',{slackUserId:'UMAPPED',operatorId:f.actor,revoked:false});await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=NULL WHERE kind='opportunity' AND id=?").bind(deal).run();await refused(action('UMAPPED','orbit_ack',{},posts[2]));await f.db.prepare("UPDATE graph_records SET visibility='workspace',owner_id=NULL WHERE kind='opportunity' AND id=?").bind(deal).run();await call('mappings','PUT',{slackUserId:'UMAPPED',operatorId:f.actor,revoked:false});
 assert.ok(Number(await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action='slack.mapping-changed'").first('n'))>0);assert.ok(Number(await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action='slack.action-refused'").first('n'))>0);
}
