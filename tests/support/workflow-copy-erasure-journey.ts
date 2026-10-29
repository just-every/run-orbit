import assert from 'node:assert/strict';
import {mock} from 'node:test';

/** A name-only source cannot survive through another account workflow or queued replay. */
export async function workflowCopyErasureJourney({db,operator,request}:any){
 const call=async(path:string,body?:unknown,method?:string)=>{const response=await request(path,body,method),data=await response.json();assert.ok(response.ok,`${path}: ${JSON.stringify(data)}`);return data;};
 const configure=async(name:string,definition:any)=>{const {workflow}=await call('/api/workflows',{name,definition}),preview=await call(`/api/workflows/${workflow.id}/preview`,{});await call(`/api/workflows/${workflow.id}/activate`,{previewId:preview.previewId});return workflow;};
 const personName='Marin Chained Source';
 for(const [kind,key]of [['company','chain_source'],['opportunity','chain_source'],['opportunity','queued_source']])await db.prepare('INSERT INTO record_custom_fields VALUES(?,?,?,?,0,0,?,0,1)').bind(kind,key,key,'text','[]').run();
 mock.timers.enable({apis:['Date'],now:Date.now()});
 try{
  const company=await call('/api/v1/records/company',{name:'Cedar renewal business'}),person=await call('/api/v1/records/contact',{name:personName,company_id:company.id}),sameName=await call('/api/v1/records/contact',{name:personName});
  const stage=await db.prepare('SELECT id FROM pipeline_stages ORDER BY position LIMIT 1').first('id');
  const deal=await call('/api/v1/records/opportunity',{title:'Business renewal',stage_id:stage,company_id:company.id,owner_id:operator,value_cents:0,contact_ids:[]});
  const base={trigger:{kind:'record_changed',recordType:'contact'},conditions:[{field:'id',operator:'equals',value:person.id}],actions:[{kind:'copy',target:'primary_company',field:'custom:chain_source',sourceField:'name'}],delayMinutes:0,order:0};
  await configure('Carry the contact label',base);
  const companyTrigger={kind:'record_changed',recordType:'company'},companyConditions=[{field:'id',operator:'equals',value:company.id}];
  const b=await configure('Carry the account label',{...base,trigger:companyTrigger,conditions:companyConditions,actions:[{kind:'copy',target:'associated_deals',field:'custom:chain_source',sourceField:'custom:chain_source'}]});
  const delayed=await configure('Carry a delayed account label',{...base,trigger:companyTrigger,conditions:companyConditions,delayMinutes:10,actions:[{kind:'copy',target:'associated_deals',field:'custom:queued_source',sourceField:'custom:chain_source'}]});
  await call(`/api/v1/records/contact/${person.id}`,{name:personName,company_id:company.id,job_title:'Customer buyer'},'PUT');
  await call('/api/workflows/process',{});await call('/api/workflows/process',{});await call('/api/workflows/process',{});
  const detail=()=>call(`/api/v1/records/opportunity/${deal.id}`);
  assert.equal(JSON.parse((await detail()).record.custom_fields_json).chain_source,personName);
  assert.ok((await detail()).timeline.some((entry:any)=>entry.payload_json.includes(personName)));
  const delayedRun=(await call('/api/workflows')).runs.find((run:any)=>run.workflowId===delayed.id&&run.status==='queued');assert.ok(delayedRun);
  mock.timers.tick(6*60000);
  await call(`/api/v1/records/contact/${person.id}`,{confirmed:true},'DELETE');
  mock.timers.tick(11*60000);
  await call('/api/workflows/process',{});await call('/api/workflows/process',{});
  const remaining=await detail(),values=JSON.parse(remaining.record.custom_fields_json);
  assert.equal(values.chain_source??null,null);assert.equal(values.queued_source??null,null);
  assert.ok(!JSON.stringify(remaining).includes(personName),'the surviving deal and its timeline contain no erased derivative');
  assert.ok(!JSON.stringify(await call(`/api/workflows/records/opportunity/${deal.id}/history`)).includes(personName));
  assert.ok(!JSON.stringify(await call('/api/workflows')).includes(personName),'saved plans and replay history contain no erased derivative');
  assert.equal((await call(`/api/v1/records/contact/${sameName.id}`)).record.name,personName,'another person with the same display name is preserved');
  assert.equal((await call(`/api/v1/records/company/${company.id}`)).record.name,'Cedar renewal business');
  for(const workflow of [b,delayed])await call(`/api/workflows/${workflow.id}/pause`,{});
  assert.equal((await request(`/api/workflows/runs/${delayedRun.id}/resume`,{})).status,404);
 }finally{mock.timers.reset();}
}
