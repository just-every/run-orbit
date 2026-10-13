import {recoverTerminalImports} from './archive-terminal-recovery';
import {ArchiveExportCreationError,ArchiveExportConflictError} from './archive-export-recovery';
import {ArchiveImportCreationError} from './archive-import-recovery';
import {foldExportProfile} from './archive-fold-profile';
import {transferManifestSchema} from './archive-fold-validation';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthenticatedOperator } from '../identity';
import { ArchiveExportRepository } from './archive-export';
import { ArchiveImportRepository } from './archive-import';
import { ARCHIVE_PART_BYTES, manifestSchema } from './archive-schema';
import { RecordError } from './shared';
export function createArchiveRoutes(db: D1Database) {
    const app = new Hono<{
        Variables: {
            operator: AuthenticatedOperator;
        };
    }>(), imports = new ArchiveImportRepository(db,true), exports = new ArchiveExportRepository(db,foldExportProfile);
    app.onError((e, c) => e instanceof SyntaxError ? c.json({ error: 'Provide valid JSON.' }, 400) : (e instanceof ArchiveImportCreationError||e instanceof ArchiveExportCreationError||e instanceof ArchiveExportConflictError) ? c.json({error:e.message,archiveJobId:e.archiveJobId,...(e instanceof ArchiveExportConflictError?{code:'archive_export_active'}:{})},e.status) : e instanceof RecordError ? c.json({ error: e.message }, e.status) : c.json({ error: 'Archive operation failed. The operation remains resumable; no completion was confirmed.' }, 500));
    app.use('*', async (c, next) => { const id = c.req.param('id'); if (id && !/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id))
        return c.json({ error: 'Invalid archive ID.' }, 400); await next(); });
    app.get('/exports',async(c)=>c.json({jobs:await exports.unfinished(c.get('operator').operatorId)}));
    app.post('/exports', async (c) => {const actor=c.get('operator').operatorId;await recoverTerminalImports(db,actor);try{return c.json(await exports.create(actor),201);}catch(error){if(error instanceof RecordError&&error.status===409){const [active]=await exports.unfinished(actor);if(active)throw new ArchiveExportConflictError(active.id);}throw error;}});
    app.get('/exports/:id', async (c) => c.json(await exports.status(c.req.param('id'), c.get('operator').operatorId)));
    app.post('/exports/:id/advance', async (c) => c.json(await exports.advance(c.req.param('id'), c.get('operator').operatorId)));
    app.post('/exports/:id/abort', async (c) => c.json(await exports.abort(c.req.param('id'), c.get('operator').operatorId)));
    app.get('/exports/:id/download', async (c) => exports.download(c.req.param('id'), c.get('operator').operatorId));
    app.get('/imports',async(c)=>c.json({jobs:await imports.unfinished(c.get('operator').operatorId)}));
    app.post('/imports', async (c) => { const parsed = z.object({ confirmed: z.literal(true), manifest: transferManifestSchema }).strict().safeParse(await c.req.json()); if (!parsed.success)
        return c.json({ error: 'Confirm a valid archive manifest before restoring.' }, 400); const actor=c.get('operator').operatorId;await recoverTerminalImports(db,actor);return c.json(await imports.create(parsed.data.manifest,actor),201); });
    app.get('/imports/:id', async (c) => c.json(await imports.status(c.req.param('id'), c.get('operator').operatorId)));
    app.put('/imports/:id/parts/:index', async (c) => { if (!/^\d+$/.test(c.req.param('index')) || !Number.isSafeInteger(Number(c.req.param('index'))))
        return c.json({ error: 'Invalid archive part index.' }, 400); const text = await c.req.text(); if (new TextEncoder().encode(text).length > ARCHIVE_PART_BYTES)
        return c.json({ error: 'Archive part exceeds 16 MiB.' }, 413); return c.json(await imports.upload(c.req.param('id'), Number(c.req.param('index')), JSON.parse(text), c.get('operator').operatorId)); });
    app.post('/imports/:id/finalize', async (c) => c.json(await imports.advance(c.req.param('id'), c.get('operator').operatorId)));
    app.post('/imports/:id/abort', async (c) => c.json(await imports.abort(c.req.param('id'), c.get('operator').operatorId)));
    return app;
}
