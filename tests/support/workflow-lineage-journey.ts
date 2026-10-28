import assert from 'node:assert/strict';
import {mock} from 'node:test';

/** Contact provenance follows a copied field into a deal with no contact link. */
export async function workflowLineageJourney({request,process,operator,opportunity}:any){
 const call=async(path:string,body?:unknown,method?:string)=>{const response=await request(path,body,method),data=await response.json();assert.ok(response.ok,`${path}: ${JSON.stringify(data)}`);return data;};
 const configure=async(name:string,definition:any)=>{const {workflow}=await call('/api/workflows',{name,definition}),preview=await call(`/api/workflows/${workflow.id}/preview`,{});await call(`/api/workflows/${workflow.id}/activate`,{previewId:preview.previewId});return workflow;};
 for(const kind of ['company','opportunity']){
  const input={kind,fieldKey:'copied_contact',label:'Customer reference',valueType:'text',required:false,unique:false,options:[],archived:false};
  const preview=await call('/api/v1/settings/custom-fields/preview',input);await call('/api/v1/settings/custom-fields/confirm',{input,reviewHash:preview.reviewHash,confirmed:true});
 }
 const name='Marin Workflow Customer',business='Account-managed reference',company=await call('/api/v1/records/company',{name:'Surviving customer account',custom_fields:{copied_contact:business,sales_status:'Customer'}});
 const contact=await call('/api/v1/records/contact',{name,company_id:company.id}),unrelated=await call('/api/v1/records/contact',{name});
 const original=await call(`/api/v1/records/opportunity/${opportunity}`);
 const deal=await call('/api/v1/records/opportunity',{title:'Account renewal',company_id:company.id,stage_id:original.record.stage_id,owner_id:operator,value_cents:0,contact_ids:[]});
 const base={delayMinutes:0,order:0};
 const first=await configure('Copy customer reference to account',{...base,trigger:{kind:'record_changed',recordType:'contact'},conditions:[{field:'id',operator:'equals',value:contact.id}],actions:[{kind:'copy',target:'primary_company',field:'custom:copied_contact',sourceField:'name'},{kind:'set',target:'primary_company',field:'custom:sales_status',value:'Customer'}]});
 const second=await configure('Copy account reference to its deals',{...base,trigger:{kind:'record_changed',recordType:'company'},conditions:[{field:'id',operator:'equals',value:company.id}],actions:[{kind:'copy',target:'associated_deals',field:'custom:copied_contact',sourceField:'custom:copied_contact'}]});
 await call(`/api/v1/records/contact/${contact.id}`,{name,company_id:company.id,job_title:'Customer buyer'},'PUT');
 await process();await process();await process();
 const detail=()=>call(`/api/v1/records/opportunity/${deal.id}`);
 assert.equal(JSON.parse((await detail()).record.custom_fields_json).copied_contact,name);
 assert.ok(JSON.stringify((await detail()).timeline).includes(name),'the copied reference is visible before erasure');
 const firstRun=(await call('/api/workflows')).runs.find((r:any)=>r.workflowId===first.id&&r.status==='completed');assert.ok(firstRun);
 await call(`/api/workflows/runs/${firstRun.id}/undo`,{});
 assert.equal(JSON.parse((await call(`/api/v1/records/company/${company.id}`)).record.custom_fields_json).copied_contact,business);
 const safeRule=await configure('Copy an account business reference',{...base,trigger:{kind:'record_created',recordType:'opportunity'},conditions:[{field:'title',operator:'equals',value:'Business reference deal'}],actions:[{kind:'copy',field:'custom:copied_contact',sourceTarget:'primary_company',sourceField:'custom:copied_contact'}]});
 const safeDeal=await call('/api/v1/records/opportunity',{title:'Business reference deal',company_id:company.id,stage_id:original.record.stage_id,owner_id:operator,value_cents:0,contact_ids:[]});await process();
 assert.equal(JSON.parse((await call(`/api/v1/records/opportunity/${safeDeal.id}`)).record.custom_fields_json).copied_contact,business);
 const runs=(await call('/api/workflows')).runs.filter((r:any)=>[first.id,second.id].includes(r.workflowId)).map((r:any)=>r.id);
 await call(`/api/v1/records/contact/${contact.id}`,{confirmed:true},'DELETE');
 mock.timers.enable({apis:['Date'],now:Date.now()});
 try{mock.timers.tick(6*60000);await process();await process();}finally{mock.timers.reset();}
 assert.equal(JSON.parse((await detail()).record.custom_fields_json).copied_contact??null,null);
 assert.ok(!JSON.stringify(await detail()).includes(name),'record details and both timeline writers erase the copied name');
 const account=await call(`/api/v1/records/company/${company.id}`);assert.ok(!JSON.stringify(account).includes(name));assert.equal(JSON.parse(account.record.custom_fields_json).sales_status,'Customer');
 assert.equal(JSON.parse((await call(`/api/v1/records/opportunity/${safeDeal.id}`)).record.custom_fields_json).copied_contact,business,'undo restores business provenance as well as the value');
 assert.equal((await call(`/api/v1/records/contact/${unrelated.id}`)).record.name,name,'a distinct same-name person remains');
 assert.ok(!JSON.stringify(await call('/api/workflows')).includes(name));
 assert.ok(!JSON.stringify(await call(`/api/workflows/records/opportunity/${deal.id}/history`)).includes(name));
 for(const id of runs)assert.equal((await request(`/api/workflows/runs/${id}`)).status,404,'private run plans, outcomes and approvals cannot be replayed');
 await call(`/api/workflows/${second.id}/pause`,{});await call(`/api/workflows/${safeRule.id}/pause`,{});
}
