import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {OwnershipService} from './service';
import {ownerAuthorityFence,prepareOwnerChange} from './changes';
import {audit,RecordError} from '../records/shared';
export function createOwnershipRoutes(db:D1Database){const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>(),service=new OwnershipService(db),id=z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/);
 app.put('/:kind/:id',async c=>{const kind=z.enum(['contact','company','opportunity']).safeParse(c.req.param('kind')),recordId=id.safeParse(c.req.param('id')),input=z.object({ownerId:id.nullable()}).strict().safeParse(await c.req.json());if(!kind.success||!recordId.success||!input.success)return c.json({error:'Choose a record and an active owner or unassigned.'},400);const actor=c.get('operator'),prepared=await prepareOwnerChange(db,{kind:kind.data,id:recordId.data,ownerId:input.data.ownerId,actorId:actor.operatorId});try{await db.batch([...ownerAuthorityFence(db,actor.operatorId,input.data.ownerId,actor.sessionId),...prepared.statements,...(prepared.change.previousOwnerId!==prepared.change.ownerId?[audit(db,actor.operatorId,'owner.changed',kind.data,recordId.data,prepared.change)]:[])]);}catch(error){if(String(error).includes('runtime_controls.value'))throw new RecordError(409,'Record or owner changed. Reload before assigning.');throw error;}return c.json({changed:prepared.change.previousOwnerId!==prepared.change.ownerId});});
 app.get('/context',async c=>c.json(await service.context(c.get('operator').operatorId)));
 app.post('/preview',async c=>{const input=z.object({kind:z.enum(['contact','company','opportunity']),ids:z.array(id).min(1).max(200).refine(ids=>new Set(ids).size===ids.length),ownerId:id.nullable()}).strict().safeParse(await c.req.json());if(!input.success)return c.json({error:'Choose records and an active owner or unassigned.'},400);const actor=c.get('operator');return c.json(await service.preview(actor.operatorId,actor.sessionId,input.data.kind,input.data.ids,input.data.ownerId));});
 app.post('/reviews/:id/apply',async c=>c.json(await service.apply(c.get('operator').operatorId,c.req.param('id'))));
 app.post('/batches/:id/undo',async c=>c.json(await service.undo(c.get('operator').operatorId,c.req.param('id'),c.get('operator').sessionId)));
 app.get('/batches',async c=>c.json(await service.batches(c.get('operator').operatorId)));return app;}
