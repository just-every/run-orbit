import assert from 'node:assert/strict';
import {testAuth} from './test-auth';
import type {SlackFixture} from './slack-notices-proof';
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
 const ack=action();assert.match((await signed(ack)).text,/acknowledged/);await refused(ack);assert.equal((await call('')).notices.find((n:any)=>n.message_ts===posts[0].ts).acknowledged_by,f.actor);
 const makeTask=action('UMAPPED','orbit_task'),actionId=makeTask.actions[0].value;
 const issued=()=>f.db.prepare('SELECT * FROM slack_action_tokens WHERE id=?').bind(actionId).first<any>();
 const priorToken=await issued();assert.ok(priorToken);assert.equal(priorToken.consumed_at,null);assert.equal(priorToken.operator_id,null);
 const notice=async()=>(await call('')).notices.find((n:any)=>n.id===priorToken.notice_id),priorNotice=await notice();
 const effects=async()=>{
  const rows=await f.db.batch([
   f.db.prepare('SELECT * FROM slack_actions ORDER BY id'),
   f.db.prepare('SELECT * FROM sales_tasks ORDER BY id'),
   f.db.prepare('SELECT * FROM sales_task_series ORDER BY id'),
   f.db.prepare('SELECT * FROM sales_task_timeline ORDER BY task_id,entry_id'),
   f.db.prepare('SELECT * FROM timeline_entries ORDER BY id'),
   f.db.prepare('SELECT * FROM timeline_entry_records ORDER BY timeline_entry_id,record_type,record_id'),
   f.db.prepare('SELECT * FROM runtime_controls ORDER BY name')
  ]);return rows.map(row=>row.results);
 };
 const priorEffects=await effects();
 await f.db.prepare("CREATE TRIGGER synthetic_orbit_task_insert_failure BEFORE INSERT ON sales_tasks BEGIN SELECT RAISE(ABORT,'synthetic-orbit-task-insert'); END").run();
 try{
  const failed=await signed(makeTask);assert.equal(failed.status,200);assert.match(failed.data.text,/Action received/);assert.match(failed.text,/uncertain or was refused/);
  assert.deepEqual(await issued(),priorToken,'Failed task creation leaves the issued action unconsumed and unattributed');
  assert.deepEqual(await notice(),priorNotice,'Failed task creation preserves the prior notice and acknowledgment');
  assert.deepEqual(await effects(),priorEffects,'The failed D1 batch leaves no action, task, series, timeline or guard effect');
 }finally{await f.db.prepare('DROP TRIGGER synthetic_orbit_task_insert_failure').run();}
 assert.match((await signed(makeTask)).text,/task created/);
 const consumed=await issued();assert.ok(consumed.consumed_at);assert.equal(consumed.operator_id,f.actor);
 const committed=await effects();
 for(const index of [0,1,2,3,4,5])assert.equal(committed[index]!.length,priorEffects[index]!.length+1,'The same issued action commits one complete task effect set');
 assert.deepEqual(await notice(),priorNotice,'Creating an internal task does not rewrite the notice');
 await refused({...makeTask,actions:makeTask.actions.map((a:any)=>({...a,action_ts:'1800000002.000000'}))});
 assert.deepEqual(await issued(),consumed,'Replay retains the original single consumption');assert.deepEqual(await effects(),committed,'Replay creates no further task or timeline effect');
 const task=await f.db.prepare("SELECT t.* FROM sales_tasks t JOIN slack_actions a ON a.task_id=t.id WHERE a.action='orbit_task'").first<any>();assert.equal(task.created_by,f.actor);assert.equal(task.owner_id,f.actor);assert.equal(task.notes,'');assert.equal(await f.db.prepare('SELECT source FROM timeline_entries WHERE id IN(SELECT entry_id FROM sales_task_timeline WHERE task_id=?) LIMIT 1').bind(task.id).first('source'),'Slack');
 const removed=await(await f.request('settings/operators','POST',{email:'removed@orbit.test',displayName:'Removed seller'})).json() as any;await call('mappings','PUT',{slackUserId:'UREMOVED',operatorId:removed.id,revoked:false});const viewer=await testAuth(f.db).createSession(removed.id),visible=await(await f.request('settings/slack','GET',undefined,{Cookie:'__Host-orbit_session='+viewer.token})).json() as any;assert.equal(visible.admin,false);assert.deepEqual(visible.mappings.map((m:any)=>m.slack_user_id),['UREMOVED'],'Mapped operator sees their own explicit mapping');const response=await f.request(`settings/operators/${removed.id}`,'DELETE',{confirmed:true});assert.equal(response.status,200,await response.clone().text());await refused(action('UREMOVED','orbit_ack',{},posts[2]));
 // A mapping's old permission epoch is dead immediately after access changes.
 await call('mappings','PUT',{slackUserId:'UMAPPED',operatorId:f.actor,revoked:false});await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=NULL WHERE kind='opportunity' AND id=?").bind(deal).run();await refused(action('UMAPPED','orbit_ack',{},posts[2]));await f.db.prepare("UPDATE graph_records SET visibility='workspace',owner_id=NULL WHERE kind='opportunity' AND id=?").bind(deal).run();await call('mappings','PUT',{slackUserId:'UMAPPED',operatorId:f.actor,revoked:false});
 assert.ok(Number(await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action='slack.mapping-changed'").first('n'))>0);assert.ok(Number(await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action='slack.action-refused'").first('n'))>0);
}
