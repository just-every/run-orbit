import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnvironment, GraphPort } from '../../shared/expansion-contracts';
import { AnalyticsMetrics } from './metrics';
import { ensureOpenOpportunitiesDefinition, OPEN_OPPORTUNITIES_REPORT_ID, previewOpenOpportunities, saveOpenOpportunities } from './built-in-report';
import { shareInput } from './report-shares';

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const sharing = z.object({ audience: z.enum(['private', 'operators', 'workspace']), operatorIds: z.array(z.string()).max(200) }).strict();

export function createAnalyticsReportRoutes(metrics: AnalyticsMetrics, graph: Pick<GraphPort,'searchRecords'>) {
  const app = new Hono<AppEnvironment>();

  app.get('/metrics',async c=>c.json({items:await metrics.list(c.get('actor'))}));
  app.post('/metrics',async c=>{const input=z.object({id:z.string(),version:z.number().int().positive(),definition:z.unknown(),sharing:sharing.optional()}).strict().parse(await c.req.json());return c.json(await metrics.define(c.get('actor'),input.id,input.version,input.definition,input.sharing));});
  app.post('/metrics/:id/snapshots',async c=>{const input=z.object({version:z.number().int().positive(),from:z.iso.datetime({offset:true}),through:z.iso.datetime({offset:true}),reviewHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(await c.req.json());return c.json(await metrics.compute(c.get('actor'),c.req.param('id'),input.version,input.from,input.through,undefined,input.reviewHash));});
  app.get('/snapshots/:id',async c=>c.json(await metrics.read(c.get('actor'),c.req.param('id'))));
  app.get('/snapshots/:id/export',async c=>{const result=await metrics.read(c.get('actor'),c.req.param('id'));return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Content-Disposition':'attachment; filename="orbit-report.json"'}});});
  app.post('/metrics/templates/open-opportunities', async c => {
    c.header('Cache-Control', 'no-store');
    return c.json(await ensureOpenOpportunitiesDefinition(metrics, c.get('actor')));
  });

  app.post('/metrics/templates/open-opportunities/preview', async c => {
    c.header('Cache-Control', 'no-store');
    const input = z.object({ version: z.number().int().positive() }).strict().parse(await c.req.json());
    return c.json(await previewOpenOpportunities(metrics, graph, c.get('actor'), input.version));
  });

  app.post('/metrics/templates/open-opportunities/save', async c => {
    c.header('Cache-Control', 'no-store');
    const input = z.object({ version: z.number().int().positive(), reviewHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(await c.req.json());
    return c.json(await saveOpenOpportunities(metrics, graph, c.get('actor'), input.version, input.reviewHash));
  });

  app.get('/metrics/:id/versions/:version/snapshots', async c => {
    c.header('Cache-Control', 'no-store');
    return c.json(await metrics.listSnapshots(c.get('actor'), c.req.param('id'), z.coerce.number().int().positive().parse(c.req.param('version'))));
  });

  app.post('/metrics/:id/preview', async c => {
    c.header('Cache-Control', 'no-store');
    const input = z.object({ version: z.number().int().positive(), from: z.iso.datetime({offset:true}), through: z.iso.datetime({offset:true}) }).strict().parse(await c.req.json());
    return c.json(await metrics.preview(c.get('actor'), c.req.param('id'), input.version, input.from, input.through));
  });

  // REPORT-001 sales suite: built-in definitions, monthly previews and saved results, and report sharing.
  app.get('/reports/suite', async c => {
    c.header('Cache-Control', 'no-store');
    return c.json(await metrics.sales.suite(c.get('actor')));
  });

  app.post('/reports/suite/:template', async c => {
    c.header('Cache-Control', 'no-store');
    return c.json(await metrics.sales.ensureBuiltIn(c.get('actor'), c.req.param('template')));
  });

  app.post('/reports/:id/preview', async c => {
    c.header('Cache-Control', 'no-store');
    const input = z.object({ version: z.number().int().positive(), from: month, through: month }).strict().parse(await c.req.json());
    return c.json(await metrics.sales.preview(c.get('actor'), c.req.param('id'), input.version, input.from, input.through));
  });

  app.post('/reports/:id/snapshots', async c => {
    c.header('Cache-Control', 'no-store');
    const input = z.object({ version: z.number().int().positive(), from: month, through: month, reviewHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(await c.req.json());
    return c.json(await metrics.sales.save(c.get('actor'), c.req.param('id'), input.version, input.from, input.through, input.reviewHash));
  });

  app.delete('/reports/:id',async c=>c.json(await metrics.sales.remove(c.get('actor'),z.string().regex(/^[a-z0-9_-]{1,100}$/).parse(c.req.param('id')))));

  app.get('/reports/:id/sharing', async c => {
    c.header('Cache-Control', 'no-store');
    const id = c.req.param('id'), context = await metrics.permit(c.get('actor'), 'analytics.read', id);
    await metrics.checkSources(context, await metrics.sales.shares.assertVisible(context, id));
    return c.json(await metrics.sales.shares.describe(context, id));
  });

  app.put('/reports/:id/sharing', async c => {
    c.header('Cache-Control', 'no-store');
    const id = c.req.param('id'), input = shareInput.parse(await c.req.json()), context = await metrics.permit(c.get('actor'), 'analytics.read', id);
    await metrics.sales.shares.update(context, id, input);
    return c.json(await metrics.sales.shares.describe(context, id));
  });

  return app;
}

export { OPEN_OPPORTUNITIES_REPORT_ID };
