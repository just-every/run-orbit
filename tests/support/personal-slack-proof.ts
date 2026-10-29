import assert from 'node:assert/strict';
import {createId} from '../../src/core/shared/ids';
import {createDependencies} from './dependencies';
import {snapshot} from '../../src/core/features/delegation/evidence';
import type {SlackFixture} from './slack-notices-proof';
import type {slackNetwork} from './slack-network';
/** Personal mentions through native routes with only Slack's HTTP edge replaced. */
export async function provePersonalSlack(f:SlackFixture,deal:string,edge:ReturnType<typeof slackNetwork>){
 const deps=createDependencies(f.db),recipient=createId();
 await deps.auth.ensureOperator({id:recipient,email:`${recipient}@orbit.test`,displayName:'Personal Recipient'});
 const session=await deps.auth.createSession(recipient),headers={Cookie:`__Host-orbit_session=${session.token}`};
 const own=async(path='',method='GET',body?:unknown)=>f.request('notifications/slack'+path,method,body,headers);
 const prefs=async()=>{const r=await own();assert.equal(r.status,200);return await r.json() as any;};
 const opt=async(enabled=true)=>{const r=await own('','PUT',{enabled,slackUserId:'UPERSONAL'});assert.equal(r.status,200,await r.clone().text());};
 const map=async(revoked=false)=>{const r=await f.request('settings/slack/mappings','PUT',{slackUserId:'UPERSONAL',operatorId:recipient,revoked});assert.equal(r.status,200,await r.clone().text());};
 const process=async()=>{assert.equal((await f.request('settings/slack/process','POST',{})).status,200);};
 const dm=()=>edge.posts.filter(p=>p.channel==='DPERSONAL');
 const note=async(text='@Personal Recipient review synthetic-orbit-1 and amount 12345',id?:string)=>{const r=await f.request(`records/opportunity/${deal}/entries`+(id?'/'+id:''),id?'PUT':'POST',{kind:'note',text,occurredAt:new Date().toISOString()});assert.equal(r.status,200,await r.clone().text());return await r.json() as any;};
 const paused=async()=>{await f.db.prepare("UPDATE slack_installation SET state='disconnected'").run();const entry=await note();await f.db.prepare("UPDATE slack_installation SET state='connected'").run();return entry;};
 const row=async(id:string)=>f.db.prepare('SELECT * FROM slack_personal_notices WHERE event_key=?').bind('mention:entry:'+id).first<any>();
 assert.equal((await own('','PUT',{enabled:true,slackUserId:'UNMAPPED'})).status,409,'Unmapped personal delivery is refused');
 assert.equal((await own('','PUT',{enabled:true,slackUserId:'UMAPPED'})).status,409,'Another operator mapping never grants consent');
 await map();assert.equal((await prefs()).enabled,false);const before=dm().length;await note();assert.equal(dm().length,before,'An explicit mapping does not opt anyone in');
 for(const safety of [{team_id:'TFOREIGN'},{deleted:true},{is_bot:true},{is_restricted:true},{is_ultra_restricted:true},{is_stranger:true}]){edge.setUserSafety(safety);assert.equal((await own('','PUT',{enabled:true,slackUserId:'UPERSONAL'})).status,503,'Foreign, revoked or guest Slack users are refused');}edge.setUserSafety({});
 await opt();assert.equal((await prefs()).enabled,true);
 const entry=await note();assert.equal(dm().length,before+1);assert.equal((await row(entry.id)).state,'sent');
 assert.ok(dm().at(-1).text.includes('#entry-'+entry.id));assert.equal(dm().at(-1).unfurl_links,false);assert.equal(dm().at(-1).unfurl_media,false);
 for(const forbidden of ['Personal Recipient','synthetic-orbit-1','12345'])assert.ok(!JSON.stringify(dm().at(-1)).includes(forbidden),'No entry text, name or amount enters the DM');
 await note('@Personal Recipient edited entry',entry.id);await process();assert.equal(dm().length,before+1,'Entry edit and repeated processing cannot resend');
 const queued=await paused();await own('','PUT',{enabled:false});await process();assert.equal((await row(queued.id)).state,'withdrawn');assert.equal(dm().length,before+1,'Opt-out withdraws pending notices');await opt();
 const privateEntry=await paused();assert.equal((await f.request(`entries/visibility/entry/${privateEntry.id}`,'PUT',{private:true})).status,200);assert.equal(dm().length,before+2);assert.ok(dm().at(-1).text.includes('private entry'));assert.ok(!dm().at(-1).text.includes('synthetic-orbit-1'));
 const deleted=await paused();await f.db.prepare("UPDATE slack_installation SET state='disconnected'").run();assert.equal((await f.request(`records/opportunity/${deal}/entries/${deleted.id}`,'DELETE',{})).status,200);await f.db.prepare("UPDATE slack_installation SET state='connected'").run();await process();assert.ok(!await row(deleted.id)||(await row(deleted.id)).state==='withdrawn');assert.equal(dm().length,before+2,'Deletion before dispatch sends nothing');
 const access=await paused();await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=? WHERE kind='opportunity' AND id=?").bind(f.actor,deal).run();await process();assert.equal((await row(access.id)).state,'withdrawn');assert.equal(dm().length,before+2);await f.db.prepare("UPDATE graph_records SET visibility='workspace' WHERE kind='opportunity' AND id=?").bind(deal).run();
 const revoked=await paused();await map(true);await process();assert.equal((await row(revoked.id)).state,'withdrawn');assert.equal((await prefs()).enabled,false);await map();assert.equal((await prefs()).enabled,false,'Re-confirming mapping never restores personal consent');await opt();
 const inactive=await paused();await f.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(recipient).run();await process();assert.equal((await row(inactive.id)).state,'withdrawn');assert.equal(dm().length,before+2);await f.db.prepare("UPDATE operators SET status='active' WHERE id=?").bind(recipient).run();headers.Cookie=`__Host-orbit_session=${(await deps.auth.createSession(recipient)).token}`;await map();await opt();
 const foreign=await paused();edge.setUserSafety({team_id:'TFOREIGN'});await process();assert.equal((await row(foreign.id)).state,'failed');assert.equal(dm().length,before+2);edge.setUserSafety({});
 edge.setOutcome('denied');const failed=await note();assert.equal((await row(failed.id)).state,'failed');const failedAttempts=edge.attempts;await process();assert.equal(edge.attempts,failedAttempts,'Definite failures require explicit retry');edge.setOutcome('sent');assert.equal((await own('/'+(await row(failed.id)).id+'/retry','POST',{})).status,200);assert.equal((await row(failed.id)).state,'sent');
 edge.setOutcome('timeout');const uncertain=await note();assert.equal((await row(uncertain.id)).state,'uncertain');const attempts=edge.attempts;await process();assert.equal(edge.attempts,attempts);assert.equal((await own('/'+(await row(uncertain.id)).id+'/retry','POST',{})).status,409,'Uncertainty cannot resend');edge.setOutcome('sent');
 const interrupted=await paused();await f.db.prepare("UPDATE slack_personal_notices SET state='submitting',updated_at='2000-01-01T00:00:00.000Z' WHERE event_key=?").bind('mention:entry:'+interrupted.id).run();await process();assert.equal((await row(interrupted.id)).state,'uncertain');assert.equal(edge.attempts,attempts,'A recovered interrupted claim never resends');
 edge.setOutcome('rate');const rate=await note();assert.equal((await row(rate.id)).state,'rate-limited');f.setClock(new Date(Date.now()+2000));await process();f.setClock(undefined);assert.equal((await row(rate.id)).state,'sent');
 const task=await f.request('tasks','POST',{title:'Mention task',recordType:'opportunity',recordId:deal,ownerId:f.actor,dueAt:new Date(Date.now()+86400000).toISOString(),priority:'normal',type:'follow_up',notes:'@Personal Recipient synthetic-orbit-2',recurrence:'none',timezone:'UTC',reminderMinutes:null});assert.equal(task.status,201,await task.clone().text());const taskId=(await task.json() as any).id;assert.ok(dm().at(-1).text.includes('#sales-task-'+taskId));
 assert.equal((await f.request(`records/opportunity/${deal}/lifecycle`,'POST',{state:'open',reason:'Continue internal mention review'})).status,200);
 const handoffId=createId(),target=`opportunities/${deal}/handoffs/${handoffId}`,state=await snapshot(f.db,target,true);
 const handoff=await f.app.request('https://orbit.test/delegation/handoffs',{method:'POST',headers:{Cookie:`__Host-orbit_session=${f.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({operationKey:createId(),operation:'orbit.handoff.upsert',target,expectedRevision:state.revision,expectedAudienceRevision:state.audience.audienceRevision,content:{title:'Mention handoff',description:'@Personal Recipient synthetic-orbit-3',assigneeId:f.actor,dueAt:null,status:'open'}})});assert.equal(handoff.status,200,await handoff.clone().text());await process();assert.ok(dm().at(-1).text.includes('#handoff-'+handoffId));
 const quiet=edge.attempts;await process();await process();assert.equal(edge.attempts,quiet,'Task and handoff deliveries survive repeated ticks without duplicates');
 const unchanged=await paused();await opt();assert.equal((await row(unchanged.id)).state,'sent','Saving an unchanged opt-in preserves eligible pending delivery');
 // Accepted personal messages keep original provider custody after opt-out and erasure.
 const erase=async(id:string)=>{const r=await f.request(`records/opportunity/${deal}/entries/${id}`,'DELETE',{});assert.equal(r.status,200,await r.clone().text());};
 const deletion=async(id:string)=>f.db.prepare('SELECT * FROM slack_personal_deletions WHERE notice_id=?').bind(id).first<any>();
 const retract=await note(),receipt=await row(retract.id),post=dm().at(-1);await opt(false);const postsBefore=dm().length;await erase(retract.id);await process();
 assert.equal((await deletion(receipt.id)).state,'deleted');assert.ok(edge.deletes.some(d=>d.channel===post.channel&&d.ts===post.ts),'Source deletion retracts its original personal message even after consent ends');assert.equal(dm().length,postsBefore,'Deletion never posts a replacement');await opt();
 for(const outcome of ['denied','timeout','wrong','missing','rate'] as const){
  const source=await note(),attempt=await row(source.id),original=dm().at(-1);edge.setDeletionOutcome(outcome);await erase(source.id);await process();
  const state=(await deletion(attempt.id)).state;assert.equal(state,outcome==='denied'?'failed':outcome==='missing'?'deleted':outcome==='rate'?'rate-limited':'uncertain');
  if(['failed','uncertain'].includes(state)){
   const count=edge.deletes.length;await process();assert.equal(edge.deletes.length,count,'Uncertain or failed deletion waits for explicit confirmation');
   assert.equal((await f.request('notifications/slack/deletions/'+attempt.id+'/retry','POST',{confirmed:true})).status,409,'A different operator cannot confirm personal deletion');
   edge.setDeletionOutcome('sent');assert.equal((await own('/deletions/'+attempt.id+'/retry','POST',{})).status,400);assert.equal((await own('/deletions/'+attempt.id+'/retry','POST',{confirmed:true})).status,200);
   assert.deepEqual(edge.deletes.at(-1),{channel:original.channel,ts:original.ts},'Retry targets the original receipt, never the latest message');
  }else if(state==='rate-limited'){f.setClock(new Date(Date.now()+3000));await process();f.setClock(undefined);}
  edge.setDeletionOutcome('sent');assert.equal((await deletion(attempt.id)).state,'deleted');
 }
 const heldSource=await note(),heldNotice=await row(heldSource.id);edge.setDeletionOutcome('denied');await erase(heldSource.id);await process();assert.equal((await deletion(heldNotice.id)).state,'failed');edge.setDeletionOutcome('sent');
 // Leave a pending attempt in the export: restore must retain history but strip authority.
 await paused();
 return {recipient,headers};
}
