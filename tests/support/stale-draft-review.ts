import assert from 'node:assert/strict';
import type {OperatorDraft} from '../../src/core/features/operator/ui/operator-api';
import type {createApp} from './app';

/** Continue the context-change journey through native Records, review and approval. */
export async function staleDraftReview(app:ReturnType<typeof createApp>,cookie:string,opportunityId:string,submissions:()=>number){
 const request=(path:string,method='GET',body?:unknown)=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 async function json<T>(path:string,method='GET',body?:unknown){const response=await request(path,method,body);assert.ok(response.ok,`${method} ${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<T>;}
 const detail=await json<{opportunity:{contacts:{id:string;name:string}[]}}>(`opportunities/${opportunityId}`),contact=detail.opportunity.contacts[0]!;
 const created=await json<{id:string}>(`workbench/opportunities/${opportunityId}/drafts`,'POST',{contactId:contact.id,subject:'Synthetic reviewed subject',body:'Synthetic saved customer message.'});
 const read=async()=>(await json<{draft:OperatorDraft}>(`drafts/${created.id}`)).draft;
 const review=(draft:OperatorDraft)=>({revision:draft.revision,reviewedUpdatedAt:draft.updatedAt,recipientContactId:draft.recipientContactId,recipientEmail:draft.recipientEmail,subject:draft.subject,body:draft.body});
 const inventory=()=>json(`workbench/opportunities/${opportunityId}/messages`);
 const baseline=await inventory();
 const original=await read();assert.equal(original.isStale,false);
 async function refused(draft:OperatorDraft){
  const preview=await json<{localTime:string}>(`workbench/drafts/${created.id}/approval-preview`);
  const response=await request(`workbench/drafts/${created.id}/approve`,'POST',{revision:draft.revision,quietHoursConfirmation:preview.localTime});
  assert.equal(response.status,409,await response.clone().text());
  assert.deepEqual(await inventory(),baseline,'refusing the otherwise valid revision creates no outbound work');
  assert.equal(submissions(),0,'no refused revision reaches the mail provider');
 }
 await json(`records/contact/${contact.id}`,'PATCH',{changes:{name:'Synthetic current recipient'},base:{name:contact.name}});
 const contactStale=await read();
 assert.equal(contactStale.id,original.id);assert.equal(contactStale.revision,original.revision);assert.equal(contactStale.isStale,true);assert.match(contactStale.staleReason!,/Contact changed/);
 await refused(contactStale);
 const currentContact=await json<{record:{name:string}}>(`records/contact/${contact.id}`);assert.equal(currentContact.record.name,'Synthetic current recipient');
 await json(`workbench/drafts/${created.id}/review`,'POST',review(contactStale));
 const contactReviewed=await read();assert.equal(contactReviewed.isStale,false);assert.equal(contactReviewed.revision,original.revision+1);
 assert.deepEqual(await inventory(),baseline,'explicit review alone sends nothing');assert.equal(submissions(),0);

 await json(`records/opportunity/${opportunityId}`,'PATCH',{changes:{title:'Synthetic current deal'}});
 const dealStale=await read();assert.equal(dealStale.id,original.id);assert.equal(dealStale.revision,contactReviewed.revision);assert.equal(dealStale.isStale,true);
 await refused(dealStale);
 const currentDeal=await json<{record:{title:string}}>(`records/opportunity/${opportunityId}`);assert.equal(currentDeal.record.title,'Synthetic current deal');
 // A second real edit invalidates the review that the operator already opened.
 await json(`records/opportunity/${opportunityId}`,'PATCH',{changes:{title:'Synthetic latest deal'},base:{title:currentDeal.record.title}});
 const beforeRejectedReview=await read();
 const rejected=await request(`workbench/drafts/${created.id}/review`,'POST',review(dealStale));assert.equal(rejected.status,409,await rejected.clone().text());
 assert.deepEqual(await read(),beforeRejectedReview,'a superseded review changes no saved content or revision');
 assert.deepEqual(await inventory(),baseline);assert.equal(submissions(),0);
 await refused(beforeRejectedReview);
 const latest=await json<{opportunity:{title:string;contacts:{name:string}[]}}>(`opportunities/${opportunityId}`);assert.equal(latest.opportunity.title,'Synthetic latest deal');assert.equal(latest.opportunity.contacts[0]!.name,'Synthetic current recipient');
 await json(`workbench/drafts/${created.id}/review`,'POST',review(beforeRejectedReview));
 const fresh=await read();assert.equal(fresh.isStale,false);assert.equal(fresh.revision,contactReviewed.revision+1);
 assert.equal(fresh.subject,original.subject);assert.equal(fresh.body,original.body);
 const requested=new Date(Date.now()+7*86400000).toISOString();
 const schedule=await json<{scheduledAt:string;localTime:string}>(`workbench/drafts/${created.id}/approval-preview?scheduledAt=${encodeURIComponent(requested)}`);
 const approval={scheduledAt:requested,scheduledAtConfirmation:schedule.scheduledAt,quietHoursConfirmation:schedule.localTime};
 const obsolete=await request(`workbench/drafts/${created.id}/approve`,'POST',{...approval,revision:contactReviewed.revision});assert.equal(obsolete.status,409);
 assert.deepEqual(await inventory(),baseline);assert.equal(submissions(),0);
 const scheduled=await json<{id:string;state:string;scheduledAt:string}>(`workbench/drafts/${created.id}/approve`,'POST',{...approval,revision:fresh.revision});
 assert.equal(scheduled.state,'scheduled');assert.equal(scheduled.scheduledAt,schedule.scheduledAt);
 const after=await json<{messages:{id:string;draftId:string;revision:number;state:string;subject:string;body:string}[]}>(`workbench/opportunities/${opportunityId}/messages`);
 assert.equal(after.messages.length,1);assert.equal(after.messages[0]!.id,scheduled.id);assert.equal(after.messages[0]!.draftId,original.id);assert.equal(after.messages[0]!.revision,fresh.revision);assert.equal(after.messages[0]!.state,'scheduled');assert.equal(after.messages[0]!.subject,original.subject);assert.equal(after.messages[0]!.body,original.body);
 assert.equal(submissions(),0,'future scheduling never submits customer mail');
}
