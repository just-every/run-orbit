import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthenticatedOperator } from '../identity';
import { RecordError } from '../records/shared';
import { completeSetup } from './repository';

const setupInput = z.object({
  name: z.string().trim().min(1).max(200),
  timezone: z.string().trim().min(1).max(100),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  stages: z.string().max(10_000).transform((value) => value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(100)).min(1).max(100)),
});

export function createSetupRoutes(db: D1Database) {
  const app = new Hono<{ Variables: { operator: AuthenticatedOperator } }>();
  app.post('/', async (context) => {
    // The form works before hydration: a page receives a redirect, a script receives JSON.
    const page = (context.req.header('Accept') ?? '').includes('text/html');
    const fail = (status: 400 | 403 | 409, error: string) => page ? context.redirect(`/setup?${new URLSearchParams({ error })}`, 303) : context.json({ error }, status);
    const body = context.req.header('Content-Type')?.includes('application/json') ? await context.req.json() : await context.req.parseBody();
    const parsed = setupInput.safeParse(body);
    if (!parsed.success) return fail(400, 'Enter a business name, time zone, three-letter currency and at least one pipeline stage.');
    if (new Set(parsed.data.stages).size !== parsed.data.stages.length) return fail(400, 'Use distinct pipeline stage names.');
    try { await completeSetup(db, context.get('operator').operatorId, parsed.data); }
    catch (error) { if (error instanceof RecordError) return fail(error.status === 403 ? 403 : error.status === 409 ? 409 : 400, error.message); throw error; }
    return page ? context.redirect('/app', 303) : context.json({ complete: true });
  });
  return app;
}
