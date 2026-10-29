import {defineTool, type ToolContext, type ResourceDefinition} from '../../../base/modules/agent-door/index.ts';
import {nativeAuthority} from '../delegation/native-authority';
import {snapshot} from '../delegation/evidence';
import {writeHandoff} from '../delegation/effects';
import {contentSchema, type Effect} from '../delegation/protocol';
import {z} from 'zod';
import type {PlatformBindings} from '../../platform/assets';
import {nativeRecords, objectSchema, outputSchema, standard, string} from './records';
import {agentDatabase} from './native-access';
import {localGrant} from './local-credentials';

const handoffTarget=(args:Record<string,unknown>)=>typeof args.target==='string'?args.target:`opportunities/${args.opportunity_id}/handoffs/${args.id}`;
async function readable(bindings:PlatformBindings,ctx:ToolContext,target:string,write=false) {
  await nativeAuthority(bindings.DB,ctx.person.id);
  await localGrant(bindings.DB,ctx,target,write?'crm.handoff.write':'crm.evidence.read');
  return snapshot(bindings.DB,target,true);
}
export function handoffTools(bindings:PlatformBindings) {
  return [defineTool({name:'orbit.handoffs.read',title:'Read a source-bound handoff',description:'Read native opportunity, current handoff and source/audience revisions. Requires full seller authority; selected local credentials retain their target fence.',scope:'handoffs:read',readOnly:true,
    inputSchema:{...objectSchema({target:{type:'string',pattern:'^opportunities/[^/]+/handoffs/[^/]+$'},opportunity_id:string,id:string},[]),anyOf:[{required:['target']},{required:['opportunity_id','id']}]},outputSchema,classes:['standard'],clauses:['DELEGATE-001','BRIEF-005'],untrusted:true,
    classify:async(args,ctx)=>{await readable(bindings,ctx,handoffTarget(args));return standard();},
    run:async(args,ctx)=>{const target=handoffTarget(args),saved=await readable(bindings,ctx,target);return {result:{target,revision:saved.revision,audienceRevision:saved.audience.audienceRevision,title:saved.title,value:{handoff:saved.value.handoff}},resources:saved.value.handoff?[{uri:`orbit://operations/${encodeURIComponent(target)}`,name:'Native handoff'}]:[]};}}),
    defineTool({name:'orbit.handoffs.upsert',title:'Save a cited internal handoff',description:'Save one real native handoff at current source and audience revisions, with eligible assignee and immutable evidence. It cannot approve or start mail.',scope:'handoffs:write',readOnly:false,
      inputSchema:objectSchema({target:{type:'string',pattern:'^opportunities/[^/]+/handoffs/[^/]+$'},source_revision:{type:'string',pattern:'^[a-f0-9]{64}$'},audience_revision:{type:'string',pattern:'^[a-f0-9]{64}$'},content:z.toJSONSchema(contentSchema)}),outputSchema,classes:['standard'],clauses:['DELEGATE-001','BRIEF-005'],revisionType:'string',untrusted:true,
      revision:async(args,ctx)=>(await readable(bindings,ctx,String(args.target),true)).revision,
      // Replay rechecks current authority here; writeHandoff atomically checks source
      // and audience revisions on first execution, after the door's replay lookup.
      classify:async(args,ctx)=>{await readable(bindings,ctx,String(args.target),true);return standard();},
      summary:async(args,ctx)=>{const saved=await readable(bindings,ctx,String(args.target),true),content=contentSchema.parse(args.content);return {target:{id:String(args.target),name:saved.title},items:[content.title,content.description,`Assignee: ${content.assigneeId??'unassigned'}`,`Due: ${content.dueAt??'none'}`,`Status: ${content.status}`,...content.evidence??[]]};},
      run:async(args,ctx)=>{
        await readable(bindings,ctx,String(args.target),true);
        const {access,actor}=await nativeRecords(bindings,ctx),db=agentDatabase(bindings.DB,access,actor,ctx),grant=await localGrant(bindings.DB,ctx,String(args.target),'crm.handoff.write');
        const input:Effect={operation:'orbit.handoff.upsert',operationKey:String(args.idempotency_key),target:String(args.target),expectedRevision:String(args.source_revision),expectedAudienceRevision:String(args.audience_revision),content:contentSchema.parse(args.content)};
        const result=await writeHandoff(db,input,{actor:ctx.person.id,...(grant?{grant}:{}),agent:ctx.agent.id});
        const uri=`orbit://operations/${encodeURIComponent(input.target)}`;ctx.emit('handoff.updated',uri);return {result,resources:[{uri,name:'Saved handoff'}]};
      }}),
  ];
}
export function handoffResource(bindings:PlatformBindings):ResourceDefinition {
  return {uriTemplate:'orbit://operations/{id}',name:'Source-bound handoff',scope:'handoffs:read',classes:['standard'],classify:standard,
    async read(uri,ctx) {
      const match=/^orbit:\/\/operations\/([^/?#]+)$/.exec(uri);if(!match)return null;
      try {const target=decodeURIComponent(match[1]!);await nativeAuthority(bindings.DB,ctx.person.id);await localGrant(bindings.DB,ctx,target,'crm.evidence.read');const saved=await snapshot(bindings.DB,target);return {json:{target,revision:saved.revision,audienceRevision:saved.audience.audienceRevision,value:{handoff:saved.value.handoff}},untrusted:true};}
      catch {return null;}
    }};
}
