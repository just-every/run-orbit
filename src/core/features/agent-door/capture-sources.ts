import {defineTool,ToolRefusal,type ToolContext} from '../../../base/modules/agent-door/index.ts';
import {createSourceSecurity} from '../../platform/source-security';
import type {PlatformBindings} from '../../platform/assets';
import {CaptureError} from '../capture/contracts';
import {captureProviderState,syncProvider} from '../capture/providers/service';
import {AgentAccess,agentDatabase} from './native-access';
import {objectSchema,outputSchema,standard,string} from './records';

/** Sync uses the native connection and never starts or completes provider consent. */
export function captureSourceTools(bindings:PlatformBindings){
 const current=async(id:string,ctx:ToolContext)=>{
  const access=new AgentAccess(bindings,ctx),actor=await access.captureSource(id);
  try{return {access,actor,source:await captureProviderState(bindings.DB,id)};}
  catch(error){if(error instanceof CaptureError)throw new ToolRefusal('resource_unavailable');throw error;}
 };
 const handoff=(source:Awaited<ReturnType<typeof captureProviderState>>,ctx:ToolContext)=>({provider:source.provider,step:source.step,
  person_only:true,url:ctx.origin+'/app/settings/capture/connect/'+source.provider+'?step=5&source='+encodeURIComponent(source.id)});
 return [
  defineTool({name:'orbit.capture.source_read',title:'Read a connected Capture source',description:'Read only counts, source state and its revision. Authorization attention links the signed-in person to native Capture reconnect; no credentials or captured content are returned.',scope:'capture:read',readOnly:true,
   inputSchema:objectSchema({id:string}),outputSchema,classes:['standard'],clauses:['SURFACE-005'],
   classify:async(args,ctx)=>{await current(String(args.id),ctx);return standard();},
   run:async(args,ctx)=>{const {source}=await current(String(args.id),ctx);return {result:{...source,...(source.step?{handoff:handoff(source,ctx)}:{})}};}}),
  defineTool({name:'orbit.capture.source_sync',title:'Sync a connected Capture source',description:'Sync the existing selected Google or Microsoft Capture source at its exact saved revision. Uses only native saved authorization. Completed keys return historical receipts; read the source again for current state. A provider person step stops intake and hands reconnect to a person, without retrying or starting OAuth.',scope:'capture:write',readOnly:false,
   inputSchema:objectSchema({id:string,source_revision:{type:'string',pattern:'^[a-f0-9]{64}$'}}),outputSchema,classes:['standard','gated'],clauses:['SURFACE-005'],
   revisionType:'string',revision:async(args,ctx)=>(await current(String(args.id),ctx)).source.revision,
   target:async(args,ctx)=>{const {source}=await current(String(args.id),ctx);return {kind:'capture_source',id:source.id};},
   classify:async(args,ctx)=>{const {source}=await current(String(args.id),ctx);return source.step?[{class:'gated',facts:{measure:1,provider:source.provider,step:source.step}}]:standard();},
   summary:async(args,ctx)=>{const {source}=await current(String(args.id),ctx);return {target:{id:source.id},items:source.step?[`Provider: ${source.provider}`,`Person step: ${source.step}`,'Only the signed-in person can reconnect',handoff(source,ctx).url]:['Sync the saved Capture scope','Return counts and source state only']};},
   run:async(args,ctx)=>{
    const {access,actor,source}=await current(String(args.id),ctx);
    if(source.step)return {result:{source,handoff:handoff(source,ctx)}};
    if(source.revision!==args.source_revision)throw new ToolRefusal('revision_conflict');
    const security=createSourceSecurity(bindings);if(!security)throw new ToolRefusal('native_unavailable');
    const db=agentDatabase(bindings.DB,access,actor,ctx);
    try{
     const summary=await syncProvider(db,source.id,security);
     const after=await captureProviderState(bindings.DB,source.id);
     if(after.step)throw new ToolRefusal('provider_person_required','Reconnect in native Capture.',handoff(after,ctx));
     ctx.emit('capture.synced','orbit://capture/sources/'+source.id);
     return {result:{source:after,summary}};
    }catch(error){if(error instanceof CaptureError)throw new ToolRefusal(error.status===409?'revision_conflict':'native_unavailable');throw error;}
   }}),
 ];
}
