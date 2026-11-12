import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {RecordError} from '../records/shared';
import {acceptObligationInput} from './input';
import {acceptObligation,readObligations,stopObligation} from './repository';
export function obligationRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((error,c)=>{if(error instanceof RecordError)return c.json({error:error.message},error.status);if(/follow.up|runtime_controls.value/i.test(String(error)))return c.json({error:'The obligation or its authority changed. Reload before continuing.'},409);throw error;});
 app.get('/opportunities/:id',async c=>c.json({obligations:await readObligations(db,c.req.param('id'))}));
 app.post('/',async c=>{const input=acceptObligationInput.safeParse(await c.req.json());if(!input.success)return c.json({error:'Choose the completed meeting, recipient, owner, due time, later stage and stop condition.'},400);return c.json(await acceptObligation(db,input.data,c.get('operator').operatorId),201);});
 app.post('/:id/stop',async c=>{const input=z.object({reason:z.string().trim().min(1).max(1000)}).strict().safeParse(await c.req.json());if(!input.success)return c.json({error:'Enter an explicit reason for stopping.'},400);return c.json(await stopObligation(db,c.req.param('id'),input.data.reason,c.get('operator').operatorId));});
 return app;
}
