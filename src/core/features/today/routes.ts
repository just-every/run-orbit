import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import type {AIProvider} from '../assistance/provider';
import {DelegationError} from '../delegation/protocol';
import {RecordError} from '../records/shared';
import {buildBrief} from './brief';
import {TodayError} from './errors';
import {buildMeetingPlan} from './meeting-plan';
import {planAction,savePlan} from './plan-actions';
import {generateSummary,summaryRequest} from './summary';
import {markSeen} from './window';

const signalId=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);

/** Today's brief, meeting plans and their person-only actions. None of them sends anything. */
export function createTodayRoutes(db:D1Database,provider?:AIProvider){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((error,c)=>{
  if(error instanceof TodayError||error instanceof RecordError)return c.json({error:error.message},error.status as 400);
  if(error instanceof DelegationError)return c.json({error:error.code==='REVISION_CONFLICT'?'The opportunity changed. Reload the plan and try again.':error.code.replaceAll('_',' ').toLowerCase()},error.status as 400);
  throw error;
 });
 app.get('/',async c=>c.json({brief:await buildBrief(db,{operatorId:c.get('operator').operatorId}),aiConfigured:Boolean(provider)}));
 app.post('/seen',async c=>{
  const input=z.object({through:z.iso.datetime()}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success||Date.parse(input.data.through)>Date.now())return c.json({error:'Mark a brief you have seen.'},400);
  await markSeen(db,c.get('operator').operatorId,input.data.through);return c.json({seen:input.data.through});
 });
 app.post('/summary/preview',async c=>{
  const input=z.object({account:z.string().min(1).max(200)}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({error:'Choose an account.'},400);
  return c.json({configured:Boolean(provider),provider:provider?.provider??null,model:provider?.model??null,...await summaryRequest(db,c.get('operator').operatorId,input.data.account)});
 });
 app.post('/summary',async c=>{
  if(!provider)return c.json({error:'AI is not configured. The brief is complete without a summary.'},503);
  const input=z.object({account:z.string().min(1).max(200),requestHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({error:'Review the request preview first.'},400);
  const result=await generateSummary(db,provider,c.get('operator').operatorId,input.data.account,input.data.requestHash);
  return c.json(result,result.status==='failed'?502:200);
 });
 app.get('/meetings/:id',async c=>{const id=signalId.safeParse(c.req.param('id'));if(!id.success)return c.json({error:'Meeting not found.'},404);return c.json({plan:await buildMeetingPlan(db,id.data,{operatorId:c.get('operator').operatorId})});});
 app.put('/meetings/:id/plan',async c=>{
  const id=signalId.safeParse(c.req.param('id')),input=z.object({agenda:z.string().max(20000),prep:z.string().max(20000)}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!id.success||!input.success)return c.json({error:'Enter an agenda and prep notes.'},400);
  return c.json(await savePlan(db,id.data,input.data,c.get('operator').operatorId));
 });
 app.post('/meetings/:id/actions',async c=>{
  const id=signalId.safeParse(c.req.param('id')),input=z.object({title:z.string().trim().min(1).max(300),dueAt:z.iso.datetime().nullable(),evidenceId:z.string().regex(/^[A-Za-z0-9_-]{1,100}$/)}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!id.success||!input.success)return c.json({error:'Enter a next action title and an optional due time.'},400);
  return c.json(await planAction(db,id.data,input.data,c.get('operator').operatorId),201);
 });
 return app;
}
