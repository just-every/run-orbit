import {processEvaluationJobs} from '../workbench/evaluation-repository';
import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {createId} from '../../shared/ids';
import {RecordMailRepository} from '../outreach/record-mail-repository';
import {heldRecordReplies,resolveHeldRecordReply} from '../outreach/held-record-replies';
import {SettingsRepository} from '../settings/repository';
import {RecordError} from '../records/shared';
import {WorkbenchError} from '../workbench/repository';
import {outputSchema,type AIProvider} from './provider';
import {recordDraftPreview,readRecordPreview,saveRecordPreview,recordPreviewKey} from './record-preview';
const id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
export function recordAssistanceRoutes(db:D1Database,provider?:AIProvider){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((error,c)=>error instanceof WorkbenchError||error instanceof RecordError?c.json({error:error.message},error.status):c.json({error:'The record request failed. No result was confirmed.'},502));
 app.post('/preview',async c=>{
  const input=z.object({kind:z.enum(['contact','company','opportunity']),recordId:id,contactId:id,opportunityId:id.nullable()}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({error:'Choose a record, recipient and deal link.'},400);
  const preview=await recordDraftPreview(db,input.data),previewId=createId();await saveRecordPreview(db,previewId,c.get('operator').operatorId,input.data,preview);
  return c.json({id:previewId,configured:!!provider,provider:provider?.provider,model:provider?.model,preview});
 });
 app.post('/generate',async c=>{
  if(!provider)return c.json({error:'AI is not configured. No draft was created.'},503);
  const input=z.object({previewId:id}).strict().safeParse(await c.req.json().catch(()=>null));if(!input.success)return c.json({error:'Review a request preview first.'},400);
  const actor=c.get('operator').operatorId,saved=await readRecordPreview(db,input.data.previewId,actor),current=await recordDraftPreview(db,saved.input);
  if(JSON.stringify(current)!==JSON.stringify(saved.preview))return c.json({error:'The record changed. Review a fresh preview.'},409);
  const claimed=await db.prepare('DELETE FROM runtime_controls WHERE name=? AND value=? RETURNING name').bind(recordPreviewKey(input.data.previewId),saved.value).first<string>('name');if(!claimed)return c.json({error:'The preview was already used.'},409);
  const started=Date.now(),at=new Date().toISOString(),callId=createId();let tokens={inputTokens:0,outputTokens:0,cachedInputTokens:0};
  try{
   const result=await provider.generate(saved.preview);tokens={...result,cachedInputTokens:result.cachedInputTokens??0};
   const output=outputSchema.parse(result.output),allowed=new Set(current.evidence.map(item=>item.id));
   if(!output.subject.trim()||!output.body.trim()||output.body.trim().split(/\s+/).length>150||output.evidenceIds.some(citation=>!allowed.has(citation)))throw new Error('Invalid draft evidence or content.');
   if(JSON.stringify(await recordDraftPreview(db,saved.input))!==JSON.stringify(saved.preview))throw new Error('The record changed during generation.');
   const draft=await new RecordMailRepository(db).create(saved.input.kind,saved.input.recordId,{contactId:saved.input.contactId,opportunityId:saved.input.opportunityId,subject:output.subject,body:output.body},actor,{callId,evidenceIds:output.evidenceIds,explanation:output.explanation});
   await record('success');return c.json({draftId:draft.id,output});
  }catch{await record('failed');return c.json({error:'AI generation failed. No usable draft was confirmed. Review a fresh preview to try again.'},502);}
  async function record(status:string){await db.prepare('INSERT INTO ai_calls(id,operator_id,provider,model,feature,input_tokens,output_tokens,cached_input_tokens,estimated_cost,duration_ms,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(callId,actor,provider!.provider,provider!.model,'record-draft',tokens.inputTokens,tokens.outputTokens,tokens.cachedInputTokens,((tokens.inputTokens-tokens.cachedInputTokens)*provider!.inputCostPerMillion+tokens.cachedInputTokens*(provider!.cachedInputCostPerMillion??provider!.inputCostPerMillion)+tokens.outputTokens*provider!.outputCostPerMillion)/1e6,Date.now()-started,status,at).run();}
 });
 app.get('/replies',async c=>{const contactId=c.req.query('contactId');if(contactId&&!id.safeParse(contactId).success)return c.json({error:'Choose a contact.'},400);return c.json({replies:await heldRecordReplies(db,contactId)});});
 app.post('/replies/:id/resolve',async c=>{const input=z.object({contactId:id,decision:z.enum(['attach','dismiss'])}).strict().safeParse(await c.req.json().catch(()=>null));if(!id.safeParse(c.req.param('id')).success||!input.success)return c.json({error:'Choose a reply, contact and resolution.'},400);return c.json(await resolveHeldRecordReply(db,c.req.param('id'),input.data.contactId,input.data.decision,c.get('operator').operatorId));});
 app.post('/operators/:id/remove',async c=>{const receiver=id.nullable(),input=z.object({confirmed:z.literal(true),handover:z.object({review:z.string().regex(/^[a-f0-9]{64}$/),opportunities:receiver,tasks:receiver,handoffs:receiver,recordMailObligations:receiver.optional(),contacts:receiver.optional(),companies:receiver.optional()}).strict()}).strict().safeParse(await c.req.json().catch(()=>null));if(!id.safeParse(c.req.param('id')).success||!input.success)return c.json({error:'Review owned work and confirm removal.'},400);const actor=c.get('operator');const result=await new SettingsRepository(db).remove(c.req.param('id'),actor.operatorId,input.data.handover,actor.sessionId);try{await processEvaluationJobs(db);}catch{c.header('X-Orbit-Evaluation','failed; inspect stale evaluation');}return c.json(result);});
 return app;
}
