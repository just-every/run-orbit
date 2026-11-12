import {createId} from '../../shared/ids';
import {WorkbenchError,WorkbenchRepository} from '../workbench/repository';
import {OutreachRepository} from '../workbench/outreach-repository';
import {hash} from '../delegation/protocol';
import {buildPreview} from './preview';
import {outputSchema,type AIProvider} from './provider';

export class AssistanceGenerationError extends Error {}

/** One native action for reviewed HTTP requests and policy-governed MCP calls.
 * Admission and the one-use claim belong to each public door. This action
 * rechecks the exact native input before requesting and before saving output. */
export async function generateAssistance(db:D1Database,provider:AIProvider,actor:string,current:Awaited<ReturnType<typeof buildPreview>>,beforeRequest?:()=>Promise<void>) {
 const saved={opportunity_id:String(current.opportunity.id),recommendation_id:current.recommendation.id,
  recipient_contact_id:current.contact?String(current.contact.id):null,feature:current.feature,content_json:JSON.stringify(current)};
 const at=new Date().toISOString();
 const checked=await buildPreview(db,saved.opportunity_id,saved.recipient_contact_id??undefined,saved.feature);
 if(JSON.stringify(checked)!==saved.content_json)throw new WorkbenchError(409,'The record changed. Review a fresh preview.');
  const started=Date.now(),callId=createId();let tokens:{inputTokens:number;outputTokens:number;cachedInputTokens?:number}={inputTokens:0,outputTokens:0,cachedInputTokens:0};
  try {
   await beforeRequest?.();
   const result=await provider.generate(current);tokens=result;
   const output=outputSchema.parse(result.output),allowed=new Set(current.evidence.map(e=>e.id));
   if(output.evidenceIds.some(e=>!allowed.has(e))||output.body.trim().split(/\s+/).filter(Boolean).length>150)throw new Error('AI output violated the evidence or length requirement.');
   const fresh=await buildPreview(db,saved.opportunity_id,saved.recipient_contact_id??undefined,saved.feature);
   if(JSON.stringify(fresh)!==saved.content_json)throw new Error('The record changed during generation. Review a fresh preview.');
   let draftId:string|undefined;
   if(saved.feature==='draft') {
    if(!output.subject.trim()||!output.body.trim()||!saved.recipient_contact_id)throw new Error('AI returned an empty draft.');
    draftId=(await new OutreachRepository(db).createDraft(saved.opportunity_id,{contactId:saved.recipient_contact_id,subject:output.subject,body:output.body},actor)).id;
   } else await db.prepare('UPDATE recommendations SET explanation=?,updated_at=? WHERE id=? AND is_current=1').bind(output.explanation,new Date().toISOString(),saved.recommendation_id).run();
   await db.batch(new WorkbenchRepository(db).timeline(saved.opportunity_id,actor,'assistance.generated',{
    feature:saved.feature,provider:provider.provider,model:provider.model,previewHash:await hash(saved.content_json),
    evidenceIds:output.evidenceIds,explanation:output.explanation,...(draftId?{draftId}:{})
   },at));
   await record('success',null);
   return {output,...(draftId?{draftId}:{})};
  } catch(error) {await record('failed',error instanceof Error?error.message:'AI validation failed');throw new AssistanceGenerationError('AI generation failed validation, changed context, or provider delivery. No usable new result was confirmed.');}
  async function record(status:string,error:string|null) {
   await db.prepare('INSERT INTO ai_calls(id,operator_id,opportunity_id,provider,model,feature,input_tokens,output_tokens,cached_input_tokens,estimated_cost,duration_ms,status,error,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(callId,actor,saved!.opportunity_id,provider!.provider,provider!.model,saved!.feature,tokens.inputTokens,tokens.outputTokens,tokens.cachedInputTokens??0,((tokens.inputTokens-(tokens.cachedInputTokens??0))*provider!.inputCostPerMillion+(tokens.cachedInputTokens??0)*(provider!.cachedInputCostPerMillion??provider!.inputCostPerMillion)+tokens.outputTokens*provider!.outputCostPerMillion)/1000000,Date.now()-started,status,error,at).run();
  }
}
