import {Hono} from 'hono';
import type {AuthenticatedOperator} from '../identity';
import {RecordError} from '../records/shared';
import {isFullOperator} from '../access/identity-class';
import {logUnexpected} from '../../platform/unexpected-error';
import {contactContextInput,opportunityContextInput,relationshipId} from './contracts';
import {readContactContext,saveContactContext} from './contact';
import {readOpportunityContext,saveOpportunityContext} from './opportunity';

/** Mount after the app's native session, origin, maintenance and class boundaries. */
export function createRelationshipRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((error,c)=>{
  if(error instanceof RecordError)return c.json({error:error.message},error.status);
  logUnexpected('relationships',error);
  return c.json({error:'The relationship update was not confirmed. Reload to inspect its current state.'},500);
 });
 app.use('*',async(c,next)=>{
  if(!await isFullOperator(db,c.get('operator').operatorId))return c.json({error:'A full native operator is required for relationship authoring.'},403);
  if(Object.keys(c.req.query()).length)return c.json({error:'Relationship requests do not accept query parameters.'},400);
  await next();
 });
 for(const kind of ['contact','opportunity'] as const){
  app.use(`/${kind}/:id`,async(c,next)=>{
   if(!relationshipId.safeParse(c.req.param('id')).success)return c.json({error:'Invalid record ID.'},400);
   await next();
  });
  app.get(`/${kind}/:id`,async c=>c.json(kind==='contact'?await readContactContext(db,c.req.param('id')):await readOpportunityContext(db,c.req.param('id'))));
  app.put(`/${kind}/:id`,async c=>{
   const raw:unknown=await c.req.json();
   if(kind==='contact'){
    const input=contactContextInput.safeParse(raw);
    if(!input.success)return c.json({error:input.error.issues.map(issue=>issue.message).join(' ')},400);
    return c.json(await saveContactContext(db,c.req.param('id'),input.data,c.get('operator')));
   }
   const input=opportunityContextInput.safeParse(raw);
   if(!input.success)return c.json({error:input.error.issues.map(issue=>issue.message).join(' ')},400);
   return c.json(await saveOpportunityContext(db,c.req.param('id'),input.data,c.get('operator')));
  });
 }
 return app;
}
