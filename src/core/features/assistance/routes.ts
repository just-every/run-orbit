import {assertSalesAiPreview} from '../teams/ai-authority';
import {recordAssistanceRoutes} from './record-routes';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthenticatedOperator } from '../identity';
import { createId } from '../../shared/ids';
import { WorkbenchError } from '../workbench/repository';
import { OutreachRepository } from '../workbench/outreach-repository';
import { buildPreview } from './preview';
import { outputSchema,type AIProvider } from './provider';
const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
export function createAssistanceRoutes(db:D1Database,provider?:AIProvider) {
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.route('/record-mail',recordAssistanceRoutes(db,provider));
 app.onError((error,c)=>error instanceof WorkbenchError?c.json({error:error.message},error.status):c.json({error:'AI request failed. No explanation or draft was created.'},502));
 app.get('/usage',async c=>c.json({configured:Boolean(provider),totals:(await db.prepare("SELECT substr(created_at,1,10) AS day,feature,provider,model,count(*) AS calls,sum(input_tokens) AS inputTokens,sum(output_tokens) AS outputTokens,sum(cached_input_tokens) AS cachedInputTokens,sum(estimated_cost) AS estimatedCost FROM ai_calls GROUP BY day,feature,provider,model ORDER BY day DESC").all()).results}));
 app.post('/preview',async c=>{
  const input=z.object({opportunityId:id,contactId:id.optional(),feature:z.enum(['draft','explanation'])}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({error:'Choose an opportunity, recipient and AI operation.'},400);
  const preview=await buildPreview(db,input.data.opportunityId,input.data.contactId,input.data.feature),previewId=createId();
  await assertSalesAiPreview(db,c.get('operator'),input.data.opportunityId,input.data.contactId,input.data.feature,preview);
  await db.prepare('INSERT INTO ai_previews(id,operator_id,opportunity_id,recommendation_id,recipient_contact_id,feature,content_json,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(previewId,c.get('operator').operatorId,input.data.opportunityId,preview.recommendation.id,preview.contact?.id??null,input.data.feature,JSON.stringify(preview),new Date().toISOString()).run();
  return c.json({id:previewId,configured:Boolean(provider),provider:provider?.provider,model:provider?.model,preview});
 });
 app.post('/generate',async c=>{
  if(!provider)return c.json({error:'AI is not configured. Manual work remains available.'},503);
  const input=z.object({previewId:id}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({error:'Review a request preview first.'},400);
  const actor=c.get('operator').operatorId;
  const saved=await db.prepare('SELECT * FROM ai_previews WHERE id=? AND operator_id=? AND consumed_at IS NULL').bind(input.data.previewId,actor).first<{id:string;opportunity_id:string;recommendation_id:string;recipient_contact_id:string|null;feature:'draft'|'explanation';content_json:string}>();
  if(!saved)return c.json({error:'The preview was already used or is unavailable.'},409);
  const current=await buildPreview(db,saved.opportunity_id,saved.recipient_contact_id??undefined,saved.feature);
  await assertSalesAiPreview(db,c.get('operator'),saved.opportunity_id,saved.recipient_contact_id??undefined,saved.feature,current);
  if(JSON.stringify(current)!==saved.content_json)return c.json({error:'The record changed. Review a fresh preview.'},409);
  const at=new Date().toISOString(),claimed=await db.prepare('UPDATE ai_previews SET consumed_at=? WHERE id=? AND consumed_at IS NULL').bind(at,saved.id).run();
  if(claimed.meta.changes!==1)return c.json({error:'The preview was already used.'},409);
  const started=Date.now(),callId=createId();let tokens:{inputTokens:number;outputTokens:number;cachedInputTokens?:number}={inputTokens:0,outputTokens:0,cachedInputTokens:0};
  try {
   const result=await provider.generate(JSON.parse(saved.content_json));tokens=result;
   const output=outputSchema.parse(result.output),allowed=new Set(current.evidence.map(e=>e.id));
   if(output.evidenceIds.some(e=>!allowed.has(e))||output.body.trim().split(/\s+/).filter(Boolean).length>150)throw new Error('AI output violated the evidence or length requirement.');
   const fresh=await buildPreview(db,saved.opportunity_id,saved.recipient_contact_id??undefined,saved.feature);
   await assertSalesAiPreview(db,c.get('operator'),saved.opportunity_id,saved.recipient_contact_id??undefined,saved.feature,fresh);
   if(JSON.stringify(fresh)!==saved.content_json)throw new Error('The record changed during generation. Review a fresh preview.');
   let draftId:string|undefined;
   if(saved.feature==='draft') {
    if(!output.subject.trim()||!output.body.trim()||!saved.recipient_contact_id)throw new Error('AI returned an empty draft.');
    draftId=(await new OutreachRepository(db).createDraft(saved.opportunity_id,{contactId:saved.recipient_contact_id,subject:output.subject,body:output.body},actor)).id;
   } else await db.prepare('UPDATE recommendations SET explanation=?,updated_at=? WHERE id=? AND is_current=1').bind(output.explanation,new Date().toISOString(),saved.recommendation_id).run();
   await record('success',null);
   return c.json({output,draftId});
  } catch(error) {await record('failed',error instanceof Error?error.message:'AI validation failed');return c.json({error:'AI generation failed validation, changed context, or provider delivery. No usable new result was confirmed.'},502);}
  async function record(status:string,error:string|null) {
   await db.prepare('INSERT INTO ai_calls(id,operator_id,opportunity_id,provider,model,feature,input_tokens,output_tokens,cached_input_tokens,estimated_cost,duration_ms,status,error,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(callId,actor,saved!.opportunity_id,provider!.provider,provider!.model,saved!.feature,tokens.inputTokens,tokens.outputTokens,tokens.cachedInputTokens??0,((tokens.inputTokens-(tokens.cachedInputTokens??0))*provider!.inputCostPerMillion+(tokens.cachedInputTokens??0)*(provider!.cachedInputCostPerMillion??provider!.inputCostPerMillion)+tokens.outputTokens*provider!.outputCostPerMillion)/1000000,Date.now()-started,status,error,at).run();
  }
 });
 return app;
}
