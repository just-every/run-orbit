import type { observedCapacityWorker } from '../support/observed-capacity-worker';
import { availablePort } from '../support/available-port';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { isolatedDatabase } from '../support/isolated-database';
import { createDependencies } from '../support/dependencies';
import { readArchiveFile } from '../../src/core/shared/archive-file';
import { identityVarArgs } from '../support/worker-identity.mjs';
const base = '/api/v1/records/archive';
export async function verifyArchiveCapacity(origin: string, cookie: string, readSource: <T>(read: (db: D1Database) => Promise<T>) => Promise<T>, actor: string, observation: Awaited<ReturnType<typeof observedCapacityWorker>>) {
    const directory = await mkdtemp(join(tmpdir(), 'orbit-capacity-archive-'));
    let target: Awaited<ReturnType<typeof isolatedDatabase>> | undefined;
    // Each persisted D1 has one workerd owner at a time. Reopen bindings only
    // after its HTTP worker exits, including after restore replaces tables.
    let worker: ReturnType<typeof spawn> | undefined;
    const httpHeaderTimings: number[] = [];
    let targetCookie = '';
    let targetLogs = '';
    let failed = false;
    // HTTP timings include route work and observer exchanges. The 30-second D1
    // ceiling is checked per native query/entire batch after every Worker closes.
    const request = async (host: string, session: string, path: string, method = 'GET', body?: unknown) => { const started = performance.now(), response = await fetch(host + base + path, { method, headers: { cookie: session, origin: host, 'content-type': 'application/json' }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) }); httpHeaderTimings.push(performance.now() - started); assert.ok(response.ok, `${path}: ${response.status} ${response.ok ? '' : await response.text()}`); return response; };
    async function snapshot(host: string, session: string, file: string) { const started = performance.now(); let status = await (await request(host, session, '/exports', 'POST', {})).json() as any; const snapshotHttpHeadersAndJsonMs = performance.now() - started;
        // The first readback must match the committed acknowledgement before
        // any advance mutates the snapshot job. No failed request is retried.
        const committed = await (await request(host, session, `/exports/${status.id}`)).json() as any;
        assert.deepEqual(committed, status, 'Created snapshot status must match its durable readback');
        status = committed;
        while (status.state === 'preparing')
        status = await (await request(host, session, `/exports/${status.id}/advance`, 'POST', {})).json(); assert.equal(status.state, 'ready'); const response = await request(host, session, `/exports/${status.id}/download`); await pipeline(Readable.fromWeb(response.body as any), createWriteStream(file, { flags: 'wx', mode: 0o600 })); return { id: status.id, manifest: status.manifest, snapshotHttpHeadersAndJsonMs, bytes: (await stat(file)).size }; }
    async function* entries(file: string) { yield* readArchiveFile(Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>); }
    async function hashes(file: string) { const hashes = new Map<string, ReturnType<typeof createHash>>(), counts: Record<string, number> = {}; let audits = 0; for await (const entry of entries(file)) {
        if (entry.kind !== 'part')
            continue;
        for (const record of entry.part.records) {
            if (record.table === 'audit_entries' && record.row.action === 'data.restored') {
                audits++;
                continue;
            }
            const hash = hashes.get(record.table) ?? createHash('sha256');
            hash.update(JSON.stringify(record.row) + '\n');
            hashes.set(record.table, hash);
            counts[record.table] = (counts[record.table] ?? 0) + 1;
        }
    } return { tables: Object.fromEntries([...hashes].map(([name, hash]) => [name, { count: counts[name], sha256: hash.digest('hex') }])), audits }; }
    try {
        const first = await snapshot(origin, cookie, join(directory, 'source.json'));
        console.log(`Archive source: ${first.manifest.rows} rows, ${first.manifest.parts} parts, ${first.bytes} bytes, snapshot HTTP headers and JSON ${first.snapshotHttpHeadersAndJsonMs.toFixed(1)}ms`);
        const segmentCount = await readSource(async db => (await db.prepare('SELECT count(*) AS n FROM archive_part_segments WHERE job_id=?').bind(first.id).first<{n: number}>())!.n);
        assert.ok(Math.ceil(segmentCount / 16) + 100 < 1000, 'Full download exceeds paid D1 query limit including authentication');
        target = await isolatedDatabase();
        const deps = createDependencies(target.db), targetActor = '00000000000000000000000009';
        await deps.auth.ensureOperator({ id: targetActor, email: 'target-capacity@example.test', displayName: 'Target administrator' });
        targetCookie = `__Host-orbit_session=${(await deps.auth.createSession(targetActor)).token}`;
        const port = Number(process.env.ARCHIVE_CAPACITY_PORT ?? await availablePort()), targetOrigin = `http://127.0.0.1:${port}`;
        await target.close();
        async function startWorker() {
        worker = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--config', observation.configPath, '--local', '--persist-to', target!.directory, '--port', String(port), '--inspector-port', '0', ...identityVarArgs(targetOrigin)], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' } });
        let logs = ''; targetLogs = '';
        observation.attach(worker, 'restored', line => { logs = (logs + line + '\n').slice(-65536); targetLogs = logs; });
        for (let i = 0; i < 100; i++) {
            try {
                if ((await fetch(targetOrigin + '/health')).ok)
                    break;
            }
            catch { }
            if (i === 99)
                throw new Error(logs);
            await new Promise(r => setTimeout(r, 100));
        }
        }
        async function stopWorker() { if (worker) { await observation.stop(worker); worker = undefined; } }
        await startWorker();
        let status: any;
        for await (const entry of entries(join(directory, 'source.json'))) {
            if (entry.kind === 'manifest')
                status = await (await request(targetOrigin, targetCookie, '/imports', 'POST', { confirmed: true, manifest: entry.manifest })).json();
            else
                status = await (await request(targetOrigin, targetCookie, `/imports/${status.id}/parts/${entry.part.index}`, 'PUT', entry.raw)).json();
        }
        const restoreStarted = performance.now();
        let advances = 0;
        while (status.state === 'uploading' || status.state === 'restoring') {
            status = await (await request(targetOrigin, targetCookie, `/imports/${status.id}/finalize`, 'POST', {})).json();
            if (++advances % 500 === 0)
                console.log(`Archive restoring: ${advances} bounded steps, phase ${status.phase}, table ${status.completedTables}`);
        }
        assert.equal(status.state, 'complete');
        const restoreMs = performance.now() - restoreStarted;
        assert.equal((await fetch(targetOrigin + '/api/v1/records/contact', { headers: { cookie: targetCookie } })).status, 401);
        await stopWorker();
        await target.reopen();
        targetCookie = `__Host-orbit_session=${(await createDependencies(target.db).auth.createSession(actor)).token}`;
        await target.close();
        await startWorker();
        const second = await snapshot(targetOrigin, targetCookie, join(directory, 'restored.json')), before = await hashes(join(directory, 'source.json')), after = await hashes(join(directory, 'restored.json'));
        assert.deepEqual(after.tables, before.tables);
        assert.equal(after.audits, before.audits + 1);
        await stopWorker();
        await target.reopen();
        assert.deepEqual(await target.db.prepare('SELECT input_tokens,output_tokens,cached_input_tokens,estimated_cost FROM ai_calls').first(), { input_tokens: 9876, output_tokens: 5432, cached_input_tokens: 1234, estimated_cost: 0.987 });
        assert.equal((await target.db.prepare('PRAGMA foreign_key_check').all()).results.length, 0);
        return { source: first, restored: second, restoreMs, advanceRequests: advances, segments: segmentCount, downloadSegmentQueries: Math.ceil(segmentCount / 16) + 1, downloadFinalValidityQueries: 1, maxHttpHeadersMs: Math.max(...httpHeaderTimings), exactDomainHashes: before.tables, additionalRestoreAudits: 1, aiUsagePreserved: true };
    }
    catch (error) {
        failed = true;
        throw error;
    }
    finally {
        if (worker) await observation.stop(worker);
        if (failed) console.error('Target archive Worker failure log:\n' + targetLogs.slice(-65536));
        await target?.dispose();
        await rm(directory, { recursive: true, force: true });
    }
}
