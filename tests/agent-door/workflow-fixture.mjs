/** Fresh source versions for the existing two-policy conformance registration. */
export default async function workflowFixture({request,origin,cookie}){
 const response=await request(new URL('/api/workflows',origin).href,{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({name:'synthetic-orbit-conformance-workflow',definition:{trigger:{kind:'record_changed',recordType:'opportunity'},
   conditions:[{field:'title',operator:'equals',value:'synthetic-orbit-no-trigger'}],actions:[{kind:'set',field:'title',value:'synthetic-orbit-old-definition'}]}})});
 if(response.status!==200)throw new Error('Native workflow fixture could not be saved');
 const {workflow}=await response.json();
 const native=async(path,body)=>{const response=await request(new URL('/api/v1'+path,origin).href,{method:body?'POST':'GET',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw Error('Meeting follow-up fixture refused '+path+': '+response.status);return response.json();};
 const settings=await native('/settings'),stages=settings.stages.filter(stage=>stage.pipeline_id===settings.stages[0].pipeline_id).sort((a,b)=>a.position-b.position);
 const owner=settings.operators.find(person=>person.setup_owner===1),contact=await native('/records/contact',{name:'Synthetic conformance buyer',email:['synthetic-orbit-conformance',crypto.randomUUID()+'.test'].join('@')});
 const deal=await native('/records/opportunity',{title:'Synthetic conformance meeting goal',stage_id:stages[0].id,owner_id:owner.id,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id});
 const meeting=await native(`/workbench/opportunities/${deal.id}/events`,{type:'meeting.completed',subject:'Synthetic conformance completed meeting',occurredAt:new Date().toISOString(),eventId:crypto.randomUUID(),contactId:contact.id});
 const obligation={meetingId:meeting.id,opportunityId:deal.id,contactId:contact.id,ownerId:owner.id,dueAt:new Date(Date.now()+86400000).toISOString(),goalStageId:stages[1].id,title:'Synthetic conformance follow-up',stopCondition:'Stop at the goal stage or an explicit human stop'};
 return {values:{workflow,obligation}};
}
