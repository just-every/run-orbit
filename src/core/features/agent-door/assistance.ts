import {defineTool,ToolRefusal,type ToolContext,type ClassAndFacts} from '../../../base/modules/agent-door/index.ts';
import {buildPreview} from '../assistance/preview';
import {createAIProvider} from '../assistance/provider';
import {generateAssistance} from '../assistance/generation';
import {WorkbenchError} from '../workbench/repository';
import {hash} from '../delegation/protocol';
import type {PlatformBindings} from '../../platform/assets';
import {objectSchema,outputSchema,standard,string} from './records';
import {fullSeller} from './evidence';
import {AgentAccess,agentDatabase} from './native-access';

type Preview=Awaited<ReturnType<typeof buildPreview>>;
/** Match actual identifier values in the exact input, never a sensitivity or
 * destination claim. Ordinary CRM names, addresses and estimates do not match. */
function regulatedRecords(preview:Preview) {
  const records=[preview.workspace,preview.opportunity,preview.contact,preview.company,...preview.evidence,...preview.messages,...preview.replies];
  return records.filter(record=>{
    const text=JSON.stringify(record);
    return /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/.test(text)
      || /\b(?:EIN|tax(?:payer)?[ _-]?(?:id|identification number))\s*[:=]?\s*\d{2}-\d{7}\b/i.test(text);
  }).length;
}
function inputRisk(preview:Preview):ClassAndFacts[] {
  const count=regulatedRecords(preview);
  return count?[{class:'sensitive',facts:{kind:'regulated_identifiers',measure:count}}]:[];
}
export function assistanceTools(bindings:PlatformBindings) {
  const properties={opportunity_id:string,contact_id:string,feature:{type:'string',enum:['draft','explanation']}};
  const read=async(args:Record<string,unknown>,ctx:ToolContext)=>{
    await fullSeller(bindings,ctx);
    try {
      const preview=await buildPreview(bindings.DB,String(args.opportunity_id),args.contact_id?String(args.contact_id):undefined,args.feature as 'draft'|'explanation');
      const provider=createAIProvider(bindings);
      const previewHash=await hash(JSON.stringify(preview));
      const revision=await hash(JSON.stringify({previewHash,provider:provider?.provider??null,model:provider?.model??null}));
      return {preview,previewHash,revision,configured:Boolean(provider),provider:provider?.provider??null,model:provider?.model??null};
    }catch(error){if(error instanceof WorkbenchError)throw new ToolRefusal(error.status===404?'resource_unavailable':'revision_conflict');throw error;}
  };
  const required=['opportunity_id','feature'];
  return [
    defineTool({name:'orbit.assistance.preview',title:'Preview opportunity AI input',description:'Read the exact native AI input, its hash and the configured provider and model. No preview is saved and no provider is contacted.',scope:'drafts:read',readOnly:true,
      inputSchema:objectSchema(properties,required),outputSchema,classes:['standard','sensitive'],clauses:['SURFACE-003','AI-001','ACTION-003'],untrusted:true,
      classify:async(args,ctx)=>[...standard(),...inputRisk((await read(args,ctx)).preview)],
      run:async(args,ctx)=>({result:await read(args,ctx)})}),
    defineTool({name:'orbit.assistance.generate',title:'Generate an unsent opportunity result',description:'Send the exact reviewed native input to the configured AI provider under company policy. Save only an unsent draft or current recommendation explanation with cited evidence; no customer submission.',scope:'drafts:write',readOnly:false,
      inputSchema:objectSchema({...properties,source_revision:{type:'string',pattern:'^[a-f0-9]{64}$'}},[...required,'source_revision']),outputSchema,classes:['external','sensitive'],clauses:['SURFACE-003','AI-001','ACTION-003'],untrusted:true,revisionType:'string',
      target:async(args,ctx)=>{await fullSeller(bindings,ctx);return {kind:'opportunity',id:String(args.opportunity_id)};},
      revision:async(args,ctx)=>{const current=await read(args,ctx);return current.revision;},
      classify:async(args,ctx,completed)=>{
        await fullSeller(bindings,ctx);
        if(completed)return [...completed];
        const current=await read(args,ctx);
        if(!current.configured)throw new ToolRefusal('native_unavailable');
        if(args.source_revision!==current.revision)throw new ToolRefusal('revision_conflict');
        return [{class:'external',facts:{measure:1,counterparty:'known',provider:current.provider!}},...inputRisk(current.preview)];
      },
      summary:async(args,ctx)=>{
        const current=await read(args,ctx),preview=current.preview;
        return {target:{id:String(preview.opportunity.id),name:String(preview.opportunity.title)},recipients:[current.provider??'Unconfigured AI provider'],items:[
          `Feature: ${preview.feature}`,`Provider: ${current.provider}`,`Model: ${current.model}`,`Provider recipients: 1 (known)`,
          `Draft recipient: ${preview.contact?.name??'None'} (${preview.contact?.id??'none'})`,
          `Exact input: ${current.previewHash}`,
          ...preview.evidence.map(item=>`Evidence: ${item.id}`),
        ]};
      },
      run:async(args,ctx)=>{
        const current=await read(args,ctx),provider=createAIProvider(bindings);
        if(!provider)throw new ToolRefusal('native_unavailable');
        if(args.source_revision!==current.revision)throw new ToolRefusal('revision_conflict');
        const access=new AgentAccess(bindings,ctx),actor=await access.fullOperator(),db=agentDatabase(bindings.DB,access,actor,ctx);
        const result=await generateAssistance(db,provider,ctx.person.id,current.preview,async()=>{
          await fullSeller(bindings,ctx);await access.providerAdmission(actor);
        });
        ctx.emit('assistance.generated',`orbit://records/opportunity/${args.opportunity_id}`,{feature:current.preview.feature,evidenceIds:result.output.evidenceIds});
        return {result:{...result,previewHash:current.previewHash,provider:provider.provider,model:provider.model},...(result.draftId?{resources:[{uri:`orbit://drafts/${result.draftId}`,name:'Unsent draft'}]}:{})};
      },
    }),
  ];
}
