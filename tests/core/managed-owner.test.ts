import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {agentDoorProof} from '../support/agent-door-proof';
import {businessSetupDefaults} from '../../src/core/features/setup/business';
import {orbitBusinessSettings} from '../../src/core/features/agent-door';
import {createApp} from '../support/app';
import {readSetup} from '../../src/core/features/setup/repository';
import type {PlatformBindings} from '../../src/core/platform/assets';
import {identityResponse, operatorFromRequest} from '../../src/core/features/identity';

test('Managed owner claim verifies RER authority and creates the native owner/session exactly once', async () => {
  const fixture = await isolatedDatabase();
  try {
    const origin = 'https://orbit.example.test', issuer = 'https://rer.example.test';
    const keys = await crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']);
    const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey);
    const bindings = {DB: fixture.db, ASSETS: {fetch: async () => new Response('asset')} as Fetcher,
      AUTH_ORIGIN: origin, OWNER_EMAIL: 'owner@example.test', SESSION_SECRET: 's'.repeat(64), SETUP_TOKEN: 't'.repeat(64),
      RER_OWNER_CLAIM_ISSUER: issuer, RER_OWNER_CLAIM_INSTALLATION_ID: 'orbit-managed',
      RER_OWNER_CLAIM_APP_ORIGIN: origin, RER_OWNER_CLAIM_PUBLIC_KEYS: JSON.stringify({test: publicKey})};
    const options = {ownerClaimed: async () => Boolean(await fixture.db.prepare('SELECT 1 FROM owner_bootstrap').first())};
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const signed = async (overrides = {}) => {
      const now = Math.floor(Date.now() / 1000);
      const body = `${encode({alg: 'ES256', typ: 'rer-owner-claim+jwt', kid: 'test'})}.${encode({v: 1, iss: issuer, aud: origin, installationId: 'orbit-managed', email: bindings.OWNER_EMAIL, jti: crypto.randomUUID(), iat: now, exp: now + 300, ...overrides})}`;
      return body + '.' + Buffer.from(await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, keys.privateKey, new TextEncoder().encode(body))).toString('base64url');
    };
    const post = (token: string, from = origin) => identityResponse(new Request(origin + '/auth/owner-claim', {
      method: 'POST', headers: {Origin: from, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1'},
      body: JSON.stringify({token, displayName: 'Morgan Lee', returnTo: '/setup'}),
    }), bindings, options);
    const page = await identityResponse(new Request(origin + '/auth/owner-claim'), bindings, options);
    assert.equal(page!.status, 200);
    assert.equal(page!.headers.get('set-cookie'), null, 'confirmation GET is inert');
    assert.equal((await post(await signed(), issuer))!.status, 403, 'foreign POST cannot claim');
    assert.equal((await post(await signed({email: 'other@example.test'})))!.status, 403);
    assert.equal((await post(await signed({exp: Math.floor(Date.now() / 1000) - 1})))!.status, 403);
    assert.equal(await fixture.db.prepare('SELECT count(*) n FROM owner_bootstrap').first('n'), 0);
    const token = await signed(), responses = await Promise.all([post(token), post(token)]);
    assert.deepEqual(responses.map(response => response!.status).sort(), [303, 409]);
    const claimed = responses.find(response => response!.status === 303)!;
    assert.equal(claimed!.headers.get('location'), '/setup');
    const cookie = claimed!.headers.get('set-cookie')!.split(';')[0]!;
    const owner = await operatorFromRequest(new Request(origin + '/app', {headers: {Cookie: cookie}}), bindings);
    assert.equal(owner?.email, bindings.OWNER_EMAIL);
    assert.equal(await fixture.db.prepare('SELECT count(*) n FROM operators WHERE setup_owner=1').first('n'), 1);
    // Business setup uses only deployment bindings or an authenticated signed document.
    const configured = {...bindings, WORKSPACE_NAME:'Configured Business', OWNER_NAME:'Configured owner', WORKSPACE_TIMEZONE:'UTC'} as unknown as PlatformBindings;
    assert.deepEqual(await businessSetupDefaults(configured), {name:'Configured Business',ownerName:'Configured owner',timezone:'UTC',brandColor:undefined});
    assert.equal((await businessSetupDefaults({...bindings,BRAND_COLOR:'red',WORKSPACE_TIMEZONE:'Invalid/Zone'} as PlatformBindings)).brandColor,undefined);
    assert.equal((await businessSetupDefaults({...bindings,WORKSPACE_TIMEZONE:'Invalid/Zone'} as PlatformBindings)).timezone,undefined);
    const trust = {v:1,issuer,audience:origin,subject:'orbit-managed',email:bindings.OWNER_EMAIL,keys:{test:publicKey}};
    const managed = {...configured,RER_BUSINESS_TRUST:JSON.stringify(trust)};
    const now = Math.floor(Date.now()/1000);
    const payload = {v:1,iss:issuer,aud:origin,sub:'orbit-managed',business:'business-test',email:bindings.OWNER_EMAIL,jti:crypto.randomUUID(),iat:now,exp:now+300,rev:1,values:{display_name:'Harbour Business',owner_name:'Hollis Reed',timezone:'America/New_York',brand_color:'#2468ac'},logo:null,team:null};
    const message = `${encode({alg:'ES256',typ:'rer-business-settings+jwt',kid:'test'})}.${encode(payload)}`;
    const signature = Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,new TextEncoder().encode(message))).toString('base64url');
    const settings = orbitBusinessSettings(managed);
    const deliver = (settingsToken:string) => settings.handle(new Request(origin+'/api/rer/business-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:settingsToken})}));
    assert.equal((await deliver(message+'.'+signature.slice(0,-5)+'wrong'))!.status,403);
    assert.equal((await deliver(message+'.'+signature))!.status,200);
    const business = await businessSetupDefaults(managed);
    assert.deepEqual(business,{name:'Harbour Business',ownerName:'Hollis Reed',timezone:'America/New_York',brandColor:'#2468ac'});
    const app = createApp({database:fixture.db,assets:{fetch:async()=>new Response('asset')}});
    const form = {brandColor:business.brandColor!,ownerName:business.ownerName!,name:business.name!,timezone:business.timezone!,currency:'USD',stages:'Qualified\nProposal'};
    const finish = (input:typeof form, sessionCookie=cookie) => app.request(origin+'/api/v1/setup',{method:'POST',headers:{Cookie:sessionCookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)});
    assert.equal((await finish(form,'' )).status,401);
    assert.equal((await app.request(origin+'/api/v1/setup',{method:'POST',headers:{Cookie:cookie,Origin:issuer,'Content-Type':'application/json'},body:JSON.stringify(form)})).status,403);
    assert.equal((await finish({...form,brandColor:'red'})).status,400);
    assert.equal((await finish({...form,brandColor:''})).status,400);
    assert.equal((await finish({...form,currency:''})).status,400);
    assert.equal((await finish({...form,stages:''})).status,400);
    const resign = async (changes:Record<string,unknown>) => {
      const body = `${encode({alg:'ES256',typ:'rer-business-settings+jwt',kid:'test'})}.${encode({...payload,jti:crypto.randomUUID(),rev:2,...changes})}`;
      return body+'.'+Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,new TextEncoder().encode(body))).toString('base64url');
    };
    for (const changes of [{aud:issuer},{sub:'foreign-installation'},{email:'foreign@example.test'},{values:{brand_color:'red'}},{values:{timezone:'Invalid/Zone'}}]) {
      assert.equal((await deliver(await resign(changes)))!.status,403);
    }
    assert.deepEqual(await businessSetupDefaults(managed),business,'refused documents change no defaults');
    const nullInput = await app.request(origin+'/api/v1/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:'null'});
    assert.equal(nullInput.status,400);
    const empty = await finish({...form,name:'  '});
    assert.equal(empty.status,400);assert.deepEqual(await empty.json(),{error:'Enter your business name'});
    const htmlEmpty = await app.request(origin+'/api/v1/setup',{method:'POST',headers:{Cookie:cookie,Origin:origin,Accept:'text/html','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...form,name:''}).toString()});
    assert.equal(htmlEmpty.status,303);
    assert.equal(new URL(htmlEmpty.headers.get('location')!,origin).searchParams.get('error'),'Enter your business name');
    assert.equal((await readSetup(fixture.db,owner!.operatorId)).complete,false);
    assert.equal((await finish({...form,name:'Owner chosen Business',ownerName:'Owner chosen name',timezone:'Europe/Paris',brandColor:'#813fa8'})).status,200);
    assert.deepEqual(await fixture.db.prepare("SELECT name,timezone FROM workspace_settings WHERE id='workspace'").first(),{name:'Owner chosen Business',timezone:'Europe/Paris'});
    assert.equal(await fixture.db.prepare('SELECT display_name FROM operators WHERE id=?').bind(owner!.operatorId).first('display_name'),'Owner chosen name');
    assert.equal((await readSetup(fixture.db,owner!.operatorId)).complete,true);
    assert.equal((await finish(form)).status,200);
    assert.equal(await fixture.db.prepare("SELECT name FROM workspace_settings WHERE id='workspace'").first('name'),'Owner chosen Business','repeat setup never overwrites the owner choice');
    assert.equal((await deliver(await resign({values:{display_name:'Updated Business',owner_name:'Updated owner',timezone:'Asia/Tokyo',brand_color:'#11aa33'}})))!.status,200);
    assert.equal((await businessSetupDefaults(managed)).brandColor,'#813fa8','later signed refresh preserves native owner accent');
    assert.deepEqual(await fixture.db.prepare("SELECT name,timezone FROM workspace_settings WHERE id='workspace'").first(),{name:'Owner chosen Business',timezone:'Europe/Paris'});
    assert.equal(await fixture.db.prepare('SELECT display_name FROM operators WHERE id=?').bind(owner!.operatorId).first('display_name'),'Owner chosen name');
    const direct = await identityResponse(new Request(origin + '/auth/bootstrap', {
      method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1'},
      body: JSON.stringify({token: bindings.SETUP_TOKEN, displayName: 'Replacement', returnTo: '/setup'}),
    }), bindings, options);
    assert.equal(direct!.status, 409);
    assert.equal((await direct!.json() as {error: string}).error, 'already_initialized');
  } finally { await fixture.dispose(); }
  await agentDoorProof();
});
