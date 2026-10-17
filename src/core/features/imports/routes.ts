import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthenticatedOperator } from '../identity';
import { RecordError } from '../records/shared';
import { importInput } from './contracts';
import { ImportRepository } from './repository';
export function createImportRoutes(db:D1Database){const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((error,c)=>c.json({error:error instanceof RecordError?error.message:`Import stopped: ${error.message}`},error instanceof RecordError?error.status:409));
 const repo=(c:any)=>new ImportRepository(db,c.get('operator'));
 app.get('/',async c=>c.json({imports:await repo(c).list()}));
 app.post('/dry-run',async c=>{const parsed=importInput.safeParse(await c.req.json());if(!parsed.success)return c.json({error:'Choose supported CSV files, a source account and explicit column mappings.',details:parsed.error.issues.map(i=>i.message)},400);return c.json(await repo(c).dryRun(parsed.data));});
 app.get('/owners',async c=>c.json(await repo(c).owners()));
 app.get('/:id',async c=>c.json(await repo(c).status(c.req.param('id'))));
 app.post('/:id/apply',async c=>{const parsed=z.object({fingerprint:z.string().regex(/^[a-f0-9]{64}$/),confirmed:z.literal(true)}).strict().safeParse(await c.req.json());if(!parsed.success)return c.json({error:'Review the dry run and confirm its exact result.'},400);return c.json(await repo(c).apply(c.req.param('id'),parsed.data.fingerprint));});
 app.post('/:id/undo',async c=>{if((await c.req.json()).confirmed!==true)return c.json({error:'Confirm undo of this import.'},400);return c.json(await repo(c).undo(c.req.param('id')));});
 return app;
}
