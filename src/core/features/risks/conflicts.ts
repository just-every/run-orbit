import {z} from 'zod';
import {createId} from '../../shared/ids';
import {hash,canonical} from '../delegation/protocol';
import type {AIProvider} from '../assistance/provider';
import {TodayError} from '../today/errors';
import {dealRisks,applyDismissals,type Finding} from './findings';

export const conflictInstructions='Find only contradictions between recorded lines of this deal: two lines that state different dates for the same event, or different prices or amounts for the same thing. For each, quote the exact conflicting words from each line, copied character for character, with that line\'s evidenceId, and propose one concrete next task that would resolve it. Return an empty list when nothing conflicts. Never infer a date, price or commitment that no line states.';
const citation=z.object({evidenceId:z.string(),quote:z.string().min(1).max(500)}).strict();
export const conflictSchema=z.object({findings:z.array(z.object({kind:z.enum(['conflicting-date','conflicting-price']),explanation:z.string().min(1).max(600),citations:z.array(citation).min(2).max(6),nextTask:z.string().trim().min(1).max(300)}).strict()).max(10)}).strict();

/** Every field the provider receives: the deal's text-bearing recorded evidence, and nothing else. */
export async function conflictRequest(db:D1Database,id:string){
 const risks=await dealRisks(db,id);
 const request={operation:'deal.risks.conflicts',instructions:conflictInstructions,deal:{title:risks.deal.title,stage:risks.deal.stage},
  lines:risks.evidence.filter(item=>item.confidence==='observed').map(item=>({evidenceId:item.id,label:item.label,text:item.text,occurredAt:item.occurredAt}))};
 return {request,requestHash:await hash(canonical(request)),dismissed:risks.dismissed};
}

/** Sends the previewed request unchanged. A finding must quote two different lines exactly; any unsupported citation fails the whole result, never repaired. */
export async function checkConflicts(db:D1Database,provider:AIProvider,operatorId:string,id:string,previewedHash:string){
 const {request,requestHash,dismissed}=await conflictRequest(db,id);
 if(requestHash!==previewedHash)throw new TodayError(409,'The deal changed since your preview. Review the new request before sending it.');
 const started=Date.now(),at=new Date().toISOString();let tokens={inputTokens:0,outputTokens:0,cachedInputTokens:0},findings:Finding[]|null=null,failure:string|null=null;
 try{
  const result=await provider.generate(request,{name:'orbit_deal_conflicts',schema:conflictSchema});tokens={inputTokens:result.inputTokens,outputTokens:result.outputTokens,cachedInputTokens:result.cachedInputTokens??0};
  const output=conflictSchema.parse(result.output),lines=new Map(request.lines.map(line=>[line.evidenceId,line.text]));
  for(const finding of output.findings){
   if(finding.citations.some(item=>!lines.get(item.evidenceId)?.includes(item.quote)))throw new Error('A finding cited a line or words that are not in this deal\'s recorded evidence.');
   if(new Set(finding.citations.map(item=>item.evidenceId)).size<2)throw new Error('A conflict must cite two different recorded lines.');
  }
  findings=await Promise.all(output.findings.map(async finding=>({key:`${finding.kind}:${(await hash(canonical(finding.citations.map(item=>[item.evidenceId,item.quote]).sort()))).slice(0,32)}`,kind:finding.kind,
   title:finding.kind==='conflicting-date'?'Recorded dates conflict':'Recorded prices conflict',citations:finding.citations,inference:{source:'ai' as const,text:finding.explanation},nextTask:finding.nextTask,dismissed:null})));
 }catch(error){failure=error instanceof z.ZodError?'The conflict check did not match the required form.':error instanceof Error?error.message:'AI request failed.';}
 const cost=((tokens.inputTokens-tokens.cachedInputTokens)*provider.inputCostPerMillion+tokens.cachedInputTokens*(provider.cachedInputCostPerMillion??provider.inputCostPerMillion)+tokens.outputTokens*provider.outputCostPerMillion)/1000000;
 await db.prepare('INSERT INTO ai_calls(id,operator_id,opportunity_id,provider,model,feature,input_tokens,output_tokens,cached_input_tokens,estimated_cost,duration_ms,status,error,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(createId(),operatorId,id,provider.provider,provider.model,'deal.risks',tokens.inputTokens,tokens.outputTokens,tokens.cachedInputTokens,cost,Date.now()-started,findings?'success':'failed',failure,at).run();
 return findings?{status:'succeeded' as const,findings:applyDismissals(findings,dismissed)}:{status:'failed' as const,error:failure!};
}
