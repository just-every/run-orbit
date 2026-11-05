import assert from 'node:assert/strict';
import type {TodayApp} from './today-workspace';

/** Ordinary authenticated saves distinguish typed emptiness from actual scalar changes. */
export async function recordChangesProof(db:D1Database,t:TodayApp){
 const definition={kind:'contact',fieldKey:'licensed_seats',label:'Licensed seats',valueType:'number',required:false,unique:false,options:[],archived:false};
 const review=await t.json<any>('/api/v1/settings/custom-fields/preview',{body:definition},200);
 await t.json('/api/v1/settings/custom-fields/confirm',{body:{input:definition,reviewHash:review.reviewHash,confirmed:true}},200);
 const stage=await db.prepare('SELECT id FROM pipeline_stages LIMIT 1').first<string>('id');
 await coreRecordsPersistenceProof(t,stage);
 const contact=await t.json<any>('/api/v1/records/contact',{body:{name:'History association contact'}},201);
 for(const kind of ['contact','company','opportunity'] as const){
  const body=kind==='opportunity'?{title:'History proof deal',stage_id:stage,value_cents:0,contact_ids:[],primary_contact_id:null}:kind==='company'?{name:'History proof company'}:{name:'History proof contact'};
  const created=await t.json<any>(`/api/v1/records/${kind}`,{body},201),path=`/api/v1/records/${kind}/${created.id}`;
  const read=()=>t.json<any>(path,{},200);
  const audits=async()=>(await db.prepare("SELECT actor_id FROM audit_entries WHERE entity_id=? AND action='record.updated'").bind(created.id).all<{actor_id:string}>()).results;
  const initial=await read(),initialAudits=await audits();
  const unchanged=await t.json<any>(path,{method:'PUT',body:{...body,custom_fields:kind==='contact'?{licensed_seats:null}:{}}},200);
  assert.equal(unchanged.changed,false,'unchanged and absent typed values return an honest no-change result');
  assert.deepEqual(await read(),initial,'no-op saves preserve the record, timestamp and complete timeline');
  assert.deepEqual(await audits(),initialAudits,'no-op saves create no record.updated audit');
  assert.equal((await t.app.request('https://orbit.test'+path,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)})).status,401,'even an unchanged save requires authentication');

  const values={member_names:'["ada","bo"]',empty_list:'[]',empty_object:'{}',is_ready:false,zero:0,...kind==='contact'?{licensed_seats:5}:{}};
  assert.equal((await t.json<any>(path,{method:'PUT',body:{...body,custom_fields:values}},200)).changed,true);
  const changed=await read(),history=changed.timeline.find((entry:any)=>entry.kind==='record.updated');
  assert.equal(history.actor_id,t.actor);assert.equal(history.actor_name,'Sam Seller');
  const text=JSON.parse(history.payload_json).text;
  for(const line of ['Changed Member names: Empty → ["ada","bo"]','Changed Empty list: Empty → []','Changed Empty object: Empty → {}','Changed Is ready: Empty → false','Changed Zero: Empty → 0'])assert.ok(text.includes(line),line);
  assert.deepEqual(await audits(),[{actor_id:t.actor}],'a real update retains attributed audit');
  assert.equal((await t.json<any>(path,{method:'PUT',body:{...body,custom_fields:Object.fromEntries(Object.entries(values).reverse())}},200)).changed,false,'custom field order has no semantic meaning');
  assert.deepEqual(await read(),changed);
  const literal={...values,member_names:'ada; bo'};
  await t.json(path,{method:'PUT',body:{...body,custom_fields:literal}},200);
  assert.ok((await read()).timeline.some((entry:any)=>entry.kind==='record.updated'&&JSON.parse(entry.payload_json).text.includes('["ada","bo"] → ada; bo')),'rendering never hides a genuine string change');
  if(kind==='contact'){
   const cleared={...literal,licensed_seats:null};
   await t.json(path,{method:'PUT',body:{...body,custom_fields:cleared}},200);
   const empty=await read();assert.equal(Object.hasOwn(JSON.parse(empty.record.custom_fields_json),'licensed_seats'),false);
   assert.ok(empty.timeline.some((entry:any)=>entry.kind==='record.updated'&&JSON.parse(entry.payload_json).text==='Changed Licensed seats: 5 → Empty'));
   assert.equal((await t.json<any>(path,{method:'PUT',body:{...body,custom_fields:cleared}},200)).changed,false);
   assert.deepEqual(await read(),empty);
  }
  if(kind==='opportunity'){
   await t.json(path,{method:'PUT',body:{...body,custom_fields:literal,contact_ids:[contact.id],primary_contact_id:contact.id}},200);
   const linked=await read();assert.equal(linked.contacts[0].id,contact.id);
   assert.ok(linked.timeline.some((entry:any)=>entry.kind==='record.updated'&&JSON.parse(entry.payload_json).text==='Changed Associated contacts'));
   assert.equal((await t.json<any>(path,{method:'PUT',body:{...body,custom_fields:literal,contact_ids:[contact.id],primary_contact_id:contact.id}},200)).changed,false);
   assert.deepEqual(await read(),linked,'unchanged associations stay a no-op');
  }
  const importSource=JSON.stringify({vendor:'hubspot',account:'CRM 42',sourceId:'old-42',owner:'Ada',stage:null,description:null});
  const imported={...literal,import_source:importSource};
  await t.json(path,{method:'PUT',body:{...body,custom_fields:imported}},200);
  const provenance=await read();
  assert.equal(JSON.parse(provenance.record.custom_fields_json).import_source,importSource,'display decoding preserves stored importer provenance');
  assert.ok(provenance.timeline.some((entry:any)=>entry.kind==='record.updated'&&JSON.parse(entry.payload_json).text.includes('Changed Import source: Empty → Imported from: CRM 42 (HubSpot export); ID in old system: old-42; Owner in old system: Ada')));
  assert.equal((await t.json<any>(path,{method:'PUT',body:{...body,custom_fields:imported}},200)).changed,false);
  await t.json(path,{method:'PUT',body:{...body,custom_fields:{...literal,import_source:'Reviewed by Ada'}}},200);
  assert.ok((await read()).timeline.some((entry:any)=>entry.kind==='record.updated'&&JSON.parse(entry.payload_json).text.includes('Changed Import source: Replaced import details from CRM 42 (HubSpot export) with text: Reviewed by Ada')));
 }
}

/** Create one associated set, then read its saved values through fresh authenticated requests. */
async function coreRecordsPersistenceProof(t:TodayApp,stage:string|null){
 assert.equal((await t.json<any>('/api/v1/settings',{},200)).workspace.currency,'USD');
 const companyValues={name:'Synthetic Orbit company',primary_domain:'synthetic-orbit-1.test'};
 const companyFields={segment:'synthetic-orbit-1',seats:12,reviewed:false};
 const company=await t.json<{id:string}>('/api/v1/records/company',{body:{...companyValues,custom_fields:companyFields}},201);
 const contactValues={name:'Synthetic Orbit contact',email:['synthetic-orbit-1','example.test'].join('@'),phone:'+12025550141',job_title:'Buyer',timezone:['America','New_York'].join('/'),company_id:company.id};
 const contactFields={licensed_seats:12,reference:'synthetic-orbit-2'};
 const contact=await t.json<{id:string}>('/api/v1/records/contact',{body:{...contactValues,custom_fields:contactFields}},201);
 const dealValues={title:'Synthetic Orbit deal',stage_id:stage,owner_id:t.actor,company_id:company.id,value_cents:123456,expected_close_at:'2026-12-01T17:00:00.000Z'};
 const dealFields={reference:'synthetic-orbit-3',renewal:false};
 const associations={contact_ids:[contact.id],primary_contact_id:contact.id};
 const deal=await t.json<{id:string}>('/api/v1/records/opportunity',{body:{...dealValues,...associations,custom_fields:dealFields}},201);
 const paths={company:`/api/v1/records/company/${company.id}`,contact:`/api/v1/records/contact/${contact.id}`,opportunity:`/api/v1/records/opportunity/${deal.id}`};
 const read=(kind:keyof typeof paths)=>t.json<any>(paths[kind],{},200);
 async function saved(kind:keyof typeof paths,expected:Record<string,unknown>,custom:Record<string,unknown>){
  const detail=await read(kind);
  assert.equal(detail.record.id,{company:company.id,contact:contact.id,opportunity:deal.id}[kind]);
  for(const [field,value] of Object.entries(expected))assert.equal(detail.record[field],value,`${kind} reload retains ${field}`);
  assert.deepEqual(JSON.parse(detail.record.custom_fields_json),custom,`${kind} reload retains exact custom values`);
  return detail;
 }
 async function linked(){
  const [companyDetail,contactDetail,dealDetail]=await Promise.all([read('company'),read('contact'),read('opportunity')]);
  assert.deepEqual(companyDetail.contacts.map((row:any)=>row.id),[contact.id]);
  assert.deepEqual(companyDetail.opportunities.map((row:any)=>row.id),[deal.id]);
  assert.equal(contactDetail.company.id,company.id);
  assert.deepEqual(contactDetail.opportunities.map((row:any)=>row.id),[deal.id]);
  assert.equal(dealDetail.company.id,company.id);
  assert.deepEqual(dealDetail.contacts.map((row:any)=>({id:row.id,primary:row.is_primary})),[{id:contact.id,primary:1}]);
 }
 await saved('company',companyValues,companyFields);
 await saved('contact',contactValues,contactFields);
 await saved('opportunity',dealValues,dealFields);
 await linked();

 const editedCompany={name:'Synthetic Orbit revised company',primary_domain:'synthetic-orbit-2.test'};
 const editedContact={...contactValues,name:'Synthetic Orbit revised contact',email:['synthetic-orbit-2','example.test'].join('@'),phone:'+12025550142',job_title:'Purchasing lead',timezone:['America','Los_Angeles'].join('/')};
 const editedDeal={...dealValues,title:'Synthetic Orbit revised deal',owner_id:null,value_cents:987654,expected_close_at:'2027-01-15T18:30:00.000Z'};
 const editedCompanyFields={...companyFields,seats:24,reviewed:true};
 const editedContactFields={...contactFields,licensed_seats:24};
 const editedDealFields={...dealFields,renewal:true};
 for(const [kind,values,custom] of [['company',editedCompany,editedCompanyFields],['contact',editedContact,editedContactFields],['opportunity',editedDeal,editedDealFields]] as const){
  assert.equal((await t.json<any>(paths[kind],{method:'PUT',body:{...values,custom_fields:custom}},200)).changed,true);
  await saved(kind,values,custom);
 }
 await linked();

 // The record page's single-field save must retain the other scalars, custom values and links too.
 const pageCompany={...editedCompany,name:'Synthetic Orbit page company',primary_domain:'synthetic-orbit-3.test'};
 const pageContact={...editedContact,name:'Synthetic Orbit page contact',email:['synthetic-orbit-3','example.test'].join('@'),phone:'+12025550143',job_title:'Procurement director',timezone:['America','Chicago'].join('/')};
 const pageDeal={...editedDeal,title:'Synthetic Orbit page deal',owner_id:t.actor,value_cents:246810,expected_close_at:'2027-02-19T19:45:00.000Z'};
 for(const [kind,before,after,custom] of [['company',editedCompany,pageCompany,editedCompanyFields],['contact',editedContact,pageContact,editedContactFields],['opportunity',editedDeal,pageDeal,editedDealFields]] as const){
  for(const field of Object.keys(after) as (keyof typeof after)[]){
   if(before[field]===after[field])continue;
   const body={changes:{[field]:after[field]},base:{[field]:before[field]}};
   const beforeRefusal=await read(kind);
   assert.equal((await t.app.request('https://orbit.test'+paths[kind],{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)})).status,401,'single-field edits require native authentication');
   assert.deepEqual(await read(kind),beforeRefusal,'an unauthenticated edit changes no saved values, associations or history');
   assert.equal((await t.json<any>(paths[kind],{method:'PATCH',body},200)).changed,true);
  }
  await saved(kind,after,custom);
 }
 await linked();
}
