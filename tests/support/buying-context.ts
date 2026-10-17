import assert from 'node:assert/strict';
import type {ContactContext,OpportunityContext} from '../../src/core/features/relationships/contracts';

/** Public-door helpers only: the parent suite owns registrations and session setup. */
export async function readBuyingContext<T extends ContactContext|OpportunityContext>(fetcher:typeof fetch,origin:string,kind:T['kind'],id:string,headers:HeadersInit={}){
 const response=await fetcher(`${origin}/api/v1/relationships/${kind}/${id}`,{headers});
 const body=await response.json() as T&{error?:string};
 assert.equal(response.status,200,body.error);
 return body;
}
export async function writeBuyingContext(fetcher:typeof fetch,origin:string,context:ContactContext|OpportunityContext,changes:Record<string,unknown>={},headers:HeadersInit={}){
 const payload=context.kind==='opportunity'?{
  revision:context.revision,companyId:context.company?.id??null,
  primaryContactId:context.stakeholders.find(item=>item.isPrimary)?.contactId??null,
  stakeholders:context.stakeholders.map(({contactId,roles,verified})=>({contactId,roles,verified})),
  products:context.products,nextStep:context.nextStep,mutualCommitments:context.mutualCommitments
 }:{revision:context.revision,secondaryCompanies:context.secondaryCompanies.map(({companyId,verified})=>({companyId,verified}))};
 const requestHeaders=new Headers(headers);requestHeaders.set('Content-Type','application/json');requestHeaders.set('Origin',origin);
 return fetcher(`${origin}/api/v1/relationships/${context.kind}/${context.recordId}`,{method:'PUT',headers:requestHeaders,body:JSON.stringify({...payload,...changes})});
}

export async function exerciseBuyingContext(request:(path:string,method?:string,body?:unknown)=>Promise<Response>,actor:string){
 const json=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await request(path,method,body);assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
 const company=await json('records/company','POST',{name:'Northwind Manufacturing'},201),second=await json('records/company','POST',{name:'Northwind Services'},201);
 const champion=await json('records/contact','POST',{name:'Ana Rivera',email:'ana@northwind.example',company_id:company.id},201),evaluator=await json('records/contact','POST',{name:'Blake Morgan',email:'blake@northwind.example',company_id:company.id},201);
 const decisionMaker=await json('records/contact','POST',{name:'Carmen Okafor',email:'carmen@northwind.example',company_id:company.id},201);
 const settings=await json('settings'),input={title:'Northwind annual plan',stage_id:settings.stages[0].id,owner_id:actor,company_id:company.id,value_cents:1000000,contact_ids:[champion.id,evaluator.id,decisionMaker.id],primary_contact_id:champion.id};
 const deal=await json('records/opportunity','POST',input,201),closed=await json('records/opportunity','POST',{...input,title:'Northwind previous order',value_cents:2000000},201);
 await json(`records/opportunity/${closed.id}/lifecycle`,'POST',{state:'won',reason:'Signed last year'});
 await json(`records/opportunity/${deal.id}/entries`,'POST',{kind:'note',text:'Original buying committee discussion',occurredAt:new Date().toISOString()});
 const original=await json(`records/opportunity/${deal.id}`),before=await json(`relationships/opportunity/${deal.id}`);
 const payload={revision:before.revision,companyId:company.id,primaryContactId:champion.id,stakeholders:[{contactId:champion.id,roles:['champion'],verified:true},{contactId:evaluator.id,roles:['evaluator'],verified:false},{contactId:decisionMaker.id,roles:['decision_maker'],verified:true}],products:['Team plan','Onboarding'],nextStep:'Review security with procurement on Friday',mutualCommitments:'Ana will invite procurement; Maya will send the security answers.'};
 const saved=await json(`relationships/opportunity/${deal.id}`,'PUT',payload);
 assert.deepEqual(saved.stakeholders.find((s:any)=>s.contactId===champion.id).roles,['champion']);assert.equal(saved.stakeholders.find((s:any)=>s.contactId===champion.id).verified,true);assert.equal(saved.stakeholders.find((s:any)=>s.contactId===evaluator.id).verified,false);assert.equal(saved.stakeholders.find((s:any)=>s.contactId===decisionMaker.id).verified,true);
 await json(`relationships/opportunity/${deal.id}`,'PUT',{...payload,nextStep:'Overwrite a stale review'},409);
 await json(`records/opportunity/${deal.id}`,'PUT',{...input,expected_close_at:'2027-04-01T16:00:00.000Z'});
 assert.deepEqual((await json(`relationships/opportunity/${deal.id}`)).stakeholders.find((s:any)=>s.contactId===champion.id).roles,['champion'],'ordinary record edits preserve stakeholder roles');
 const contactContext=await json(`relationships/contact/${champion.id}`);
 await json(`relationships/contact/${champion.id}`,'PUT',{revision:contactContext.revision,secondaryCompanies:[{companyId:second.id,verified:true}]});
 assert.ok((await json(`records/company/${second.id}`)).contacts.some((c:any)=>c.id===champion.id&&!c.relationship_primary));
 const contact=await json(`records/contact/${champion.id}`);await json(`records/contact/${champion.id}`,'PUT',{...contact.record,company_id:second.id,custom_fields:{}});
 const promoted=await json(`relationships/contact/${champion.id}`);assert.equal(promoted.primaryCompany.id,second.id);assert.deepEqual(promoted.secondaryCompanies,[]);
 const current=await json(`relationships/opportunity/${deal.id}`);await json(`relationships/opportunity/${deal.id}`,'PUT',{...payload,revision:current.revision,companyId:second.id});
 const oldCompany=await json(`records/company/${company.id}`),newCompany=await json(`records/company/${second.id}`),linkedContact=await json(`records/contact/${champion.id}`),after=await json(`records/opportunity/${deal.id}`);
 assert.equal(oldCompany.openValueCents,0);assert.equal(newCompany.openValueCents,1000000);assert.equal(newCompany.opportunities.find((d:any)=>d.id===deal.id).owner_id,actor);
 assert.ok(linkedContact.opportunities.some((d:any)=>d.id===deal.id));assert.equal(after.record.lifecycle,original.record.lifecycle);assert.equal(after.record.score,original.record.score);assert.equal(linkedContact.record.contactability,'contactable');
 for(const entry of original.timeline)assert.ok(after.timeline.some((e:any)=>e.id===entry.id),'association changes leave old history on the original record');
 await json(`records/contact/${champion.id}`,'DELETE',{confirmed:true});const erased=await json(`relationships/opportunity/${deal.id}`);assert.equal(erased.nextStep,'');assert.equal(erased.mutualCommitments,'');assert.ok(!erased.stakeholders.some((s:any)=>s.contactId===champion.id));
}
