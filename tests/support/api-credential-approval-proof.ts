import {strict as assert} from 'node:assert';
import {createApp} from './app';
import {isolatedDatabase} from './isolated-database';
import {createDependencies} from './dependencies';
import {createId} from '../../src/core/shared/ids';

const jsonType=Response.json(null).headers.get('Content-Type')!;

/**
 * A real saved draft awaits a person's approval. Every API credential, the broadest one included, is refused at
 * the approval door and leaves the draft, outbound mail and history untouched; the signed-in person's own
 * approval of the same exact revision still sends it, and expiry cannot be undone by any credential door.
 */
export async function proveCredentialCannotApprove(){
 const fixture=await isolatedDatabase(),db=fixture.db,deps=createDependencies(db),now='2026-10-27T00:00:00.000Z';let clockNow=new Date(now),sends=0;
 try{
  const owner=createId(),principal=createId(),stage=createId();
  await deps.workspace.ensureWorkspace({name:'synthetic-orbit-1',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  await deps.workspace.ensurePipelineStage({id:stage,name:'synthetic-orbit-1',position:0});
  await deps.auth.ensureOperator({id:owner,email:'synthetic-orbit-1@dev.localhost',displayName:'synthetic-orbit-1'});
  await deps.auth.ensureOperator({id:principal,email:'synthetic-orbit-2@dev.localhost',displayName:'synthetic-orbit-2'});
  await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(owner).run();
  const session=await deps.auth.createSession(owner),cookie='__Host-orbit_session='+session.token;
  const app=createApp({database:db,clock:{now:()=>clockNow},assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:{send:async()=>{sends++;return{providerMessageId:'synthetic-orbit-mail-1'};}}});
  const call=(path:string,method='GET',body?:unknown,headers:Record<string,string>={})=>app.request('https://orbit.test'+path,{method,headers:{Origin:'https://orbit.test','Content-Type':jsonType,...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const native=(path:string,method='GET',body?:unknown)=>call('/api/v1/'+path,method,body,{Cookie:cookie});
  const payload=async(response:Response,status=200)=>{assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
  const deal=await payload(await native('workbench/opportunities','POST',{title:'synthetic-orbit-1 deal',companyName:'synthetic-orbit-1 company',contactName:'synthetic-orbit-3',email:'synthetic-orbit-3@dev.localhost',stageId:stage,valueCents:10000}),201);
  const contactId=(await db.prepare('SELECT contact_id FROM opportunity_contacts WHERE opportunity_id=?').bind(deal.id).first<{contact_id:string}>())!.contact_id;
  const draft=await payload(await native(`workbench/opportunities/${deal.id}/drafts`,'POST',{contactId,subject:'synthetic-orbit-1 subject',body:'synthetic-orbit-1 reviewed body'}),201);
  const preview=await payload(await native(`workbench/drafts/${draft.id}/approval-preview`));
  const approval={revision:1,quietHoursConfirmation:preview.localTime};
  const issue=async(change:Record<string,unknown>={})=>payload(await native('settings/api-credentials','POST',{name:'synthetic-orbit-1',principalId:principal,operations:['deal.read','deal.create','deal.update'],recordIds:[deal.id],fields:['title','stage_id','value_cents'],expiresAt:'2026-10-28T00:00:00.000Z',...change}),201) as Promise<{credential:{id:string;revision:number};secret:string}>;
  const credential=await issue(),owned=await issue({principalId:owner});
  const tables=['drafts','outbound_messages','outbound_delivery_budget','outbound_message_opt_out','opportunities','timeline_entries','audit_entries','notifications','api_credentials'];
  const inventory=async()=>Object.fromEntries((await db.batch(tables.map(table=>db.prepare(`SELECT * FROM ${table}`)))).map((result,index)=>[tables[index],result.results.map(row=>JSON.stringify(row)).sort()]));
  const saved=(await payload(await native(`drafts/${draft.id}`))).draft;
  assert.deepEqual((await payload(await native(`workbench/opportunities/${deal.id}/messages`))).messages,[],'The saved draft has not been approved');
  const before=await inventory();
  // Both credentials carry every operation the API can grant, one of them for the signed-in owner themself.
  for(const {secret} of [credential,owned]){
   const bearer={Authorization:'Bearer '+secret};
   assert.equal((await call(`/api/v1/workbench/drafts/${draft.id}/approve`,'POST',approval,bearer)).status,401,'The credential cannot approve the exact saved message');
   assert.equal((await call(`/api/v1/workbench/drafts/${draft.id}/approve`,'POST',{...approval,scheduledAt:'2026-10-27T12:00:00.000Z'},bearer)).status,401,'The credential cannot schedule an approval either');
   assert.equal((await call(`/api/v1/workbench/drafts/${draft.id}/approval-preview`,'GET',undefined,bearer)).status,401,'The credential cannot open the person-only review');
   assert.equal((await call(`/api/rest/v1/drafts/${draft.id}/approve`,'POST',approval,bearer)).status,404,'The public namespace has no approval or send operation');
   assert.equal((await call(`/api/rest/v1/deals/${deal.id}/messages`,'POST',approval,bearer)).status,404);
  }
  assert.equal(sends,0,'No customer mail reached the paid edge');
  assert.deepEqual(await inventory(),before,'Refused approvals change no draft, outbound message, history or credential');
  assert.deepEqual((await payload(await native(`drafts/${draft.id}`))).draft,saved,'The exact saved revision is still waiting for a person');
  // Expiry is final: no credential door extends, restores or re-approves with an expired credential.
  clockNow=new Date('2026-10-28T00:00:00.000Z');
  const expiredBefore=await inventory();
  assert.equal((await call('/api/rest/v1/deals/'+deal.id,'GET',undefined,{Authorization:'Bearer '+credential.secret})).status,401,'The expired credential authenticates nowhere');
  assert.equal((await call(`/api/v1/workbench/drafts/${draft.id}/approve`,'POST',approval,{Authorization:'Bearer '+credential.secret})).status,401);
  assert.equal((await native(`settings/api-credentials/${credential.credential.id}/rotate`,'POST',{revision:credential.credential.revision})).status,409,'An expired credential cannot be rotated back to life');
  assert.equal((await call('/api/rest/v1/deals/'+deal.id,'GET',undefined,{Authorization:'Bearer '+credential.secret})).status,401);
  assert.deepEqual(await inventory(),expiredBefore,'Expiry attempts leave every effect unchanged');
  clockNow=new Date(now);
  // The supported path still works: the signed-in person approves the same reviewed revision.
  const sent=await payload(await native(`workbench/drafts/${draft.id}/approve`,'POST',approval));
  assert.equal(sent.state,'accepted');assert.equal(sends,1);
  const message=await db.prepare('SELECT subject,body,operator_id FROM outbound_messages WHERE draft_id=?').bind(draft.id).first<Record<string,string>>();
  assert.deepEqual(message,{subject:'synthetic-orbit-1 subject',body:'synthetic-orbit-1 reviewed body',operator_id:owner},'Only the person approved, and the saved bytes are the ones sent');
 }finally{await fixture.dispose();}
}
