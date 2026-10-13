import {Hono} from 'hono';
import {z} from 'zod';
import type {AppEnvironment} from '../../shared/expansion-contracts';
import {FormService} from './service';
export function createFormRoutes(db:D1Database){const app=new Hono<AppEnvironment>(),forms=new FormService(db);
 app.get('/',async c=>c.json(await forms.list(c.get('actor'))));
 app.post('/',async c=>c.json(await forms.save(c.get('actor'),z.object({id:z.string().uuid().optional(),revision:z.number().int().positive().optional(),form:z.unknown(),landing:z.unknown()}).strict().parse(await c.req.json()))));
 app.post('/compile',async c=>c.json(await forms.compile(c.get('actor'),z.object({formId:z.string().uuid(),revision:z.number().int().positive(),reviewedHash:z.string().regex(/^[a-f0-9]{64}$/),slug:z.string().max(80),maxRecords:z.number().int().min(1).max(1000),expiresAt:z.iso.datetime()}).strict().parse(await c.req.json()))));
 app.post('/publications/:id/approve',async c=>c.json(await forms.approve(c.get('actor'),c.req.param('id'),z.object({artifactHash:z.string().regex(/^[a-f0-9]{64}$/),formRevision:z.number().int().positive()}).strict().parse(await c.req.json()))));
 app.post('/publications/:id/publish',async c=>c.json(await forms.publish(c.get('actor'),c.req.param('id'))));
 app.post('/publications/:id/withdraw',async c=>c.json(await forms.withdraw(c.get('actor'),c.req.param('id'))));
 app.get('/publications/:id',async c=>c.json(await forms.reviewPublication(c.get('actor'),c.req.param('id'))));
 app.get('/:id/publications',async c=>c.json(await forms.publications(c.get('actor'),c.req.param('id'))));
 app.get('/:id/submissions',async c=>c.json(await forms.submissions(c.get('actor'),c.req.param('id'))));return app;
}
