import {recordAssistanceRoutes} from './record-routes';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthenticatedOperator } from '../identity';
import { createId } from '../../shared/ids';
import { WorkbenchError } from '../workbench/repository';
import { buildPreview } from './preview';
import type { AIProvider } from './provider';
import {generateAssistance,AssistanceGenerationError} from './generation';
const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
export function createAssistanceRoutes(db:D1Database,provider?:AIProvider) {
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.route('/record-mail',recordAssistanceRoutes(db,provider));
 app.onError((error,c)=>error instanceof WorkbenchError?c.json({error:error.message},error.status):error instanceof AssistanceGenerationError?c.json({error:error.message},502):c.json({error:'AI request failed. No explanation or draft was created.'},502));
 app.get('/usage',async c=>c.json({configured:Boolean(provider),totals:(await db.prepare("SELECT substr(created_at,1,10) AS day,feature,provider,model,count(*) AS calls,sum(input_tokens) AS inputTokens,sum(output_tokens) AS outputTokens,sum(cached_input_tokens) AS cachedInputTokens,sum(estimated_cost) AS estimatedCost FROM ai_calls GROUP BY day,feature,provider,model ORDER BY day DESC").all()).results}));
 app.post('/preview',async c=>{
  const input=z.object({opportunityId:id,contactId:id.optional(),feature:z.enum(['draft','explanation'])}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({error:'Choose an opportunity, recipient and AI operation.'},400);
  const preview=await buildPreview(db,input.data.opportunityId,input.data.contactId,input.data.feature),previewId=createId();
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
  if(JSON.stringify(current)!==saved.content_json)return c.json({error:'The record changed. Review a fresh preview.'},409);
  const at=new Date().toISOString(),claimed=await db.prepare('UPDATE ai_previews SET consumed_at=? WHERE id=? AND consumed_at IS NULL').bind(at,saved.id).run();
  if(claimed.meta.changes!==1)return c.json({error:'The preview was already used.'},409);
  return c.json(await generateAssistance(db,provider,actor,current));
 });
 return app;
}
