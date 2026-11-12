import {expect} from '@playwright/test';

/** Extend the retained teammate-removal journey; no additional test registration. */
export async function exerciseRemovalHandover({page,operatorId,operatorName,receiverId,contactId}){
 const origin=new URL(page.url()).origin;
 const call=async(path,method='GET',data,status=200)=>{
  const response=await page.request.fetch('/api/v1/'+path,{method,headers:{Origin:origin},...(data===undefined?{}:{data})});
  expect(response.status(),await response.text()).toBe(status);return response.json();
 };
 const contacts=[contactId];
 for(let n=1;n<5;n++)contacts.push((await call('records/contact','POST',{...(n<4?{name:'Synthetic removal contact '+n}:{}),email:'synthetic-orbit-removal-'+operatorId.toLowerCase()+'-'+n+'@example.test'},201)).id);
 const company=await call('records/company','POST',{name:'Synthetic removal company'},201);
 const assign=async(kind,ids,ownerId)=>{
  const review=await call('records/ownership/review','POST',{kind,ids,ownerId});
  const applied=await call('records/ownership/'+review.id+'/apply','POST',{});
  expect(applied.items.every(item=>item.applied)).toBe(true);
 };
 await assign('contact',contacts,operatorId);await assign('company',[company.id],operatorId);
 const settings=await call('settings');
 const deal=await call('records/opportunity','POST',{title:'Synthetic removal deal',owner_id:operatorId,stage_id:settings.stages[0].id,value_cents:12000},201);
 const task=await call('tasks','POST',{title:'Synthetic removal task',recordType:'contact',recordId:contacts[0],ownerId:operatorId,dueAt:new Date(Date.now()+86400000).toISOString(),priority:'normal',type:'follow_up',notes:'',recurrence:'none',timezone:'UTC',reminderMinutes:null},201);
 const reviewPath='settings/operators/'+operatorId+'/removal-review',removePath='settings/operators/'+operatorId;
 const inventory=await call(reviewPath);
 expect(inventory.contacts.map(row=>row.id).sort()).toEqual([...contacts].sort());
 expect(inventory.companies.map(row=>row.id)).toEqual([company.id]);
 const plan={review:inventory.review,opportunities:receiverId,tasks:null,handoffs:null,contacts:receiverId,companies:null};
 // An older client cannot silently strand contacts, and an incomplete set choice refuses atomically.
 const {contacts:omitted,...missingContacts}=plan;
 await call(removePath,'DELETE',{confirmed:true,handover:missingContacts},409);
 const {companies:omittedCompany,...missingCompanies}=plan;
 await call(removePath,'DELETE',{confirmed:true,handover:missingCompanies},409);
 await call(removePath,'DELETE',{confirmed:true,handover:{...plan,contacts:operatorId}},409);
 await call(removePath,'DELETE',{confirmed:true,handover:{...plan,companies:operatorId}},409);
 // Both independent owner kinds invalidate a saved removal review.
 for(const [kind,id]of [['contact',contacts[0]],['company',company.id]]){
  const before=await call(reviewPath);
  await assign(kind,[id],receiverId);
  await call(removePath,'DELETE',{confirmed:true,handover:{...plan,review:before.review}},409);
  expect((await call('settings')).operators.find(row=>row.id===operatorId).status).toBe('active');
  expect((await call('records/opportunity/'+deal.id)).record.owner_id).toBe(operatorId);
  expect((await call('tasks/'+task.id)).task.ownerId).toBe(operatorId);
  await assign(kind,[id],operatorId);
 }
 await page.getByRole('button',{name:'Remove '+operatorName,exact:true}).click();
 const review=page.getByRole('region',{name:'Operator removal review',exact:true});
 const contactsChoice=review.getByLabel('Receiving operator for contacts',{exact:true});
 await expect(contactsChoice).toBeVisible();
 for(const id of contacts){
  const detail=await call('records/contact/'+id);
  await expect(review.getByText(detail.record.name||detail.record.email,{exact:true})).toBeVisible();
 }
 const companyDetail=await call('records/company/'+company.id);
 await expect(review.getByText(companyDetail.record.name,{exact:true})).toBeVisible();
 const confirm=review.getByRole('button',{name:'Confirm handover and remove',exact:true});
 await contactsChoice.selectOption(receiverId);
 await review.getByLabel('Receiving operator for opportunities',{exact:true}).selectOption(receiverId);
 await review.getByLabel('Receiving operator for tasks',{exact:true}).selectOption('unassigned');
 await expect(confirm).toBeDisabled();
 await review.getByLabel('Receiving operator for companies',{exact:true}).selectOption('unassigned');
 await expect(confirm).toBeEnabled();
 await confirm.click();await expect(review).toHaveCount(0);
 await call(removePath,'DELETE',{confirmed:true,handover:plan},409);
 await assertRemovedSummary(page,operatorName);
 for(const [kind,ids,target]of [['contact',contacts,receiverId],['company',[company.id],null]]){
  for(const id of ids){
   const detail=await call('records/'+kind+'/'+id);
   expect(detail.ownership.ownerId).toBe(target);
   const entries=detail.timeline.filter(row=>row.kind==='owner.changed'&&JSON.parse(row.payload_json).reason==='Operator removal handover');
   expect(entries).toHaveLength(1);expect(entries[0].actor_id).toBe(receiverId);
   expect(Number.isFinite(Date.parse(entries[0].occurred_at))).toBe(true);
   expect(JSON.parse(entries[0].payload_json)).toMatchObject({previous:operatorId,current:target});
   await page.goto('/app/'+(kind==='company'?'companies':'contacts')+'/'+id);
   await expect(page.locator('#entry-'+entries[0].id)).toBeVisible();
  }
 }
 expect((await call('records/opportunity/'+deal.id)).record.owner_id).toBe(receiverId);
 expect((await call('tasks/'+task.id)).task.ownerId).toBeNull();
 // A second rep takes the opposite choices, proving unassignment and receiving ownership for each kind.
 const second=await call('settings/operators','POST',{email:'synthetic-orbit-second-'+operatorId.toLowerCase()+'@example.test',displayName:'Synthetic second rep'},201);
 await assign('contact',[contacts[4]],second.id);await assign('company',[company.id],second.id);
 await page.goto('/app/settings/team');await page.getByRole('button',{name:'Remove Synthetic second rep',exact:true}).click();
 const secondReview=page.getByRole('region',{name:'Operator removal review',exact:true});
 await secondReview.getByLabel('Receiving operator for contacts',{exact:true}).selectOption('unassigned');
 await secondReview.getByLabel('Receiving operator for companies',{exact:true}).selectOption(receiverId);
 await secondReview.getByRole('button',{name:'Confirm handover and remove',exact:true}).click();await expect(secondReview).toHaveCount(0);
 await assertRemovedSummary(page,'Synthetic second rep');
 for(const [kind,id,target]of [['contact',contacts[4],null],['company',company.id,receiverId]]){
  const detail=await call('records/'+kind+'/'+id);expect(detail.ownership.ownerId).toBe(target);
  const entries=detail.timeline.filter(row=>row.kind==='owner.changed'&&JSON.parse(row.payload_json).previous===second.id);
  expect(entries).toHaveLength(1);expect(entries[0].actor_id).toBe(receiverId);expect(JSON.parse(entries[0].payload_json).current).toBe(target);
 }
 await page.reload();await assertRemovedSummary(page,operatorName);
}
async function assertRemovedSummary(page,name){
 const member=page.locator('.fold-row').filter({has:page.getByRole('heading',{name,exact:true})});
 await expect(member).toContainText(/removed/i);
 await expect(member).not.toContainText(/full access/i);
}
