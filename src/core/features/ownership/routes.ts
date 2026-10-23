import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {OwnershipRepository} from './repository';
export function createOwnershipRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),repo=new OwnershipRepository(db),id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
 app.post('/review',async c=>{
  const input=z.object({kind:z.enum(['contact','company']),ids:z.array(id).min(1).max(100).refine(values=>new Set(values).size===values.length),ownerId:id.nullable()}).strict().safeParse(await c.req.json());
  if(!input.success)return c.json({error:'Review one to 100 distinct contacts or companies and choose an owner or Unassigned.'},400);
  return c.json(await repo.review(input.data.kind,input.data.ids,input.data.ownerId,c.get('operator').operatorId));
 });
 app.get('/:id',async c=>{if(!id.safeParse(c.req.param('id')).success)return c.json({error:'Invalid ownership review.'},400);return c.json(await repo.describe(c.req.param('id'),c.get('operator').operatorId));});
 for(const action of ['apply','undo'] as const)app.post(`/:id/${action}`,async c=>{
  if(!id.safeParse(c.req.param('id')).success||!z.object({}).strict().safeParse(await c.req.json()).success)return c.json({error:'Use the saved ownership review.'},400);
  return c.json(await repo[action](c.req.param('id'),c.get('operator').operatorId));
 });
 return app;
}
