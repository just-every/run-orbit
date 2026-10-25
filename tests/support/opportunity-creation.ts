import assert from 'node:assert/strict';
import {createId} from '../../src/core/shared/ids';

/** The one create form uses the public APIs for new and existing customer records. */
export async function exerciseOpportunityCreation(request:(path:string,method?:string,body?:unknown)=>Promise<Response>,db:D1Database,actor:string,other:string,stageId:string){
 const call=async(path:string,method='GET',body?:unknown,status=200):Promise<any>=>{
  const response=await request(path,method,body),result=await response.json();
  assert.equal(response.status,status,JSON.stringify(result));return result;
 };
 const read=(id:string)=>call(`records/opportunity/${id}`);
 const owner=async(id:string)=>{
  assert.equal((await read(id)).record.owner_id,actor);
  assert.equal((await call(`opportunities/${id}`)).opportunity.ownerId,actor);
 };
 const counts=async()=>{const inventory=await call('workbench');return [inventory.companies.length,inventory.contacts.length];};
 // With one active native operator both creation doors default to that operator.
 await db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(other).run();
 try{
  const fresh=await call('workbench/opportunities','POST',{title:'New customer opportunity',companyName:'Create journey company',contactName:'New buyer',email:'create-journey@customer.test',stageId,valueCents:2400},201);
  await owner(fresh.id);
  const freshDetail=await read(fresh.id),companyId=freshDetail.record.company_id,contactId=freshDetail.contacts[0].id;
  const opportunityRow=(await call('records/opportunity?q=New%20customer%20opportunity')).records.find((record:any)=>record.id===fresh.id);
  assert.equal(opportunityRow.company_name,freshDetail.company.name);assert.equal(opportunityRow.stage_name,freshDetail.record.stage_name);
  const contactRow=(await call('records/contact?q=New%20buyer')).records.find((record:any)=>record.id===contactId);
  assert.equal(contactRow.company_name,freshDetail.company.name,'Rows carry related names independently of the company options page');
  const before=await counts();
  const existing=await call('workbench/opportunities','POST',{title:'Existing customer opportunity',companyId,contactIds:[contactId],stageId,valueCents:0},201);
  await owner(existing.id);assert.deepEqual(await counts(),before,'Choosing existing records creates no duplicate company or contact');
  assert.deepEqual((await read(existing.id)).contacts.map((contact:any)=>contact.id),[contactId]);
  const native=await call('records/opportunity','POST',{title:'Native creation default',stage_id:stageId,value_cents:0},201);await owner(native.id);
  const unassigned=await call('records/opportunity','POST',{title:'Explicitly unassigned',stage_id:stageId,value_cents:0,owner_id:null},201);
  assert.equal((await read(unassigned.id)).record.owner_id,null,'Explicit ownership choices remain available');
  const second=await call('records/contact','POST',{name:'Second existing buyer',company_id:companyId,email:'create-second@customer.test'},201);
  const mixed=await call('workbench/opportunities','POST',{title:'Selected and new contacts',companyId,contactIds:[contactId,second.id],primaryContactId:second.id,contactName:'Third buyer',email:'create-third@customer.test',stageId,valueCents:5000},201);
  const linked=(await read(mixed.id)).contacts;
  assert.equal(linked.length,3);assert.equal(linked.find((contact:any)=>contact.is_primary).id,second.id);
  assert.equal((await call(`records/contact/${contactId}`)).record.company_id,companyId,'Selecting a contact leaves its company association intact');
  const alternativeCompany=await call('workbench/opportunities','POST',{title:'New company existing buyer',companyName:'Other create company',contactIds:[contactId],stageId,valueCents:0},201);
  assert.notEqual((await read(alternativeCompany.id)).record.company_id,companyId);
  assert.equal((await call(`records/contact/${contactId}`)).record.company_id,companyId);
  const invalidBefore=await counts();
  for(const invalid of [
   {companyId,contactIds:[createId()]},
   {companyId:createId(),contactIds:[contactId]},
   {companyName:'Must not persist',contactIds:[contactId],primaryContactId:second.id},
   {companyName:'Must not persist',contactIds:[contactId,contactId]},
   {companyId,contactIds:[]},
   {companyId,companyName:'Ambiguous company',contactIds:[contactId]}
  ])await call('workbench/opportunities','POST',{title:'Invalid selection',stageId,valueCents:0,...invalid},400);
  await call('workbench/opportunities','POST',{title:'Duplicate new identity',companyName:'Must roll back',contactName:'Duplicate buyer',email:'CREATE-JOURNEY@customer.test',stageId,valueCents:0},409);
  assert.deepEqual(await counts(),invalidBefore,'Invalid selections and duplicate identities write no customer records');
 }finally{await db.prepare("UPDATE operators SET status='active' WHERE id=?").bind(other).run();}
 // With more than one native operator both creation doors default to the creator.
 const native=await call('records/opportunity','POST',{title:'Team native creation',stage_id:stageId,value_cents:0},201);await owner(native.id);
 const workbench=await call('workbench/opportunities','POST',{title:'Team form creation',companyName:'Team customer',contactName:'Team buyer',email:'team-create@customer.test',stageId,valueCents:0},201);await owner(workbench.id);
}
