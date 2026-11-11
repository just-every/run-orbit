import assert from 'node:assert/strict';
import {createApp} from '../../src/core/app/app';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import type {RejectedReportProofContext} from './agent-door-proof';

/** Native sessions and the signed MCP route share one installation. The saved
 * workflow is an existing automatic producer, including for agent-created work. */
export async function notificationDirectProof({bindings,cookie,reviewerCookie,ownerId,businessCall}:Pick<RejectedReportProofContext,'bindings'|'cookie'|'reviewerCookie'|'ownerId'|'businessCall'>){
 const origin=bindings.AUTH_ORIGIN!,app=createApp({database:bindings.DB,assets:bindings.ASSETS,
  authenticate:request=>operatorFromRequest(request,bindings),stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)});
 const request=async(session:string,path:string,body?:object,status=200,method=body?'POST':'GET')=>{
  const response=await app.request(origin+path,{method,headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;
 };
 const native=(path:string,body?:object,status=200,method?:string)=>request(cookie,path,body,status,method);
 const inbox=(session=cookie)=>request(session,'/api/v1/notifications');
 const other=await operatorFromRequest(new Request(origin+'/app',{headers:{Cookie:reviewerCookie}}),bindings);assert.ok(other);
 const before=await inbox(),otherBefore=await inbox(reviewerCookie),stage=(await native('/api/v1/workbench')).stages[0].id;
 const created=await native('/api/v1/workbench/opportunities',{title:'Synthetic own notification proof',companyName:'Synthetic notice company',contactName:'Synthetic notice contact',email:'synthetic-orbit-notice@example.test',stageId:stage,valueCents:0},201);
 const own=await inbox();assert.equal(own.unread,before.unread,'A direct create leaves its person’s unread count unchanged');
 assert.ok(!own.notifications.some((n:any)=>n.opportunityId===created.id),'The self-notification is never inserted');
 assert.deepEqual(own.notifications,before.notifications,'Existing notices and their read state stay intact');
 const deal=await native('/api/v1/records/opportunity',{title:'Synthetic colleague notice',stage_id:stage,owner_id:other.operatorId,value_cents:0},201);
 const event={type:'meeting.booked',subject:'Synthetic colleague enquiry',occurredAt:new Date().toISOString(),eventId:crypto.randomUUID()};
 await native(`/api/v1/workbench/opportunities/${deal.id}/events`,event,201);
 await native(`/api/v1/workbench/opportunities/${deal.id}/events`,event,201);
 const colleague=await inbox(reviewerCookie);
 assert.equal(colleague.unread,otherBefore.unread+1,'The other responsible person still receives one notice on replay');
 assert.equal(colleague.notifications.filter((n:any)=>n.opportunityId===deal.id).length,1);
 assert.equal((await inbox()).unread,before.unread);

 const title='Synthetic agent notification proof',definition={trigger:{kind:'record_created',recordType:'opportunity'},conditions:[{field:'title',operator:'equals',value:title}],actions:[{kind:'notify',title:'Agent-created work needs review',operatorIds:[ownerId]}]};
 const workflow=(await native('/api/workflows',{name:'Synthetic notification producer',definition})).workflow.id;
 const preview=await native(`/api/workflows/${workflow}/preview`,{});
 await native(`/api/workflows/${workflow}/activate`,{previewId:preview.previewId});
 const args={kind:'opportunity',record:{title,stage_id:stage,owner_id:ownerId,value_cents:0},idempotency_key:'synthetic-orbit-notification-agent'};
 const agent=await businessCall('orbit.records.create',args);
 assert.equal(agent.status,200);assert.equal(agent.body.result.isError,false,JSON.stringify(agent.body));
 const agentId=agent.body.result.structuredContent.id;assert.ok(agentId);
 await native('/api/workflows/process',{});
 const notified=await inbox(),notice=notified.notifications.find((n:any)=>n.opportunityId===agentId&&n.kind==='workflow.notice');
 assert.ok(notice,'Work created by an authenticated agent for A still notifies A');assert.equal(notice.readAt,null);
 assert.equal(notified.unread,before.unread+1);
 assert.equal(notified.unread,notified.notifications.filter((n:any)=>!n.readAt).length,'The unread count equals the unread feed rows');
 assert.equal((await businessCall('orbit.records.create',args)).body.result.isError,false);
 await native('/api/workflows/process',{});assert.deepEqual(await inbox(),notified,'Agent and workflow replay never duplicate the notice');
 // The same configured automation still reaches its owner after a direct action.
 const automated=await native('/api/v1/records/opportunity',{title,stage_id:stage,owner_id:ownerId,value_cents:0},201);
 await native('/api/workflows/process',{});
 const automatic=await inbox();assert.equal(automatic.unread,notified.unread+1);
 assert.ok(automatic.notifications.some((n:any)=>n.opportunityId===automated.id&&n.kind==='workflow.notice'));
 for(const row of before.notifications)assert.deepEqual(automatic.notifications.find((n:any)=>n.id===row.id),row,'Previously stored notices are untouched');
 await native(`/api/workflows/${workflow}/pause`,{});
 // Leave the enclosing membership/removal journey's owned-work inventory intact.
 const ownRecord=await native(`/api/v1/records/opportunity/${created.id}`);
 for(const id of [created.id,deal.id,agentId,automated.id])await native(`/api/v1/records/opportunity/${id}`,{confirmed:true},200,'DELETE');
 for(const contact of ownRecord.contacts)await native(`/api/v1/records/contact/${contact.id}`,{confirmed:true},200,'DELETE');
 await native(`/api/v1/records/company/${ownRecord.record.company_id}`,{confirmed:true},200,'DELETE');
 console.log(JSON.stringify({proof:'direct-notifications',directCreateDelta:0,colleagueDelta:1,agentDelta:1,automationDelta:1,replayDelta:0,existingRowsUnchanged:true}));
}
