import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import type {AIProvider} from '../assistance/provider';
import {isFullOperator} from '../access/identity-class';
import {DelegationError} from '../delegation/protocol';
import {RecordError} from '../records/shared';
import {stakeholderRoles} from '../relationships/contracts';
import {relationshipId} from '../relationships/contracts';
import {TodayError} from '../today/errors';
import {dealRisks} from './findings';
import {checkConflicts,conflictRequest} from './conflicts';
import {adjustRoleRule,approveTask,dismissFinding} from './actions';

const reason=z.string().trim().min(1).max(2000);
/** AGENT-002 deal risks: cited findings, reviewed conflict checks, reasoned dismissals and rule changes, and person-approved tasks. No route changes a deal or sends anything. */
export function createRiskRoutes(db:D1Database,provider?:AIProvider){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((error,c)=>{
  if(error instanceof TodayError||error instanceof RecordError)return c.json({error:error.message},error.status as 400);
  if(error instanceof DelegationError)return c.json({error:error.code.replaceAll('_',' ').toLowerCase()},error.status as 400);
  throw error;
 });
 app.use('/:id/*',async(c,next)=>{
  if(!relationshipId.safeParse(c.req.param('id')).success)return c.json({error:'Invalid opportunity ID.'},400);
  if(!await isFullOperator(db,c.get('operator').operatorId))return c.json({error:'A full native operator is required for deal risks.'},403);
  await next();
 });
 const operator=(c:{get:(key:'operator')=>AuthenticatedOperator})=>c.get('operator').operatorId;
 app.get('/:id/findings',async c=>{const {dismissed:_,...risks}=await dealRisks(db,c.req.param('id'));return c.json({...risks,aiConfigured:Boolean(provider)});});
 app.post('/:id/conflicts/preview',async c=>{const {request,requestHash}=await conflictRequest(db,c.req.param('id'));return c.json({configured:Boolean(provider),provider:provider?.provider??null,model:provider?.model??null,request,requestHash});});
 app.post('/:id/conflicts',async c=>{
  if(!provider)return c.json({error:'AI is not configured. Rule-based findings are complete without a conflict check.'},503);
  const input=z.object({requestHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({error:'Review the request preview first.'},400);
  const result=await checkConflicts(db,provider,operator(c),c.req.param('id'),input.data.requestHash);
  return c.json(result,result.status==='failed'?502:200);
 });
 app.post('/:id/dismissals',async c=>{
  const input=z.object({key:z.string().min(1).max(200),title:z.string().trim().min(1).max(500),reason}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({error:'Give a reason for dismissing this finding.'},400);
  return c.json(await dismissFinding(db,c.req.param('id'),input.data,operator(c)),201);
 });
 app.post('/:id/rules',async c=>{
  const input=z.object({role:z.enum(stakeholderRoles),required:z.boolean(),reason}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({error:'Choose a role, whether it is required and a reason.'},400);
  return c.json(await adjustRoleRule(db,c.req.param('id'),input.data,operator(c)),201);
 });
 app.post('/:id/tasks',async c=>{
  const input=z.object({title:z.string().trim().min(1).max(300),dueAt:z.iso.datetime().nullable(),evidenceIds:z.array(z.string().min(1).max(200)).min(1).max(20)}).strict().safeParse(await c.req.json().catch(()=>null));
  if(!input.success)return c.json({error:'Enter a task title, an optional due time and its cited evidence.'},400);
  return c.json(await approveTask(db,c.req.param('id'),input.data,operator(c)),201);
 });
 return app;
}
