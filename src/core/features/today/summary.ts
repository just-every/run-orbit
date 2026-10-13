import {z} from 'zod';
import {createId} from '../../shared/ids';
import {hash,canonical} from '../delegation/protocol';
import type {AIProvider} from '../assistance/provider';
import {buildBrief} from './brief';
import {TodayError} from './errors';

export const summaryInstructions='Write one plain paragraph of at most 120 words on what needs attention for this account today. Use only the lines given. List in evidenceIds the evidenceId of every line you rely on. Add no fact, price, date, promise or commitment that a line does not carry.';
export const summarySchema=z.object({summary:z.string().min(1).max(1200),evidenceIds:z.array(z.string()).min(1)}).strict();

/** The exact request for one account's summary: every field the provider receives, and nothing else. */
export async function summaryRequest(db:D1Database,operatorId:string,accountKey:string){
 const brief=await buildBrief(db,{operatorId}),account=brief.accounts.find(item=>item.key===accountKey);
 if(!account)throw new TodayError(404,'This account has nothing in today\'s brief.');
 const workspace=await db.prepare("SELECT name,timezone FROM workspace_settings WHERE id='workspace'").first<{name:string;timezone:string}>();
 const request={operation:'brief.summary',instructions:summaryInstructions,workspace,since:brief.since,account:{key:account.key,type:account.type,name:account.name},
  lines:account.lines.map(line=>({evidenceId:line.evidence.id,kind:line.kind,confidence:line.confidence,title:line.title,detail:line.detail,occurredAt:line.occurredAt,dueAt:line.dueAt}))};
 return {request,requestHash:await hash(canonical(request)),opportunityId:account.type==='opportunity'?account.id:null};
}

/**
 * Sends the request the operator previewed, unchanged. Output must validate and cite only evidence in that request;
 * anything else is recorded and shown as failed, never repaired.
 */
export async function generateSummary(db:D1Database,provider:AIProvider,operatorId:string,accountKey:string,previewedHash:string){
 const {request,requestHash,opportunityId}=await summaryRequest(db,operatorId,accountKey);
 if(requestHash!==previewedHash)throw new TodayError(409,'The brief changed since your preview. Review the new request before sending it.');
 const started=Date.now(),at=new Date().toISOString();let tokens={inputTokens:0,outputTokens:0,cachedInputTokens:0},outcome:{summary:string;evidenceIds:string[]}|null=null,failure:string|null=null;
 try{
  const result=await provider.generate(request,{name:'orbit_brief_summary',schema:summarySchema});tokens={inputTokens:result.inputTokens,outputTokens:result.outputTokens,cachedInputTokens:result.cachedInputTokens??0};
  const output=summarySchema.parse(result.output),allowed=new Set(request.lines.map(line=>line.evidenceId));
  if(output.evidenceIds.some(id=>!allowed.has(id)))throw new Error('The summary cited evidence that is not in this account\'s brief.');
  outcome=output;
 }catch(error){failure=error instanceof z.ZodError?'The summary did not match the required form or cited no evidence.':error instanceof Error?error.message:'AI request failed.';}
 const cost=((tokens.inputTokens-tokens.cachedInputTokens)*provider.inputCostPerMillion+tokens.cachedInputTokens*(provider.cachedInputCostPerMillion??provider.inputCostPerMillion)+tokens.outputTokens*provider.outputCostPerMillion)/1000000;
 await db.prepare('INSERT INTO ai_calls(id,operator_id,opportunity_id,provider,model,feature,input_tokens,output_tokens,cached_input_tokens,estimated_cost,duration_ms,status,error,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(createId(),operatorId,opportunityId,provider.provider,provider.model,'brief.summary',tokens.inputTokens,tokens.outputTokens,tokens.cachedInputTokens,cost,Date.now()-started,outcome?'success':'failed',failure,at).run();
 return outcome?{status:'succeeded' as const,...outcome}:{status:'failed' as const,error:failure!};
}
