import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { getPlatformProxy } from 'wrangler';
import { createApp, identityBindings } from '../support/app';
import { emailLinkSignIn } from '../support/email-link';
import { identityResponse } from '../../src/core/features/identity';
import { probes } from '../fixtures/prior-auth/probes.mjs';

// tests/fixtures/prior-auth: a store populated by main 8298464 through its own
// HTTP API under `rer dev` (capture.mjs), with each person's answers recorded on
// that code (answers.mjs). Miniflare names the D1 file after wrangler.jsonc's database id.
const FIXTURE = 'tests/fixtures/prior-auth';
const D1_FILE = 'v3/d1/miniflare-D1DatabaseObject/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite';
const ORIGIN = 'https://orbit.test';
const capture = JSON.parse(await readFile(join(FIXTURE, 'capture.json'), 'utf8'));
const recorded = JSON.parse(await readFile(join(FIXTURE, 'answers.json'), 'utf8'));
const FOREIGN_KEYED = ['access_memberships', 'access_invitations', 'access_grants', 'access_collaborators', 'access_form_authorities', 'original_operator_provisions', 'delegation_grants', 'handoff_tasks', 'content_entities', 'opportunities', 'timeline_entries', 'audit_entries', 'owner_bootstrap'];

/** Volatile read times and grant expiries (re-dated below) are not access answers; the capture origin becomes the test origin. */
function normal(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normal);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !['observedAt', 'expiresAt', 'expires_at'].includes(key)).map(([key, item]) => [key, normal(item)]));
  return typeof value === 'string' ? value.replaceAll(capture.origin, ORIGIN) : value;
}

test('AUTH-5 prior-data upgrade keeps operator ids, access rows, invitations, grants and the Slate delegation on Base sign-in', { timeout: 10 * 60_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'orbit-prior-auth-'));
  try {
    const file = join(directory, D1_FILE);
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, gunzipSync(await readFile(join(FIXTURE, 'store.sqlite.gz'))));
    const prior = new DatabaseSync(file, { readOnly: true });
    const before = Object.fromEntries(['operators', ...FOREIGN_KEYED].map(table => [table, prior.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
    const priorSessions = prior.prepare('SELECT id, operator_id, token_hash, expires_at, revoked_at FROM sessions ORDER BY id').all();
    prior.close();
    assert.equal(before.operators.length, 6);

    // The real upgrade: wrangler applies only the migrations this store lacks.
    const applied = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.jsonc', '--persist-to', directory], { env: { ...process.env, CI: '1' }, encoding: 'utf8', timeout: 120_000 });
    for (const name of ['0032_base_identity.sql', '0033_identity_providers.sql', '0034_dependency_links.sql']) assert.match(applied, new RegExp(name));
    assert.doesNotMatch(applied, /0031_crm_move_in/);

    const platform = await getPlatformProxy<{ DB: D1Database }>({ configPath: 'wrangler.jsonc', envFiles: ['tests/support/no-local-settings.env'], persist: { path: join(directory, 'v3') }, remoteBindings: false });
    try {
      const db = platform.env.DB;
      // The capture's credentials carry real lifetimes; keep the remaining lifetime they had at capture so this check does not decay.
      const shift = Date.now() - Date.parse(capture.capturedAt);
      // The restore fence keeps access triggers from counting this fixture adjustment as a policy change.
      await db.batch([db.prepare("INSERT INTO runtime_controls(name,value) VALUES('restore','fixture-expiry')"),
        ...['sessions', 'delegation_grants', 'access_invitations', 'access_grants', 'access_form_authorities'].map(table =>
          db.prepare(`UPDATE ${table} SET expires_at=strftime('%Y-%m-%dT%H:%M:%fZ', unixepoch(expires_at,'subsec') + ?/1000.0, 'unixepoch') WHERE expires_at IS NOT NULL`).bind(shift)),
        db.prepare("DELETE FROM runtime_controls WHERE name='restore'")]);

      // Every operator id and foreign key survives; no row moved.
      // Expiries were re-dated above; every other column of every row is byte-equal.
      const comparable = (rows: Record<string, unknown>[]) => rows.map(({ expires_at: _, ...row }) => row);
      for (const table of ['operators', ...FOREIGN_KEYED])
        assert.deepEqual(comparable((await db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results), comparable(before[table] as Record<string, unknown>[]), table);
      assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
      assert.equal((await db.prepare('SELECT count(*) n FROM sessions WHERE id NOT IN (SELECT session_id FROM identity_sessions)').first('n')), priorSessions.length, 'prior sessions keep their native contract');
      assert.equal(await db.prepare('SELECT count(*) n FROM magic_links').first('n'), 0, 'unused prior links are gone');

      const app = createApp({ database: db, assets: { fetch: async () => new Response('asset') } });
      const ask = async (probe: { path: string; cookie?: string; bearer?: string }, cookie = probe.cookie ? `__Host-orbit_session=${probe.cookie}` : undefined) => {
        const response = await app.request(ORIGIN + probe.path, { headers: { Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}), ...(probe.bearer ? { Authorization: `Bearer ${probe.bearer}` } : {}) } });
        const text = await response.text();
        let body: unknown = null; try { body = JSON.parse(text); } catch {}
        return { status: response.status, body };
      };

      // Old sessions still work, with the same access answers as on the old code.
      for (const probe of probes(capture)) assert.deepEqual(normal(await ask(probe)), normal(recorded[probe.name]), `${probe.name} with the prior session`);

      // A fresh Base email-link sign-in reaches the same operator id and the same grants and field access.
      for (const who of ['owner', 'seller', 'collaborator', 'analyst']) {
        const person = capture.people[who], fresh = await emailLinkSignIn(db, person.email);
        assert.equal(fresh.operator.operatorId, person.id, `${who} keeps their operator id`);
        for (const probe of probes(capture).filter(p => p.name.startsWith(`${who}:`))) assert.deepEqual(normal(await ask(probe, fresh.cookie)), normal(recorded[probe.name]), `${probe.name} after a fresh sign-in`);
      }

      // The removed operator: the prior session is refused and no sign-in link is issued.
      assert.equal((await ask({ path: '/api/v2/access/class', cookie: capture.people.leaver.session })).status, 401);
      await assert.rejects(emailLinkSignIn(db, capture.people.leaver.email), /No sign-in link was sent/);

      // The pending invitation is still accepted, by the invited address, with its original token.
      const pending = await emailLinkSignIn(db, capture.people.pending.email);
      const pendingId = (before.operators as { id: string; email: string }[]).find(row => row.email === capture.people.pending.email)!.id;
      assert.equal(pending.operator.operatorId, pendingId);
      const accepted = await app.request(ORIGIN + '/api/v2/access/invitations/accept', { method: 'POST', headers: { Origin: ORIGIN, Cookie: pending.cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ token: capture.people.pending.invitation }) });
      assert.equal(accepted.status, 200, await accepted.clone().text());
      assert.deepEqual((await ask({ path: `/api/v2/access/workspaces/${capture.workspace}/self` }, pending.cookie)).body, { role: 'guest', access_class: 'collaborator' });
      assert.equal(await db.prepare('SELECT accepted_by FROM access_invitations WHERE id=?').bind(capture.people.pending.invitationId).first('accepted_by'), pendingId);

      // The Slate delegation still authorizes a new handoff write.
      const bearer = (path: string, body?: unknown) => app.request(ORIGIN + '/api/delegation/v1' + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${capture.delegation.bearer}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const target = `opportunities/${capture.opportunityId}/handoffs/after-upgrade`;
      const check = await (await bearer(`/check?target=${encodeURIComponent(target)}`)).json() as { revision: string };
      const audience = await (await bearer(`/audience?operation=orbit.handoff.upsert&target=${encodeURIComponent(target)}`)).json() as { audience?: { audienceRevision: string }; audienceRevision?: string };
      const effect = await bearer('/effects', { operationKey: 'after-upgrade', operation: 'orbit.handoff.upsert', target, expectedRevision: check.revision, expectedAudienceRevision: audience.audience?.audienceRevision ?? audience.audienceRevision, content: { title: 'Upgrade check-in', description: 'Confirm the handoff after the sign-in upgrade', assigneeId: capture.people.seller.id, dueAt: null, status: 'open' } });
      assert.equal(effect.status, 200, await effect.clone().text());

      // A link from the retired engine is cleanly refused: the sign-in page offers a new one.
      const old = await identityResponse(new Request(ORIGIN + '/auth/verify?token=' + 'a'.repeat(64)), identityBindings(db, new Request(ORIGIN)), { ownerClaimed: async () => true });
      assert.equal(old?.status, 303);
      assert.equal(old?.headers.get('location'), '/signin');
    } finally {
      await platform.dispose();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
