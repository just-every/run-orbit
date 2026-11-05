import assert from 'node:assert/strict';
import type {ContactContext,OpportunityContext} from '../../src/core/features/relationships/contracts';
import {identityResponse} from '../../src/core/features/identity';
import {emailLinkSignIn,mailedIdentity} from './email-link';

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

export async function exerciseBuyingContext(request:(path:string,method?:string,body?:unknown,cookie?:string)=>Promise<Response>,actor:string,db:D1Database){
 const json=async(path:string,method='GET',body?:unknown,status=200,cookie?:string)=>{const response=await request(path,method,body,cookie);assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
 const company=await json('records/company','POST',{name:'Northwind Manufacturing'},201),second=await json('records/company','POST',{name:'Northwind Services'},201);
 const champion=await json('records/contact','POST',{name:'Ana Rivera',email:['synthetic-orbit-015-1','example.test'].join('@'),company_id:company.id},201),evaluator=await json('records/contact','POST',{name:'Blake Morgan',email:['synthetic-orbit-015-2','example.test'].join('@'),company_id:company.id,contactability:'do_not_contact'},201);
 const decisionMaker=await json('records/contact','POST',{name:'Carmen Okafor',email:['synthetic-orbit-015-3','example.test'].join('@'),company_id:company.id},201);
 const settings=await json('settings'),input={title:'Northwind annual plan',stage_id:settings.stages[0].id,owner_id:actor,company_id:company.id,value_cents:1000000,contact_ids:[champion.id,evaluator.id,decisionMaker.id],primary_contact_id:champion.id};
 const deal=await json('records/opportunity','POST',input,201),closed=await json('records/opportunity','POST',{...input,title:'Northwind previous order',value_cents:2000000},201);
 await json(`records/opportunity/${closed.id}/lifecycle`,'POST',{state:'won',reason:'Signed last year'});
 await json(`records/opportunity/${deal.id}/entries`,'POST',{kind:'note',text:'Original buying committee discussion',occurredAt:new Date().toISOString()});
 const original=await json(`records/opportunity/${deal.id}`),before=await json(`relationships/opportunity/${deal.id}`);
 assert.equal(settings.workspace.currency,'USD');
 const access='/api/v2/access',workspace=access+'/workspaces/workspace',email=['synthetic-orbit-015','example.test'].join('@');
 const invitation=await json(workspace+'/invitations','POST',{email,role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()});
 const viewer=await emailLinkSignIn(db,email,{returnTo:'/app/access'});
 await json(access+'/invitations/accept','POST',{token:invitation.token},200,viewer.cookie);
 assert.deepEqual(await json(workspace+'/self','GET',undefined,200,viewer.cookie),{role:'guest',access_class:'collaborator'});
 const grant=async(resourceType:string,resourceId:string,actions:string[],fields:string[])=>json(workspace+'/grants','POST',{subjectKind:'operator',subjectId:viewer.operator.operatorId,resourceType,resourceId,actions,fields,purpose:'Review explicitly shared buying records',expiresAt:null});
 await grant('legacy','*',['legacy.read','legacy.write'],[]);
 const dealGrant=await grant('opportunity',deal.id,['graph.read','graph.update'],['title']);
 const contactGrant=await grant('contact',champion.id,['graph.read'],['name','contactability']);
 const grants=async()=>(await json(workspace+'/administration')).grants.filter((item:any)=>item.subject_id===viewer.operator.operatorId).sort((a:any,b:any)=>a.id.localeCompare(b.id));
 const originalGrants=await grants();
 const contactability=async()=>Promise.all([champion,evaluator,decisionMaker].map(async contact=>({id:contact.id,state:(await json(`records/contact/${contact.id}`)).record.contactability})));
 const originalContactability=await contactability();
 const scoped=(kind:string,id:string)=>`/api/v2/workspaces/workspace/records/${kind}/${id}`;
 const assertRelationshipRefusals=async()=>{
  for(const [kind,id] of [['opportunity',deal.id],['contact',champion.id]] as const){
   const context=await json(`relationships/${kind}/${id}`);
   const attempt=kind==='opportunity'?{revision:context.revision,companyId:context.company?.id??null,primaryContactId:champion.id,stakeholders:context.stakeholders.map(({contactId,roles,verified}:any)=>({contactId,roles,verified})),products:context.products,nextStep:'Unauthorized relationship edit',mutualCommitments:context.mutualCommitments}:{revision:context.revision,secondaryCompanies:[{companyId:second.id,verified:true}]};
   await json(`relationships/${kind}/${id}`,'GET',undefined,403,viewer.cookie);
   await json(`relationships/${kind}/${id}`,'PUT',attempt,403,viewer.cookie);
   await json(`records/${kind}/${id}`,'PUT',{company_id:second.id},403,viewer.cookie);
   assert.deepEqual(await json(`relationships/${kind}/${id}`),context,'refused relationship writes change nothing for the full operator');
  }
 };
 const assertAuthorization=async()=>{
  const sharedDeal=await json(scoped('opportunity',deal.id),'GET',undefined,200,viewer.cookie);
  assert.deepEqual(sharedDeal.fields,{title:input.title},'a relationship never expands the explicitly shared fields');
  const sharedContact=await json(scoped('contact',champion.id),'GET',undefined,200,viewer.cookie);
  assert.deepEqual(sharedContact.fields,{name:'Ana Rivera',contactability:'contactable'});
  for(const [kind,id] of [['company',company.id],['company',second.id],['contact',evaluator.id],['contact',decisionMaker.id],['opportunity',closed.id]]){
   await json(scoped(kind,id),'GET',undefined,403,viewer.cookie);
   await json(`records/${kind}/${id}`,'GET',undefined,404,viewer.cookie);
  }
  await assertRelationshipRefusals();
  assert.deepEqual(await grants(),originalGrants,'stakeholder roles and company moves do not create or widen grants');
  assert.deepEqual(await contactability(),originalContactability,'verified and inferred roles confer no contact permission');
 };
 await assertAuthorization();
 const payload={revision:before.revision,companyId:company.id,primaryContactId:champion.id,stakeholders:[{contactId:champion.id,roles:['champion'],verified:true},{contactId:evaluator.id,roles:['evaluator'],verified:false},{contactId:decisionMaker.id,roles:['decision_maker'],verified:true}],products:['Team plan','Onboarding'],nextStep:'Review security with procurement on Friday',mutualCommitments:'Ana will invite procurement; Maya will send the security answers.'};
 const saved=await json(`relationships/opportunity/${deal.id}`,'PUT',payload);
 assert.deepEqual(saved.stakeholders.find((s:any)=>s.contactId===champion.id).roles,['champion']);assert.equal(saved.stakeholders.find((s:any)=>s.contactId===champion.id).verified,true);assert.equal(saved.stakeholders.find((s:any)=>s.contactId===evaluator.id).verified,false);assert.equal(saved.stakeholders.find((s:any)=>s.contactId===decisionMaker.id).verified,true);
 assert.deepEqual(saved.stakeholders.find((s:any)=>s.contactId===evaluator.id).roles,['evaluator']);
 const verified=saved.stakeholders.find((s:any)=>s.contactId===decisionMaker.id);
 assert.deepEqual([verified.roles,verified.verifiedBy,verified.contactability],[['decision_maker'],actor,'contactable']);assert.ok(verified.verifiedAt);
 assert.equal(saved.stakeholders.find((s:any)=>s.contactId===evaluator.id).contactability,'do_not_contact');
 await assertAuthorization();
 await json(`relationships/opportunity/${deal.id}`,'PUT',{...payload,nextStep:'Overwrite a stale review'},409);
 await json(`records/opportunity/${deal.id}`,'PUT',{...input,expected_close_at:'2027-04-01T16:00:00.000Z'});
 assert.deepEqual((await json(`relationships/opportunity/${deal.id}`)).stakeholders.find((s:any)=>s.contactId===champion.id).roles,['champion'],'ordinary record edits preserve stakeholder roles');
 const contactContext=await json(`relationships/contact/${champion.id}`);
 await json(`relationships/contact/${champion.id}`,'PUT',{revision:contactContext.revision,secondaryCompanies:[{companyId:second.id,verified:true}]});
 const secondary=(await json(`relationships/contact/${champion.id}`)).secondaryCompanies;
 assert.deepEqual(secondary.map((item:any)=>[item.companyId,item.verified,item.verifiedBy]),[[second.id,true,actor]]);
 await assertAuthorization();
 assert.ok((await json(`records/company/${second.id}`)).contacts.some((c:any)=>c.id===champion.id&&!c.relationship_primary));
 const contact=await json(`records/contact/${champion.id}`);await json(`records/contact/${champion.id}`,'PUT',{...contact.record,company_id:second.id,custom_fields:{}});
 const promoted=await json(`relationships/contact/${champion.id}`);assert.equal(promoted.primaryCompany.id,second.id);assert.deepEqual(promoted.secondaryCompanies,[]);
 await assertAuthorization();
 const current=await json(`relationships/opportunity/${deal.id}`);await json(`relationships/opportunity/${deal.id}`,'PUT',{...payload,revision:current.revision,companyId:second.id});
 await assertAuthorization();
 const moved=await json(`relationships/opportunity/${deal.id}`);
 assert.equal(moved.company.id,second.id);assert.deepEqual(moved.stakeholders,saved.stakeholders,'association moves retain exact stakeholder identities, roles and verification');
 const oldCompany=await json(`records/company/${company.id}`),newCompany=await json(`records/company/${second.id}`),linkedContact=await json(`records/contact/${champion.id}`),after=await json(`records/opportunity/${deal.id}`);
 assert.equal(oldCompany.openValueCents,0);assert.equal(newCompany.openValueCents,1000000);assert.equal(newCompany.opportunities.find((d:any)=>d.id===deal.id).owner_id,actor);
 assert.ok(linkedContact.opportunities.some((d:any)=>d.id===deal.id));assert.equal(after.record.lifecycle,original.record.lifecycle);assert.equal(after.record.score,original.record.score);assert.equal(linkedContact.record.contactability,'contactable');
 // RECORD-011: the linked deal reads with the deal's own current stage on the company and on the contact.
 for(const [where,linked] of [['company',newCompany],['contact',linkedContact]] as const){const row=linked.opportunities.find((d:any)=>d.id===deal.id);assert.equal(row.stage_id,after.record.stage_id,`${where} shows the deal stage`);assert.equal(row.stage_name,after.record.stage_name,`${where} names the deal stage`);}
 for(const entry of original.timeline)assert.deepEqual(after.timeline.find((e:any)=>e.id===entry.id),entry,'association changes retain the original history and attribution');
 await json(workspace+`/grants/${dealGrant.id}`,'DELETE',{});
 await json(scoped('opportunity',deal.id),'GET',undefined,403,viewer.cookie);
 await json(`records/opportunity/${deal.id}`,'PUT',{title:'Revoked edit'},403,viewer.cookie);
 await assertRelationshipRefusals();
 assert.deepEqual((await json(scoped('contact',champion.id),'GET',undefined,200,viewer.cookie)).fields,{name:'Ana Rivera',contactability:'contactable'},'revoking one grant leaves the other explicit grant usable');
 await json(workspace+`/grants/${contactGrant.id}`,'DELETE',{});
 await json(scoped('contact',champion.id),'GET',undefined,403,viewer.cookie);
 await assertRelationshipRefusals();
 // A restored explicit read grant cannot restore a signed-out session.
 await grant('opportunity',deal.id,['graph.read'],['title']);
 await json(scoped('opportunity',deal.id),'GET',undefined,200,viewer.cookie);
 const mail=mailedIdentity(db),signedOut=await identityResponse(mail.post('/auth/signout',{cookie:viewer.cookie,form:{}}),mail.bindings,{ownerClaimed:async()=>true,mailSender:mail.mailSender});
 assert.equal(signedOut!.status,303);
 for(const [path,method,body] of [[scoped('opportunity',deal.id),'GET',undefined],[`relationships/opportunity/${deal.id}`,'GET',undefined],[`relationships/opportunity/${deal.id}`,'PUT',{...payload,revision:moved.revision,companyId:second.id}]] as const)await json(path,method,body,401,viewer.cookie);
 assert.deepEqual(await json(`relationships/opportunity/${deal.id}`),moved,'revocation and refused writes preserve full-operator access and buying context');
 assert.deepEqual(await contactability(),originalContactability);
 await json(`records/contact/${champion.id}`,'DELETE',{confirmed:true});const erased=await json(`relationships/opportunity/${deal.id}`);assert.equal(erased.nextStep,'');assert.equal(erased.mutualCommitments,'');assert.ok(!erased.stakeholders.some((s:any)=>s.contactId===champion.id));
}
