import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {todayApp} from './today-workspace';
import {createId} from '../../src/core/shared/ids';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';

/** Recorded sales history; the browser operates the emitted app over these same native records. */
export async function browserRiskData(db:D1Database,owner:string){
 const t=await todayApp(db,{operatorId:owner}),email=['synthetic-orbit-38','risk.test'].join('@');
 const deal=await t.opportunity('Northwind renewal','Northwind','Ana Ruiz',email,1800000);
 const context=await t.json<any>(`/api/v1/relationships/opportunity/${deal}`,{},200),ana=context.stakeholders[0].contactId;
 const commitments='Kickoff on 2026-11-03 at USD 18,000 per year once legal signs.';
 const callText='Ana said kickoff is 2026-11-17 and the price she approved is USD 21,000 per year.';
 await t.json(`/api/v1/relationships/opportunity/${deal}`,{method:'PUT',body:{revision:context.revision,companyId:context.company?.id??null,primaryContactId:ana,stakeholders:[{contactId:ana,roles:['champion'],verified:true}],products:['Annual licence'],nextStep:'Send the order form',mutualCommitments:commitments}},200);
 const call=await t.json<{id:string}>(`/api/v1/records/opportunity/${deal}/entries`,{body:{kind:'call',text:callText,occurredAt:'2020-01-03T12:00:00.000Z',durationMinutes:15}},200);
 const promiseTitle='Send the security questionnaire',taskTitle='Send the pricing sheet';
 const promise=await t.json<any>(`/api/v1/risks/${deal}/tasks`,{body:{title:promiseTitle,dueAt:'2020-01-04T12:00:00.000Z',evidenceIds:[call.id]}},201);
 const task=await t.json<{id:string}>('/api/v1/tasks',{body:{title:taskTitle,recordType:'opportunity',recordId:deal,ownerId:owner,dueAt:'2020-01-04T12:00:00.000Z',priority:'high',type:'follow_up',notes:'',recurrence:'none',timezone:'UTC',reminderMinutes:null}},201);
 // Historical stage entry and an already reviewed, queued send, as in the native reply-authority journey.
 await db.prepare('UPDATE opportunities SET created_at=? WHERE id=?').bind('2020-01-02T12:00:00.000Z',deal).run();
 const message=createId(),subject='Renewal dates for review',at='2020-01-03T12:00:00.000Z';
 await db.prepare('INSERT INTO outbound_messages(id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at) VALUES(?,1,?,?,?,?,?,?,?,?,?,?,?,?)').bind(message,deal,owner,ana,email,subject,'Please confirm our renewal dates.','queued',at,at,message,`<${message}>`,at).run();
 const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),events=createMailEventRoutes(db,{eventKey:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')});
 for(const event of ['processed','open']){
  const raw=Buffer.from(JSON.stringify([{sg_event_id:createId(),event,timestamp:1578139200,email,rer_product:'orbit',rer_delivery_id:message,sg_message_id:'synthetic-orbit-38'}]));
  const timestamp=String(Math.floor(Date.now()/1000));
  const response=await events.request('https://orbit.test/sendgrid',{method:'POST',headers:{'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':sign('sha256',Buffer.concat([Buffer.from(timestamp),raw]),keys.privateKey).toString('base64')},body:raw});
  assert.equal(response.status,200,await response.text());
 }
 return {deal,owner,call:call.id,commitments,callText,promise:promise.observed.target.split('/')[3],promiseTitle,task:task.id,taskTitle,subject};
}

export async function riskBusinessState(db:D1Database){
 return Promise.all(['opportunities','opportunity_contacts','opportunity_stakeholder_roles','opportunity_buying_context','forecast_revisions','forecast_snapshots','forecast_snapshot_records','forecast_source_clock','drafts','outbound_messages'].map(async table=>(await db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results));
}
