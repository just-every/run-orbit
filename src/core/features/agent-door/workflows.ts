import {defineTool,ToolRefusal,type ToolContext} from '../../../base/modules/agent-door/index.ts';
import {z} from 'zod';
import type {PlatformBindings} from '../../platform/assets';
import {draftInput,saveWorkflowDraft} from '../workflows/authoring';
import {owner,currentVersion} from '../workflows/repository';
import {WorkflowError} from '../workflows/contracts';
import {nativeRecords,objectSchema,outputSchema,standard,string} from './records';
import {agentDatabase} from './native-access';

async function nativeWorkflow<T>(work:()=>Promise<T>):Promise<T>{
 try{return await work();}catch(error){
  if(error instanceof WorkflowError)throw new ToolRefusal(error.status===409?'revision_conflict':[403,404].includes(error.status)?'resource_unavailable':'invalid_arguments');
  if(error instanceof z.ZodError)throw new ToolRefusal('invalid_arguments');
  throw error;
 }
}
async function current(bindings:PlatformBindings,args:Record<string,unknown>,ctx:ToolContext){
 await owner(bindings.DB,ctx.person.id);
 return currentVersion(bindings.DB,String(args.id));
}

export function workflowTools(bindings:PlatformBindings){
 const schema=z.toJSONSchema(draftInput,{io:'input'});
 // JSON keys are strings already; the door's schema vocabulary omits
 // Zod's redundant propertyNames annotation on action values.
 delete (schema.properties!.definition as any).properties.actions.items.properties.values.propertyNames;
 return [defineTool({name:'orbit.workflows.save_draft',title:'Save an existing workflow draft',
  description:'Owner only: save a draft at the exact source version from the native workflow list. Saving never activates, pauses, runs or changes the running version.',
  scope:'workflows:write',readOnly:false,classes:['standard'],clauses:['SURFACE-008'],untrusted:true,
  inputSchema:objectSchema({id:string,source_version:{type:'integer',minimum:1},...schema.properties}),outputSchema,
  revision:async(args,ctx)=>nativeWorkflow(async()=>(await current(bindings,args,ctx)).version),
  target:args=>({kind:'workflow',id:String(args.id)}),
  classify:async(args,ctx)=>nativeWorkflow(async()=>{await current(bindings,args,ctx);return standard();}),
  summary:args=>({target:{id:String(args.id),name:String(args.name)},items:[`Source version: ${args.source_version}`,JSON.stringify(args.definition)]}),
  run:async(args,ctx)=>nativeWorkflow(async()=>{
   const {access,actor}=await nativeRecords(bindings,ctx),db=agentDatabase(bindings.DB,access,actor,ctx);
   const result=await saveWorkflowDraft(db,ctx.person.id,{name:args.name,definition:args.definition},new Date(ctx.now()).toISOString(),String(args.id),Number(args.source_version));
   ctx.emit('workflow.draft_saved',`orbit://workflows/${args.id}`);
   return {result};
  })})];
}
