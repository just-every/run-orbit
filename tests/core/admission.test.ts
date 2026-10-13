import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isolatedDatabase } from '../support/isolated-database';
import { createApp, identityBindings } from '../support/app';
import { identityResponse } from '../../src/core/features/identity';
import { createDependencies } from '../support/dependencies';
import { editorConfigurationResponse } from '../../src/core/features/editor/server';
import type { PlatformBindings } from '../../src/core/platform/assets';

test('first owner claim is one-use and editor grants require the current native owner session', async () => {
  const fixture = await isolatedDatabase();
  try {
    const db = fixture.db;
    const deployment={sourceSha:'test-only-source',fingerprint:'test-only-fingerprint',versionId:'test-only-version'};
    const app = createApp({deployment,database:db, assets:{fetch:async()=>new Response(null,{status:404})}});
    const health=await app.request('https://orbit.example.test/health');
    assert.equal(health.status,200);assert.deepEqual((await health.json()).deployment,deployment);
    const install={...identityBindings(db,new Request('https://orbit.example.test')),OWNER_EMAIL:'owner@example.test',SETUP_TOKEN:'test-only-setup-key-0123456789abcdef'};
    const claim = (token=install.SETUP_TOKEN) => identityResponse(new Request('https://orbit.example.test/auth/bootstrap',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://orbit.example.test','CF-Connecting-IP':'192.0.2.20'},body:JSON.stringify({token,displayName:'Owner'})}),install,{ownerClaimed:async()=>true});
    assert.equal((await claim('wrong-setup-key-0123456789abcdef0123'))!.status,403);
    const claimed=await claim();
    assert.equal(claimed!.status,303);assert.match(claimed!.headers.get('set-cookie')!,/^__Host-orbit_session=/,'the claim signs the owner in');
    assert.equal((await claim())!.status,409);
    const auth = createDependencies(db).auth;
    const owner = await db.prepare('SELECT id FROM operators WHERE setup_owner=1').first<{id:string}>();
    const session = await auth.createSession(owner!.id);
    const bindings = {...install,RER_MANAGEMENT_ORIGIN:'https://management.example.test',RER_INSTALLATION_ID:'test-installation'} as PlatformBindings;
    const request=(cookie='')=>new Request('https://orbit.example.test/api/editor/config',{headers:{Cookie:cookie}});
    const cookie='__Host-orbit_session='+session.token;
    assert.equal((await editorConfigurationResponse(request(),bindings)).status,403);
    const admitted=await editorConfigurationResponse(request(cookie),bindings);
    assert.equal(admitted.status,200); assert.match(admitted.headers.get('Cache-Control')!,/no-store/);
    const grant=await admitted.json() as {config:{managementOrigin:string};expiresAt:number};
    assert.equal(grant.config.managementOrigin,bindings.RER_MANAGEMENT_ORIGIN);assert.ok(grant.expiresAt>Date.now());
    await auth.ensureOperator({id:'test-only-peer',email:'peer@example.test',displayName:'Peer'});
    const peerSession=await auth.createSession('test-only-peer');
    assert.equal((await editorConfigurationResponse(request('__Host-orbit_session='+peerSession.token),bindings)).status,403);
    await auth.revoke(session.id);
    assert.equal((await editorConfigurationResponse(request(cookie),bindings)).status,403);
  } finally { await fixture.dispose(); }
});
