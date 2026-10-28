/** Disposable verifier setup uses only the seed's supported public lifecycle. */
export default async function initialize({request,origin,email,displayName,claim,returnTo,reviewers}) {
 const bootstrap=await request(new URL(claim.path,origin).href,{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:claim.token,displayName,returnTo})});
 if(bootstrap.status!==303)return bootstrap;
 const cookie=bootstrap.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
 async function native(path,body) {
  const response=await request(new URL(path,origin).href,{method:body===undefined?'GET':'POST',redirect:'manual',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(!response.ok)throw new Error(`Native fixture lifecycle refused ${path}: HTTP ${response.status}`);
  return response.json();
 }
 await native('/api/v1/setup',{ownerName:displayName,name:'Brightwork sales',timezone:'UTC',currency:'USD',stages:'Qualified\nProposal\nDecision'});
 const inventory=await native('/api/v1/workbench');
 const company=await native('/api/v1/records/company',{name:'Door specialist fixture company'});
 const contact=await native('/api/v1/records/contact',{name:'Maya Chen',email:'maya@example.test',company_id:company.id});
 const opportunity=await native('/api/v1/records/opportunity',{title:'Door specialist fixture opportunity',stage_id:inventory.stages[0].id,value_cents:750000,company_id:company.id,contact_ids:[contact.id],primary_contact_id:contact.id});
 await native(`/api/v1/workbench/opportunities/${opportunity.id}/events`,{type:'meeting.booked',subject:'Maya booked the buyer discussion',occurredAt:new Date().toISOString(),eventId:'door-fixture-meeting',contactId:contact.id});
 await reviewers.initialize('sales-review',{cookie});
 return bootstrap;
}
