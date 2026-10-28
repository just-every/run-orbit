import assert from 'node:assert/strict';
import {mock} from 'node:test';

/** A delayed onboarding rule uses execution day and retains it on replay. */
export async function workflowClockJourney({request,process}:any){
 const call=async(path:string,body?:unknown,method?:string)=>{const response=await request(path,body,method),data=await response.json();assert.ok(response.ok,`${path}: ${JSON.stringify(data)}`);return data;};
 for(const fieldKey of ['execution_day','trigger_day','copied_day']){
  const input={kind:'contact',fieldKey,label:fieldKey,valueType:'date',required:false,unique:false,options:[],archived:false};
  const preview=await call('/api/v1/settings/custom-fields/preview',input);
  await call('/api/v1/settings/custom-fields/confirm',{input,reviewHash:preview.reviewHash,confirmed:true});
 }
 const start=new Date();start.setUTCHours(23,0,0,0);
 mock.timers.enable({apis:['Date'],now:start.getTime()});
 try{
  const contact=await call('/api/v1/records/contact',{name:'Delayed onboarding customer'});
  const {workflow}=await call('/api/workflows',{name:'Delayed onboarding dates',definition:{trigger:{kind:'record_changed',recordType:'contact'},conditions:[{field:'id',operator:'equals',value:contact.id}],delayMinutes:120,order:0,actions:[{kind:'stamp',field:'custom:execution_day',clock:'run'},{kind:'copy',field:'custom:copied_day',sourceField:'custom:execution_day'},{kind:'stamp',field:'custom:trigger_day',clock:'trigger'}]}});
  const preview=await call(`/api/workflows/${workflow.id}/preview`,{});
  await call(`/api/workflows/${workflow.id}/activate`,{previewId:preview.previewId});
  const triggerDay=new Date().toISOString().slice(0,10);
  await call(`/api/v1/records/contact/${contact.id}`,{name:'Delayed onboarding customer',job_title:'Ready for onboarding'},'PUT');
  await process();
  const fields=async()=>JSON.parse((await call(`/api/v1/records/contact/${contact.id}`)).record.custom_fields_json);
  assert.equal((await fields()).execution_day,undefined,'a delayed stamp waits for its due run');
  mock.timers.tick(120*60000);const executionDay=new Date().toISOString().slice(0,10);assert.notEqual(executionDay,triggerDay);
  await process();const actual=await fields();
  assert.equal(actual.execution_day,executionDay);assert.equal(actual.copied_day,executionDay);assert.equal(actual.trigger_day,triggerDay);
  mock.timers.tick(86400000);await process();assert.deepEqual(await fields(),actual,'replay does not restamp the execution or a dependent copy');
  await call(`/api/workflows/${workflow.id}/pause`,{});
 }finally{mock.timers.reset();}
}
