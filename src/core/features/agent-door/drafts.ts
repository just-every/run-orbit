import {defineTool,ToolRefusal,type ResourceDefinition} from '../../../base/modules/agent-door/index.ts';
import {DraftsRepository} from '../drafts/repository';
import {DraftsService} from '../drafts/service';
import {RecordMailRepository} from '../outreach/record-mail-repository';
import {objectSchema,outputSchema,standard,string,kindSchema,nativeRecords} from './records';
import {fullSeller} from './evidence';
import {agentDatabase} from './native-access';
import type {PlatformBindings} from '../../platform/assets';

export function draftTools(bindings:PlatformBindings) {
  const read = async(id:string) => {
    const draft=await new DraftsRepository(bindings.DB).findDraft(id);if(!draft)throw new ToolRefusal('resource_unavailable');return draft;
  };
  const text={type:'string',minLength:1,maxLength:100000};
  return [
    defineTool({name:'orbit.drafts.read',title:'Read an exact saved draft',description:'Read saved customer content and its native revision. Reading never approves or sends it.',scope:'drafts:read',readOnly:true,
      inputSchema:objectSchema({id:string}),outputSchema,classes:['standard'],clauses:['OUT-001','ACTION-005'],untrusted:true,
      classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},run:async(args,ctx)=>{await fullSeller(bindings,ctx);return {result:{draft:await read(String(args.id))}};}}),
    defineTool({name:'orbit.drafts.create',title:'Prepare a customer draft',description:'Create an exact private draft with a current contact and native relationship. This is preparation and supplies no send approval.',scope:'drafts:write',readOnly:false,
      inputSchema:objectSchema({kind:kindSchema,id:string,contact_id:string,opportunity_id:{type:['string','null']},subject:{type:'string',minLength:1,maxLength:1000},body:text},['kind','id','contact_id','subject','body']),outputSchema,classes:['standard'],clauses:['OUT-001','ACTION-005'],
      classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},summary:args=>({target:{id:String(args.id)},items:[String(args.subject),String(args.body),`Contact: ${args.contact_id}`]}),
      run:async(args,ctx)=>{await fullSeller(bindings,ctx);const {access,actor}=await nativeRecords(bindings,ctx),db=agentDatabase(bindings.DB,access,actor,ctx);
        const result=await new RecordMailRepository(db).create(args.kind as 'contact'|'company'|'opportunity',String(args.id),{contactId:String(args.contact_id),subject:String(args.subject),body:String(args.body),...(args.opportunity_id!==undefined?{opportunityId:args.opportunity_id as string|null}:{})},ctx.person.id);
        const id=String((result as {id:string}).id);ctx.emit('draft.created',`orbit://drafts/${id}`);return {result,resources:[{uri:`orbit://drafts/${id}`,name:'Saved draft'}]};}}),
    defineTool({name:'orbit.drafts.update',title:'Edit an exact saved draft',description:'Save permitted exact recipient/content at the current native revision. Approved or stale content cannot be silently rewritten.',scope:'drafts:write',readOnly:false,
      inputSchema:objectSchema({id:string,recipient_email:{type:'string',format:'email'},subject:{type:'string',minLength:1,maxLength:1000},body:text}),outputSchema,classes:['standard'],clauses:['OUT-001','ACTION-005'],
      revision:async(args,ctx)=>{await fullSeller(bindings,ctx);return (await read(String(args.id))).revision;},classify:async(_args,ctx)=>{await fullSeller(bindings,ctx);return standard();},
      summary:async(args,ctx)=>{await fullSeller(bindings,ctx);const draft=await read(String(args.id));return {target:{id:draft.id,name:draft.subject},recipients:[String(args.recipient_email)],items:[String(args.subject),String(args.body)]};},
      run:async(args,ctx)=>{await fullSeller(bindings,ctx);const {access,actor}=await nativeRecords(bindings,ctx),db=agentDatabase(bindings.DB,access,actor,ctx),saved=await read(String(args.id));
        const result=await new DraftsService(new DraftsRepository(db),{now:()=>new Date(ctx.now())}).updateDraft({id:saved.id,expectedRevision:args.expected_revision as number??saved.revision,recipientEmail:String(args.recipient_email),subject:String(args.subject),body:String(args.body),actorId:ctx.person.id});
        ctx.emit('draft.updated',`orbit://drafts/${saved.id}`);return {result:{draft:result},resources:[{uri:`orbit://drafts/${saved.id}`,name:'Updated draft'}]};}}),
  ];
}
export function draftResource(bindings:PlatformBindings):ResourceDefinition {
  return {uriTemplate:'orbit://drafts/{id}',name:'Saved customer draft',scope:'drafts:read',classes:['standard'],classify:standard,
    async read(uri,ctx) {try {await fullSeller(bindings,ctx);const id=/^orbit:\/\/drafts\/([^/?#]+)$/.exec(uri)?.[1];if(!id)return null;const draft=await new DraftsRepository(bindings.DB).findDraft(id);return draft?{json:{draft},untrusted:true}:null;}catch{return null;}}};
}
