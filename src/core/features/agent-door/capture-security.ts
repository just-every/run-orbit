import {defineTool,ToolRefusal,type ToolContext} from '../../../base/modules/agent-door/index.ts';
import {createSourceSecurity} from '../../platform/source-security';
import type {PlatformBindings} from '../../platform/assets';
import {CaptureError} from '../capture/contracts';
import {mailboxConfig} from '../capture/forward/address';
import {FORWARD_SOURCE_ID,forwardAddressRevision,rotateForwardAddress} from '../capture/forward/source';
import {AgentAccess,agentDatabase} from './native-access';
import {objectSchema,outputSchema} from './records';

export function captureSecurityTools(bindings:PlatformBindings){
 const current=async(ctx:ToolContext)=>{
  const access=new AgentAccess(bindings,ctx),actor=await access.fullOperator();
  const config=mailboxConfig(bindings.CAPTURE_MAIL_ADDRESS),security=createSourceSecurity(bindings);
  if(!config||!security)throw new ToolRefusal('native_unavailable');
  try{return {access,actor,config,security,revision:await forwardAddressRevision(bindings.DB,config)};}
  catch(error){if(error instanceof CaptureError)throw new ToolRefusal('resource_unavailable');throw error;}
 };
 return [
  defineTool({name:'orbit.capture.address_read',title:'Read the Orbit address revision',description:'Read only the current native address revision. The private address and forwarding confirmations stay in Capture.',scope:'capture:read',readOnly:true,
   inputSchema:objectSchema({}),outputSchema,classes:['standard'],clauses:['SURFACE-006'],
   classify:async(_args,ctx)=>{await current(ctx);return [{class:'standard',facts:{measure:1}}];},
   run:async(_args,ctx)=>({result:{id:FORWARD_SOURCE_ID,revision:(await current(ctx)).revision}})}),
  defineTool({name:'orbit.capture.address_rotate',title:'Rotate the private Orbit address',description:'Replace the private tag of an existing native Orbit address. Old mail stops entering immediately; captured evidence stays. Read the new address in Capture.',scope:'capture:write',readOnly:false,
   inputSchema:objectSchema({source_revision:{type:'string',pattern:'^[a-f0-9]{64}$'}}),outputSchema,classes:['security'],clauses:['SURFACE-006'],
   authority:'none',effect:{kind:'record',justification:'Replaces only the sealed tag on the configured native Capture source; changes no person, grant or destination.'},
   target:async(_args,ctx)=>{await current(ctx);return {kind:'capture_source',id:FORWARD_SOURCE_ID};},
   revisionType:'string',revision:async(_args,ctx)=>(await current(ctx)).revision,
   classify:async(_args,ctx)=>{await current(ctx);return [{class:'security',facts:{measure:1,setting:'private_capture_address',provider:'orbit'}}];},
   summary:()=>({target:{id:FORWARD_SOURCE_ID,name:'Orbit address'},items:['Rotate the existing private address','The old address stops accepting mail','Captured evidence is preserved','Read the new address in Capture']}),
   run:async(args,ctx)=>{
    const {access,actor,config,security}=await current(ctx),db=agentDatabase(bindings.DB,access,actor,ctx);
    try{
     const result=await rotateForwardAddress(db,security,config,ctx.person.id,String(args.source_revision));
     ctx.emit('capture.address_rotated','orbit://capture/address');return {result};
    }catch(error){if(error instanceof CaptureError)throw new ToolRefusal(error.status===409?'revision_conflict':'native_unavailable');throw error;}
   }}),
 ];
}
