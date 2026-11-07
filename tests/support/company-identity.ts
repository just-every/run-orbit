import assert from 'node:assert/strict';

/** Records refuses normalized company collisions before changing customer data or history. */
export async function exerciseCompanyIdentity(request:(path:string,method?:string,body?:unknown)=>Promise<Response>,stageId:string){
 const call=async(path:string,method='GET',body?:unknown,status=200):Promise<any>=>{
  const response=await request(path,method,body),result=await response.json();
  assert.equal(response.status,status,JSON.stringify(result));return result;
 };
 const original=await call('records/company','POST',{name:'Synthetic Orbit 301',primary_domain:'WWW.SYNTHETIC-ORBIT-301.TEST'},201);
 const distinct=await call('records/company','POST',{name:'Synthetic Orbit 302',primary_domain:'synthetic-orbit-302.test'},201);
 const saved=await call(`records/company/${original.id}`);
 assert.equal(saved.record.primary_domain,'synthetic-orbit-301.test');
 assert.equal(saved.record.primary_domain_key,'synthetic-orbit-301.test');
 const notes=new Map<string,string>();
 for(const [index,company]of [original,distinct].entries()){
  const contact=await call('records/contact','POST',{
   name:`Synthetic Orbit buyer ${301+index}`,email:[`synthetic-orbit-${301+index}`,'identity.test'].join('@'),company_id:company.id
  },201);
  await call('records/opportunity','POST',{
   title:`Synthetic Orbit deal ${301+index}`,company_id:company.id,stage_id:stageId,value_cents:2400,
   contact_ids:[contact.id],primary_contact_id:contact.id
  },201);
  const note=await call(`records/company/${company.id}/entries`,'POST',{
   kind:'note',text:`Synthetic Orbit identity history ${301+index}`,occurredAt:'2026-10-01T12:00:00.000Z'
  });
  notes.set(company.id,note.id);
 }
 // Fresh complete reads include unrelated records and nonempty associations and history.
 const inventory=async()=>{
  const result:Record<string,unknown>={};
  for(const kind of ['company','contact','opportunity']){
   const {records}=await call(`records/${kind}`);
   assert.ok(records.length<50,'The Records first page contains the complete fixture inventory');
   result[kind]=await Promise.all(records.map((row:{id:string})=>call(`records/${kind}/${row.id}`)));
   result[`${kind}List`]=records;
  }
  return result;
 };
 const before=await inventory();
 for(const company of [original,distinct]){
  const detail=await call(`records/company/${company.id}`);
  assert.equal(detail.contacts.length,1);
  assert.equal(detail.opportunities.length,1);
  assert.ok(detail.timeline.some((entry:{id:string})=>entry.id===notes.get(company.id)),'Saved company note is present before testing refusal');
 }
 const duplicate=await call('records/company','POST',{
  name:'Synthetic Orbit refused create',primary_domain:'  synthetic-orbit-301.test  '
 },409);
 assert.equal(duplicate.recordId,original.id,'Create collision names the original company');
 assert.deepEqual(await inventory(),before,'Refused create changes no companies, associations or timeline entries');
 const current=await call(`records/company/${distinct.id}`);
 const edit=await call(`records/company/${distinct.id}`,'PATCH',{
  changes:{name:'Synthetic Orbit refused edit',primary_domain:'  WWW.SYNTHETIC-ORBIT-301.TEST  '},
  base:{name:current.record.name,primary_domain:current.record.primary_domain}
 },409);
 assert.equal(edit.recordId,original.id,'Edit collision names the original company');
 assert.deepEqual(await inventory(),before,'Refused edit changes neither company, associations nor timeline entries');
}
