import { isolatedDatabase } from './isolated-database';
import { createDependencies } from './dependencies';
import { createId } from '../../src/core/shared/ids';
import { RecordsRepository } from '../../src/core/features/records/repository';
import { WorkbenchRepository } from '../../src/core/features/workbench/repository';
import { createApp } from './app';
export async function launchFixture(){
 const platform=await isolatedDatabase(),db=platform.db,deps=createDependencies(db),actor=createId(),stage=createId();
 await deps.auth.ensureOperator({id:actor,email:`${actor}@operator.test`,displayName:'Launch operator'});
 await deps.workspace.ensureWorkspace({name:'Launch checks',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
 await deps.workspace.ensurePipelineStage({id:stage,name:'Qualified',position:0});
 const session=await deps.auth.createSession(actor),cookie=`__Host-orbit_session=${session.token}`;
 const records=new RecordsRepository(db),workbench=new WorkbenchRepository(db),app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}});
 const request=(path:string,method='GET',body?:unknown,headers:Record<string,string>={})=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 async function customer(email=`${createId()}@customer.test`){const contact=await records.save('contact',{name:'Customer',email},actor),opportunity=await records.save('opportunity',{title:'Launch opportunity',stage_id:stage,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id},actor);return {contactId:contact.id,opportunityId:opportunity.id,email};}
 async function message(contactId:string,opportunityId:string,state='scheduled'){
  const id=createId(),at=new Date().toISOString(),contact=await db.prepare('SELECT email FROM contacts WHERE id=?').bind(contactId).first<{email:string}>();
  await db.prepare("INSERT INTO outbound_messages(id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at) VALUES(?,1,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,opportunityId,actor,contactId,contact!.email,'Reviewed subject','Reviewed body',state,at,at,id,`<${id}@orbit.test>`,at).run();
  return {id,messageId:`<${id}@orbit.test>`};
 }
 return {db,actor,stage,records,workbench,request,customer,message,dispose:()=>platform.dispose()};
}
