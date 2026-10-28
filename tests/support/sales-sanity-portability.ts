import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import type {CaptureFixture} from './capture-fixture';
import {createApp} from './app';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {slackNetwork} from './slack-network';
import {replyForm,signedReplies} from './signed-reply';
import {createId} from '../../src/core/shared/ids';

type RequestDoor=(path:string,init?:RequestInit)=>Promise<Response>;
/** Small sales payload for the one shared Records / CLI portability journey. */
export async function populateSalesPortability(f:CaptureFixture){
 await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.operator).run();
 const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')}),outboundMail:{send:async()=>({providerMessageId:createId()})}});
 const request:RequestDoor=(path,init={})=>app.request('https://orbit.test'+path,{...init,headers:{Cookie:f.cookie,Origin:'https://orbit.test',...init.headers}});
 const call=async(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>{const r=await request('/api/v1/'+path,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
 const definition={kind:'contact',fieldKey:'portability_amount',label:'Original recorded amount',valueType:'number',required:false,unique:false,options:[],archived:false};
 const configure=async(input:typeof definition)=>{const review=await call('settings/custom-fields/preview',input);await call('settings/custom-fields/confirm',{input,reviewHash:review.reviewHash,confirmed:true});};
 await configure(definition);
 const ana=await call(`records/contact/${f.ana}`);
 await call(`records/contact/${f.ana}`,{...ana.record,custom_fields:{...JSON.parse(ana.record.custom_fields_json),portability_amount:42}},'PUT');
 await configure({...definition,label:'Recorded amount'});await configure({...definition,label:'Recorded amount',archived:true});
 const historyPath='/api/v1/settings/custom-fields/history?kind=contact&fieldKey=portability_amount',history=await (await request(historyPath)).json();
 const edge=slackNetwork();
 try{
  await call('settings/slack/connect',{token:edge.token,signingSecret:edge.secret});
  await call('settings/slack/channels',{id:'CINTERNAL',events:['won'],enabled:true},'PUT');
  const original=await call(`records/opportunity/${f.opportunity}`),stage=original.record.stage_id;
  const deal=await call('records/opportunity',{title:'Portable sales review',stage_id:stage,value_cents:4200,company_id:f.company,contact_ids:[f.ana],primary_contact_id:f.ana});
  await call(`records/opportunity/${deal.id}/lifecycle`,{state:'won',reason:'Recorded acceptance'});
  assert.equal(edge.posts.length,1,'the portable Slack history has a genuine delivered notice');
  // The accepted notice binds the verified bot app before a user can be mapped.
  const connected=await call('settings/slack');assert.ok(connected.installation.app_id);
  await call('settings/slack/mappings',{slackUserId:'UMAPPED',operatorId:f.operator,revoked:false},'PUT');
  const signed=async(payload:any,route:string)=>{const timestamp=String(Math.floor(Date.now()/1000)),raw=route==='actions'?new URLSearchParams({payload:JSON.stringify(payload)}).toString():JSON.stringify(payload),signature='v0='+createHmac('sha256',edge.secret).update(`v0:${timestamp}:${raw}`).digest('hex'),work:Promise<unknown>[]=[];
   const r=await app.fetch(new Request('https://orbit.test/api/v1/slack/'+route,{method:'POST',headers:{'Content-Type':route==='actions'?'application/x-www-form-urlencoded':'application/json','X-Slack-Request-Timestamp':timestamp,'X-Slack-Signature':signature},body:raw}),{}, {waitUntil(p:Promise<unknown>){work.push(p);},passThroughOnException(){}} as ExecutionContext);assert.equal(r.status,200,await r.clone().text());await Promise.all(work);};
  const notice=edge.posts[0],button=notice.blocks[1].elements.find((b:any)=>b.action_id==='orbit_ack');
  await signed({type:'block_actions',api_app_id:'AORBIT',team:{id:'TWORKSPACE'},enterprise:null,user:{id:'UMAPPED',team_id:'TWORKSPACE'},channel:{id:'CINTERNAL'},container:{channel_id:'CINTERNAL',message_ts:notice.ts},message:{ts:notice.ts,user:'UBOT'},actions:[{action_id:'orbit_ack',value:button.value,action_ts:'1800000001.123456'}],response_url:'https://hooks.slack.com/actions/test-only/response'},'actions');
  await signed({type:'event_callback',team_id:'TWORKSPACE',api_app_id:'AORBIT',authorizations:[{team_id:'TWORKSPACE',enterprise_id:null}],event_id:'Ev'+createId(),event:{type:'user_change',user:{id:'UOTHER',team_id:'TWORKSPACE',deleted:true}}},'events');
  const removed=await call('records/contact',{name:'Disposable Slack buyer',email:'synthetic-orbit-portable-slack@example.test'}),old=await call('records/opportunity',{title:'Old portable Slack notice',stage_id:stage,value_cents:0,contact_ids:[removed.id],primary_contact_id:removed.id});
  await call(`records/opportunity/${old.id}/lifecycle`,{state:'won',reason:'Recorded'});await call(`records/contact/${removed.id}`,{confirmed:true},'DELETE');
 // Later writes and erasure also process Slack; the caller keeps this edge for the journey.
 const compose=async(subject:string)=>call(`workbench/records/contact/${f.ana}/drafts`,{contactId:f.ana,opportunityId:null,subject,body:'Portable reviewed content for ana@acme.example'});
 const draft=await compose('Portable accepted record mail'),render=await call(`library/drafts/${draft.id}/render`);await call(`library/drafts/${draft.id}/render`,{revision:1,reviewHash:render.reviewHash});const preview=await call(`workbench/drafts/${draft.id}/approval-preview`);
 const accepted=await call(`workbench/drafts/${draft.id}/approve`,{revision:1,quietHoursConfirmation:preview.localTime});assert.equal(accepted.state,'accepted');
 await compose('Portable unsent record draft');
 const held=replyForm('ana@acme.example',`<${createId()}@portable.test>`,'');assert.equal((await signedReplies(f.db)(held)).status,200);
 const stableTables=['record_custom_fields','record_custom_field_history','slack_notices','slack_actions','slack_events','slack_deletions','record_mail_outbound_messages','record_mail_obligations','unlinked_replies'];
 const snapshot=new Map<string,Record<string,unknown>[]>();for(const table of [...stableTables,'slack_channels','slack_mappings','record_mail_drafts'])snapshot.set(table,(await f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all<Record<string,unknown>>()).results);
 for(const table of stableTables)assert.ok(snapshot.get(table)!.length,`${table} is populated before transfer`);
 const sort=(rows:Record<string,unknown>[])=>rows.map(row=>JSON.stringify(row)).sort();
 return {
  restoreNetwork:edge.restore,
  async assertRestored(db:D1Database,door:RequestDoor){
   for(const table of stableTables)assert.deepEqual(sort((await db.prepare(`SELECT * FROM ${table}`).all<Record<string,unknown>>()).results),sort(snapshot.get(table)!),`${table} content survives the shared transfer`);
   for(const [table,transform] of [['slack_channels',(row:any)=>({...row,enabled:0})],['slack_mappings',(row:any)=>{assert.ok(row.revoked_at);return row;}]] as const){const actual=(await db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all<any>()).results,expected=snapshot.get(table)!;assert.equal(actual.length,expected.length);for(const [i,row] of actual.entries()){if(table==='slack_mappings'){assert.ok(row.revoked_at);assert.deepEqual({...row,revoked_at:null},{...expected[i],revoked_at:null});}else assert.deepEqual(row,transform(expected[i]));}}
   const drafts=(await db.prepare('SELECT * FROM record_mail_drafts ORDER BY rowid').all<any>()).results;assert.equal(drafts.length,snapshot.get('record_mail_drafts')!.length);for(const [i,row] of drafts.entries()){assert.equal(row.is_stale,1);assert.ok(row.stale_reason);assert.ok(Number.isFinite(Date.parse(row.updated_at)));const {is_stale,stale_reason,updated_at,...content}=row,{is_stale:beforeStale,stale_reason:beforeReason,updated_at:beforeUpdated,...original}=snapshot.get('record_mail_drafts')![i];assert.deepEqual(content,original);}
   for(const table of ['slack_credentials','slack_action_tokens'])assert.equal(await db.prepare(`SELECT count(*) n FROM ${table}`).first('n'),0);
   const read=await door(historyPath);assert.equal(read.status,200);assert.deepEqual(await read.json(),history);
  },
  async assertErased(db:D1Database,door:RequestDoor){
   assert.equal((await door(`/api/v1/records/contact/${f.ana}`)).status,404);
   for(const [table,column]of [['record_mail_drafts','recipient_contact_id'],['record_mail_obligations','contact_id']] as const)assert.equal(await db.prepare(`SELECT count(*) n FROM ${table} WHERE ${column}=?`).bind(f.ana).first('n'),0);
   assert.equal(await db.prepare('SELECT count(*) n FROM unlinked_replies WHERE lower(sender)=?').bind('ana@acme.example').first('n'),0);
   const slack=(await db.prepare('SELECT * FROM slack_notices').all()).results;assert.ok(slack.every(row=>row.record_id!==f.ana&&!String(row.content_json).includes('ana@acme.example')));
  }
 };
 }catch(error){edge.restore();throw error;}
}
