import {Hono} from 'hono';
import {z} from 'zod';
import type {AppEnvironment} from '../../shared/expansion-contracts';
import type {AnalyticsMetrics} from '../analytics/metrics';
import {Dashboards} from './repository';
import {dashboardSchedule} from './schedules';
import {filtersSchema} from './schema';
export function createDashboardRoutes(metrics:AnalyticsMetrics){
 const app=new Hono<AppEnvironment>(),dashboards=new Dashboards(metrics),id=z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
 app.use('*',async(c,next)=>{c.header('Cache-Control','no-store');await next();});
 app.get('/',async c=>c.json(await dashboards.list(c.get('actor'))));
 app.put('/:id',async c=>c.json(await dashboards.save(c.get('actor'),id.parse(c.req.param('id')),await c.req.json())));
 app.get('/:id',async c=>c.json(await dashboards.read(c.get('actor'),id.parse(c.req.param('id')))));
 app.post('/:id/compute',async c=>c.json(await dashboards.read(c.get('actor'),id.parse(c.req.param('id')),filtersSchema.parse(await c.req.json()))));
 app.get('/:id/definition',async c=>{const d=await dashboards.head(c.get('actor'),id.parse(c.req.param('id')));if(!d.edit)return c.json({error:'Dashboard editing is not permitted.'},403);return c.json({version:d.h.version,definition:d.definition});});
 app.get('/:id/sharing',async c=>c.json(await dashboards.sharing(c.get('actor'),id.parse(c.req.param('id')))));
 app.put('/:id/sharing',async c=>c.json(await dashboards.sharing(c.get('actor'),id.parse(c.req.param('id')),await c.req.json())));
 app.get('/:id/schedule',async c=>c.json(await dashboardSchedule(dashboards,c.get('actor'),id.parse(c.req.param('id')))));
 app.put('/:id/schedule',async c=>c.json(await dashboardSchedule(dashboards,c.get('actor'),id.parse(c.req.param('id')),await c.req.json())));
 app.put('/:id/default',async c=>c.json(await dashboards.setDefault(c.get('actor'),id.parse(c.req.param('id')),z.object({enabled:z.boolean()}).strict().parse(await c.req.json()).enabled)));
 return app;
}
