import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {todayApp} from './today-workspace';
import {localArchiveRoundTrip} from './capture-privacy-archive';
export async function typedFieldsProof(){const f=await isolatedDatabase();try{const db=f.db,t=await todayApp(db);await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(t.actor).run();const stage=await db.prepare('SELECT id FROM pipeline_stages LIMIT 1').first<string>('id'),base='/api/v1/settings/custom-fields';
 assert.equal((await t.call(base+'/preview',{body:{kind:'contact',fieldKey:'constructor',label:'Reserved field',valueType:'text',required:false,unique:false,options:[],archived:false}})).status,400,'reserved object keys cannot become field definitions');
 async function configure(input:any){const review=await t.json<any>(base+'/preview',{body:input},200);await t.json(base+'/confirm',{body:{input,reviewHash:review.reviewHash,confirmed:true}},200);return review;}
 for(const kind of ['contact','company','opportunity'] as const){
  const content=(n:number)=>kind==='opportunity'?{title:`Synthetic typed deal ${n}`,stage_id:stage,value_cents:0,contact_ids:[]}:kind==='company'?{name:`Synthetic typed company ${n}`}:{name:`Synthetic typed contact ${n}`,email:`synthetic-orbit-typed-${n}@example.test`};
  const first=await t.json<any>(`/api/v1/records/${kind}`,{body:content(1)},201),second=await t.json<any>(`/api/v1/records/${kind}`,{body:content(2)},201),definition={kind,fieldKey:'synthetic_code',label:'Synthetic code',valueType:'text',required:true,unique:true,options:[],archived:false};
  const before=await db.prepare(`SELECT id,custom_fields_json FROM ${kind==='contact'?'contacts':kind==='company'?'companies':'opportunities'} ORDER BY id`).all();
  const preview=await configure(definition);assert.ok(preview.affected.some((r:any)=>r.id===first.id&&r.reason==='a value is required'));assert.ok(preview.affected.some((r:any)=>r.id===second.id));
  assert.deepEqual((await db.prepare(`SELECT id,custom_fields_json FROM ${kind==='contact'?'contacts':kind==='company'?'companies':'opportunities'} ORDER BY id`).all()).results,before.results,'requiring a field rewrites no existing value');
  const refused=await t.call(`/api/v1/records/${kind}`,{body:content(3)});assert.equal(refused.status,400);assert.match(await refused.text(),/Synthetic code: a value is required/);
  const fields=[{fieldKey:'synthetic_number',label:'Synthetic number',valueType:'number',bad:'not a number',good:42},{fieldKey:'synthetic_date',label:'Synthetic date',valueType:'date',bad:'2026-02-30',good:'2026-11-01'},{fieldKey:'synthetic_tier',label:'Synthetic tier',valueType:'picklist',bad:'Foreign option',good:'Standard'}];
  for(const field of fields)await configure({...definition,fieldKey:field.fieldKey,label:field.label,valueType:field.valueType,required:false,unique:false,options:field.valueType==='picklist'?['Standard','Enterprise']:[]});
  const values:any={synthetic_code:'synthetic-unique-one',synthetic_number:42,synthetic_date:'2026-11-01',synthetic_tier:'Standard'};
  for(const field of fields){const response=await t.call(`/api/v1/records/${kind}/${first.id}`,{method:'PUT',body:{...content(1),custom_fields:{...values,[field.fieldKey]:field.bad}}});assert.equal(response.status,400);assert.ok((await response.text()).includes(field.label+':'));}
  await t.json(`/api/v1/records/${kind}/${first.id}`,{method:'PUT',body:{...content(1),custom_fields:values}},200);
  const duplicate=await t.call(`/api/v1/records/${kind}/${second.id}`,{method:'PUT',body:{...content(2),custom_fields:values}});assert.equal(duplicate.status,409);assert.match(await duplicate.text(),/Synthetic code: this value already belongs/);
  const competing=await Promise.all([3,4].map(n=>t.call(`/api/v1/records/${kind}`,{body:{...content(n),custom_fields:{...values,synthetic_code:'synthetic-concurrent-value'}}})));assert.deepEqual(competing.map(response=>response.status).sort(),[201,409],'concurrent unique writes admit exactly one record');const rejected=competing.find(response=>response.status===409)!;assert.match(await rejected.text(),/Synthetic code:/);
  const pending=await t.json<any>(base+'/preview',{body:{...definition,label:'Renamed synthetic code'}},200);await t.json(`/api/v1/records/${kind}/${first.id}`,{method:'PUT',body:{...content(1),custom_fields:values}},200);assert.equal((await t.call(base+'/confirm',{body:{input:pending.input,reviewHash:pending.reviewHash,confirmed:true}})).status,409,'stale affected-record previews cannot apply');
  await configure({...definition,fieldKey:'synthetic_number',label:'Recorded amount',valueType:'number',required:false,unique:false});
  await configure({...definition,fieldKey:'synthetic_number',label:'Recorded amount',valueType:'number',required:false,unique:false,archived:true});
  const history=await t.json<any>(base+`/history?kind=${kind}&fieldKey=synthetic_number`,{},200);
  assert.deepEqual(history.revisions.map((r:any)=>({revision:r.revision,label:r.definition.label,type:r.definition.valueType,archived:r.definition.archived})),[{revision:3,label:'Recorded amount',type:'number',archived:1},{revision:2,label:'Recorded amount',type:'number',archived:0},{revision:1,label:'Synthetic number',type:'number',archived:0}],'archiving retains the original and renamed definition meaning in public history');
  assert.ok(history.revisions.every((r:any)=>Number.isFinite(Date.parse(r.changedAt))&&r.changedBy==='Sam Seller'),'each revision names when and who saved it');
  assert.deepEqual(history.revisions.map((r:any)=>r.previous?.label??null),['Recorded amount','Synthetic number',null],'each revision carries the one before it');
  assert.equal(history.nextBeforeRevision,null);
  assert.equal((await t.call(base+`/history?kind=${kind}&fieldKey=synthetic_number&beforeRevision=invalid`)).status,400);
  assert.equal((await t.call(base+`/history?kind=${kind}&fieldKey=missing_field`)).status,404);
  assert.equal((await t.app.request('https://orbit.test'+base+`/history?kind=${kind}&fieldKey=synthetic_number`)).status,401,'schema history requires native authentication');
  const archived=await t.call(`/api/v1/records/${kind}/${first.id}`,{method:'PUT',body:{...content(1),custom_fields:{...values,synthetic_number:43}}});assert.equal(archived.status,400);assert.match(await archived.text(),/Recorded amount: archived values are read-only/);
  assert.equal((await t.json<any>(`/api/v1/records/${kind}/${first.id}`)).record.custom_fields_json,JSON.stringify(values));
 }
 const paged={kind:'contact',fieldKey:'synthetic_paged',label:'History pages',valueType:'text',required:false,unique:false,options:[],archived:false};
 for(let revision=1;revision<=53;revision++)await configure({...paged,label:`History meaning ${revision}`});
 const firstPage=await t.json<any>(base+'/history?kind=contact&fieldKey=synthetic_paged',{},200);
 const secondPage=await t.json<any>(base+`/history?kind=contact&fieldKey=synthetic_paged&beforeRevision=${firstPage.nextBeforeRevision}`,{},200);
 assert.equal(firstPage.revisions.length,50);assert.equal(secondPage.nextBeforeRevision,null);
 assert.deepEqual([...firstPage.revisions,...secondPage.revisions].map((r:any)=>[r.revision,r.definition.label]),Array.from({length:53},(_,i)=>[53-i,`History meaning ${53-i}`]),'paged public reads retain every revision once in descending order');
 const target=await isolatedDatabase();try{await localArchiveRoundTrip(db,target.db);for(const table of ['record_custom_fields','record_custom_field_history'])assert.deepEqual((await target.db.prepare(`SELECT * FROM ${table} ORDER BY kind,field_key${table.endsWith('history')?',revision':''}`).all()).results,(await db.prepare(`SELECT * FROM ${table} ORDER BY kind,field_key${table.endsWith('history')?',revision':''}`).all()).results,'typed field meaning and archived history survive export and restore');
 const restored=await todayApp(target.db,{operatorId:t.actor});
 for(const kind of ['contact','company','opportunity']){
  const path=base+`/history?kind=${kind}&fieldKey=synthetic_number`;
  assert.deepEqual(await restored.json(path,{},200),await t.json(path,{},200),'a fresh native session reads the same archived definition meaning after local restore');
 }
 }finally{await target.dispose();}
 }finally{await f.dispose();}}
