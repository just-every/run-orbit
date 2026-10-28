import assert from 'node:assert/strict';
import {captureSourceBoundary} from './capture-source-boundary';
import {eml,unsubscribeMessage,type CaptureFixture} from './capture-fixture';
import {createApp} from './app';
import {createSourceSecurity,payloadHash} from '../../src/core/platform/source-security';
import {signSource} from '../../src/core/features/ingestion/booking-webhooks';
import {createId} from '../../src/core/shared/ids';
const rfc=(minutes:number)=>new Date(Date.now()-minutes*60000).toUTCString().replace('GMT','+0000');
const count=async(db:D1Database,sql:string,...bindings:unknown[])=>Number(await db.prepare(sql).bind(...bindings).first('n'));
export async function refuseCaptureImpersonation(f:CaptureFixture){
 const reply=eml({From:'ana@acme.example',To:'seller@orbit.test',Date:rfc(15),'Message-ID':'<question-1@acme.example>'},'Customer question');
    // Neither a source name nor an old signing credential grants access to capture's replay namespace.
    const ingressSecurity = createSourceSecurity({ ORBIT_ENCRYPTION_KEY: '22'.repeat(32) })!;
    const ingress = createApp({ database: f.db, assets: { fetch: async () => new Response('') }, sourceSecurity: ingressSecurity });
    const signingSecret = 'capture-namespace-test-secret'.repeat(2), now = new Date().toISOString();
    for (const [id, type] of [['legacy-calendar', 'capture'], ['capture-files', 'capture'], ['capture-old-webhook', 'signed_webhook']]) {
      await f.db.prepare('INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at,secret_ciphertext) VALUES(?,?,?,1,?,?,?)')
        .bind(id, id, type, now, now, await ingressSecurity.seal(signingSecret)).run();
      const configured = await ingress.request(`https://orbit.test/api/v1/sources/${id}`, { method: 'PUT', headers: { cookie: f.cookie, origin: 'https://orbit.test', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Signed tool', enabled: true }) });
      assert.equal(configured.status, 403, 'a capture row or reserved ID cannot become a signed source');
      const forged = JSON.stringify({ eventId: await payloadHash('<question-1@acme.example>').then(hash => `message:${hash}`), type: `${id}:note`, subject: 'Forged reply identity', occurredAt: now });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const posted = await ingress.request(`https://orbit.test/api/v1/signals/${id}`, { method: 'POST', headers: { 'X-Orbit-Timestamp': timestamp, 'X-Orbit-Signature': await signSource(signingSecret, `${timestamp}.${forged}`) }, body: forged });
      assert.equal(posted.status, 403, 'a legacy valid secret cannot plant a captured reply identity');
    }
    assert.equal((await ingress.request('https://orbit.test/api/v1/sources/capture-future', { method: 'PUT', headers: { cookie: f.cookie, origin: 'https://orbit.test', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Reserved', enabled: true }) })).status, 403);
    assert.equal(await count(f.db, "SELECT count(*) n FROM signals WHERE subject='Forged reply identity'"), 0);
    assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(f.scheduled).first('state'), 'scheduled');
    for(const id of ['legacy-calendar','capture-files','capture-old-webhook'])await f.db.prepare('DELETE FROM signal_sources WHERE id=?').bind(id).run();
    await captureSourceBoundary(f,reply);
    // Encoded words are display text: a forged display name or Cc never stands in for Ana's address.
    const forged = (headers: Record<string, string>) => eml({ To: 'seller@orbit.test', Subject: 'Re: Proposal for Acme', Date: rfc(14), 'In-Reply-To': f.anaThread, References: f.anaThread, ...headers }, 'We are no longer interested.\nPlease remove me from your list.');
    for (const headers of [{ From: '=?utf-8?q?ana=40acme=2Eexample=2C?= <mallory@evil.example>', 'Message-ID': '<forged-q@evil.example>' }, { From: `=?utf-8?b?${btoa('Ana Ruiz <ana@acme.example>,')}?= <mallory@evil.example>`, 'Message-ID': '<forged-b@evil.example>' }, { From: 'mallory@evil.example', Cc: '=?utf-8?q?ana=40acme=2Eexample=2C?= <other@evil.example>', 'Message-ID': '<forged-cc@evil.example>' }])
      assert.equal(((await (await f.upload([{ name: 'forged.eml', text: forged(headers as Record<string,string>) }])).json()) as { summary: { skipped: number } }).summary.skipped, 1, `${headers.From} is not Ana`);
    assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(f.scheduled).first('state'), 'scheduled');
    assert.equal(await count(f.db, 'SELECT count(*) n FROM capture_proposals WHERE record_id=?', f.ana), 0);
    // Only an operator session reaches capture. A signed source's signature is not authority here.
    const security = createSourceSecurity({ ORBIT_ENCRYPTION_KEY: '22'.repeat(32) })!, secret = 'synthetic-capture-boundary-secret-'.repeat(2), source = createId();
    // The forged signature is deliberately not native operator authority.
    const timestamp = String(Math.floor(Date.now() / 1000)), form = new FormData();
    form.append('files', new File([reply.replace('question-1', 'question-2')], 'signed.eml'));
    const signed = await f.app.request('https://orbit.test/api/v1/capture/imports', { method: 'POST', headers: { origin: 'https://orbit.test', 'X-Orbit-Timestamp': timestamp, 'X-Orbit-Signature': await signSource(secret, `${timestamp}.signed`), authorization: `Bearer ${'ab'.repeat(32)}` }, body: form });
    assert.equal(signed.status, 401);
    assert.equal((await f.upload([{ name: 'cross-site.eml', text: reply }], false, { cookie: f.cookie, origin: 'https://attacker.example' })).status, 403);
    for (const path of ['/api/v1/capture/sources', '/api/v1/capture/proposals']) assert.equal((await f.app.request(`https://orbit.test${path}`)).status, 401);
    const collaborator = createId();
    await f.db.prepare('INSERT INTO access_collaborators(operator_id,invited_at) VALUES(?,?)').bind(collaborator, new Date().toISOString()).run();
    await f.deps.auth.ensureOperator({ id: collaborator, email: 'analyst@collaborator.test', displayName: 'Invited analyst' });
    const restricted = `__Host-orbit_session=${(await f.deps.auth.createSession(collaborator)).token}`;
    assert.equal((await f.upload([{ name: 'collaborator.eml', text: reply }], false, { cookie: restricted, origin: 'https://orbit.test' })).status, 403, 'an invited collaborator cannot capture');
    // SIGNAL-009 stays narrow: the signed signal path cannot write into the capture source.
    const raw = JSON.stringify({ eventId: 'forged', type: 'email.replied', subject: 'Forged', occurredAt: new Date().toISOString(), email: 'ana@acme.example' });
    assert.equal((await f.app.request('https://orbit.test/api/v1/signals/capture-files', { method: 'POST', headers: { 'X-Orbit-Timestamp': timestamp, 'X-Orbit-Signature': await signSource(secret, `${timestamp}.${raw}`) }, body: raw })).status, 403);
    assert.equal(await count(f.db, "SELECT (SELECT count(*) FROM signals WHERE subject='Forged')+(SELECT count(*) FROM capture_items WHERE headers LIKE '%question-2%') AS n"), 0);

}
export async function acceptCaptureStop(f:CaptureFixture){
 const drafts=await count(f.db,'SELECT count(*) n FROM drafts'),outbound=await count(f.db,'SELECT count(*) n FROM outbound_messages'),sends=f.sent.length;
 await f.upload([{name:'unsubscribe.eml',text:unsubscribeMessage()}]);
 const proposals=await (await f.request('/api/v1/capture/proposals')).json() as {proposals:{id:string;kind:string;record_id:string}[]};
 const stop=proposals.proposals.find(p=>p.kind==='do_not_contact'&&p.record_id===f.ana);assert.ok(stop);
 assert.equal((await (await f.request(`/api/v1/records/contact/${f.ana}`)).json() as any).record.contactability,'contactable');
 assert.equal((await f.request(`/api/v1/capture/proposals/${stop.id}/accept`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,200);
 assert.equal((await (await f.request(`/api/v1/records/contact/${f.ana}`)).json() as any).record.contactability,'do_not_contact');
 assert.equal(await count(f.db,'SELECT count(*) n FROM drafts'),drafts);assert.equal(await count(f.db,'SELECT count(*) n FROM outbound_messages'),outbound);assert.equal(f.sent.length,sends);
 assert.equal(await count(f.db,"SELECT count(*) n FROM contacts WHERE contactability='contactable' AND id NOT IN(?,?)",f.ana,f.bob),0,'review grants no sending permission');
}
