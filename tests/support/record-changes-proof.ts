import assert from 'node:assert/strict';
import type {TodayApp} from './today-workspace';

/** Ordinary authenticated saves distinguish typed emptiness from actual scalar changes. */
export async function recordChangesProof(db:D1Database,t:TodayApp){
 const definition={kind:'contact',fieldKey:'licensed_seats',label:'Licensed seats',valueType:'number',required:false,unique:false,options:[],archived:false};
 const review=await t.json<any>('/api/v1/settings/custom-fields/preview',{body:definition},200);
 await t.json('/api/v1/settings/custom-fields/confirm',{body:{input:definition,reviewHash:review.reviewHash,confirmed:true}},200);
 const stage=await db.prepare('SELECT id FROM pipeline_stages LIMIT 1').first<string>('id');
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
