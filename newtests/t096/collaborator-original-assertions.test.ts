import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,signIn,nativeRecord} from './fixture';
import {legacyDatabase} from '../../src/core/features/access/legacy-database';
import {createApp} from '../../tests/support/app';

test('selected original invitation and revocation assertions use an explicit collaborator with native-full positives',async()=>{const f=await fixture();try{const invite=await f.admin.invite(await f.context(),{email:'seller@foundation.test',role:'seller',expiresAt:new Date(Date.now()+86400000).toISOString()}),other=(await signIn(f.db,'seller@foundation.test')).operator;
 assert.deepEqual(await f.access.listWorkspaces(other),[]);await assert.rejects(f.access.resolveOperatorContext(other,'workspace','denied'));
 await assert.rejects(f.admin.accept(f.operator,invite.token));const seller=await f.admin.accept(other,invite.token);await assert.rejects(f.admin.accept(other,invite.token));assert.equal((await f.access.listWorkspaces(other)).length,1);
 const first={result:await nativeRecord(f,'company',{name:'Original private business'})},stale=legacyDatabase(f.db,await f.context()),query=stale.prepare('SELECT count(*) AS n FROM companies');await f.admin.setMembership(await f.context(),other.operatorId,'seller','removed');await assert.rejects(query.first());await assert.rejects(f.access.refreshContext(seller));
 await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=? WHERE id=? AND kind='company'").bind(f.operator.operatorId,first.result.ref.id).run();await f.access.authorizeLegacy(f.operator,'legacy');assert.equal((await f.db.prepare('SELECT name FROM companies WHERE id=?').bind(first.result.ref.id).first<{name:string}>())?.name,'Original private business');assert.equal((await f.graph.getRecord(await f.context(),first.result.ref,['name'])).fields.name,'Original private business');
 }finally{await f.close();}});

test('selected original Hono identity and foreign-scope assertions run through real native cookie authentication',async()=>{const f=await fixture();try{const app=createApp({database:f.db,assets:{fetch:async()=>{throw new Error('API proof does not request assets');}}}),headers={Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'};
 const created=await app.request('https://orbit.test/api/v1/records/company',{method:'POST',headers,body:JSON.stringify({name:'Legacy route'})});assert.equal(created.status,201,await created.text());
 const list=await app.request('https://orbit.test/api/v2/workspaces/workspace/records?kind=company',{headers});assert.equal(list.status,200);assert.equal((await list.json() as any).items[0].fields.name,'Legacy route');
 const forged=await app.request('https://orbit.test/api/v2/workspaces/another-workspace/records?kind=company',{headers:{...headers,'x-operator-id':f.operator.operatorId,'x-workspace-id':'workspace'}});assert.equal(forged.status,403);
 const unauthenticated=await app.request('https://orbit.test/api/v2/workspaces/workspace/records?kind=company',{headers:{'x-operator-id':f.operator.operatorId}});assert.equal(unauthenticated.status,401);
 await f.db.prepare('UPDATE sessions SET revoked_at=? WHERE id=?').bind(new Date().toISOString(),f.operator.sessionId).run();const revoked=await app.request('https://orbit.test/api/v1/records/company',{headers});assert.equal(revoked.status,401);
 }finally{await f.close();}});
