import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {AccessError} from '../access/errors';
import {RecordError} from '../records/shared';
import {logUnexpected} from '../../platform/unexpected-error';
import {createSchema,deleteSchema,managedId,managedKind,typeInputSchema,typeUpdateSchema,updateSchema} from './contracts';
import {ManagedRecordsRepository} from './repository';
import {saveManagedType} from './types';
/** Mount behind native session middleware at /api/v1/managed-records. */
export function createManagedRecordRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),repo=new ManagedRecordsRepository(db);
 app.onError((error,c)=>{
  if(error instanceof AccessError||error instanceof RecordError)return c.json({error:error.message},error.status);
  if(error instanceof z.ZodError||error instanceof SyntaxError)return c.json({error:'Enter valid object fields, owner and reviewed record state.'},400);
  logUnexpected('managed-records',error);return c.json({error:'The record operation failed; no success was confirmed.'},500);
 });
 app.use('*',async(c,next)=>{c.header('Cache-Control','no-store');if(!c.get('operator'))return c.json({error:'Operator session required.'},401);await next();});
 app.get('/definitions',async c=>c.json(await repo.definitions(c.get('operator'))));
 app.post('/definitions',async c=>c.json(await saveManagedType(db,c.get('operator'),typeInputSchema.parse(await c.req.json()),true),201));
 app.put('/definitions/:name',async c=>c.json(await saveManagedType(db,c.get('operator'),{...typeUpdateSchema.parse(await c.req.json()),name:managedKind.parse(c.req.param('name'))},false)));
 app.get('/owners',async c=>c.json(await repo.owners(c.get('operator'))));
 app.get('/:kind',async c=>{const input=z.object({q:z.string().max(500).default(''),cursor:z.string().max(4000).optional()}).strict().parse(c.req.query());return c.json(await repo.list(c.get('operator'),managedKind.parse(c.req.param('kind')),input.q,input.cursor));});
 app.post('/:kind',async c=>c.json(await repo.create(c.get('operator'),managedKind.parse(c.req.param('kind')),createSchema.parse(await c.req.json())),201));
 app.get('/:kind/:id',async c=>c.json(await repo.detail(c.get('operator'),managedKind.parse(c.req.param('kind')),managedId.parse(c.req.param('id')))));
 app.put('/:kind/:id',async c=>c.json(await repo.update(c.get('operator'),managedKind.parse(c.req.param('kind')),managedId.parse(c.req.param('id')),updateSchema.parse(await c.req.json()))));
 app.delete('/:kind/:id',async c=>{const input=deleteSchema.parse(await c.req.json());return c.json(await repo.remove(c.get('operator'),managedKind.parse(c.req.param('kind')),managedId.parse(c.req.param('id')),input.revision));});
 return app;
}
