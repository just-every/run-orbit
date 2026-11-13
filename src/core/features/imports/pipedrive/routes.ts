import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../../identity';
import {RecordError} from '../../records/shared';
import {PipedrivePull} from './checkpoint';
import type {PipedriveConfig} from './connection';
export function createPipedriveRoutes(db:D1Database,config:PipedriveConfig){const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((error,c)=>c.json({error:error instanceof RecordError?error.message:'Pipedrive operation stopped; no source checkpoint advanced.'},error instanceof RecordError?error.status:409));
 const repo=(c:any)=>new PipedrivePull(db,c.get('operator'),config);
 app.get('/',async c=>c.json(await repo(c).status()));
 app.post('/connection',async c=>{const value=z.object({token:z.string().trim().min(1).max(4096).regex(/^[^\s\x00-\x1f]+$/),confirmedReadOnly:z.literal(true)}).strict().safeParse(await c.req.json());if(!value.success)return c.json({error:'Supply a read-only OAuth access token and confirm this connection.'},400);return c.json(await repo(c).connect(value.data.token));});
 app.delete('/connection',async c=>c.json(await repo(c).disconnect()));
 app.post('/pulls',async c=>c.json(await repo(c).start()));
 app.get('/pulls/:id',async c=>c.json(await repo(c).statusPull(c.req.param('id'))));
 app.post('/pulls/:id/advance',async c=>c.json(await repo(c).advance(c.req.param('id'))));
 app.post('/pulls/:id/preview',async c=>{const value=z.object({stages:z.record(z.string().max(200),z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/)),owners:z.record(z.string().max(200),z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/).nullable())}).strict().safeParse(await c.req.json());if(!value.success)return c.json({error:'Review source stages and contact and company owners before preview.'},400);return c.json(await repo(c).preview(c.req.param('id'),value.data));});return app;
}
