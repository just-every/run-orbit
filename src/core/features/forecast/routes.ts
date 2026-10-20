import {Hono} from 'hono';
import {z} from 'zod';
import type {AppEnvironment} from '../../shared/expansion-contracts';
import {ForecastRepository} from './repository';
import {stageRuleSchema,dealForecastSchema,quotaSchema,forecastPeriodSchema,snapshotSchema} from './schema';
export function createForecastRoutes(db:D1Database){
 const app=new Hono<AppEnvironment>(),repository=new ForecastRepository(db),id=z.string().min(1).max(120);
 app.get('/',async c=>c.json(await repository.read(c.get('actor'))));
 app.post('/stages',async c=>c.json(await repository.setStage(c.get('actor'),stageRuleSchema.parse(await c.req.json())),201));
 app.post('/deals/:id',async c=>c.json(await repository.setDeal(c.get('actor'),id.parse(c.req.param('id')),dealForecastSchema.parse(await c.req.json())),201));
 app.post('/quotas',async c=>c.json(await repository.setQuota(c.get('actor'),quotaSchema.parse(await c.req.json())),201));
 app.post('/preview',async c=>c.json(await repository.preview(c.get('actor'),forecastPeriodSchema.parse(await c.req.json()))));
 app.post('/snapshots',async c=>{const {reviewHash,...period}=snapshotSchema.parse(await c.req.json());return c.json(await repository.saveSnapshot(c.get('actor'),period,reviewHash),201);});
 app.get('/snapshots',async c=>c.json(await repository.snapshots(c.get('actor'))));
 app.get('/snapshots/:id',async c=>c.json(await repository.snapshot(c.get('actor'),id.parse(c.req.param('id')))));
 return app;
}
