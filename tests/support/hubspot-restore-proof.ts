import assert from 'node:assert/strict';
import {launchFixture} from './launch-fixture';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {json} from './crm-import-flow';
import type {HubSpotConfig} from '../../src/core/features/imports/hubspot/provider';
import policy from '../../scripts/installer/portability-policy.mjs';
/** A destination already holding a token must not keep connected authority after a successful Records restore. */
export async function hubspotRestoreFlow(config:HubSpotConfig){
 const f=await launchFixture();try{
  await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  const app=createApp({database:f.db,sourceSecurity:config.security,captureFetch:config.fetcher,assets:{fetch:async()=>new Response(null,{status:404})}});let session=await createDependencies(f.db).auth.createSession(f.actor);
  const request=(path:string,method='GET',body?:unknown)=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const token='synthetic-orbit-restore';assert.equal((await json(await request('imports/hubspot/connection','POST',{token}))).state,'connected');
  await assert.rejects(policy.validateStaged({db:f.db,tables:{}}),/Disconnect HubSpot before local restore/);
  let exported=await json(await request('records/archive/exports','POST'));
  for(let n=0;n<300&&exported.state!=='ready';n++)exported=await json(await request(`records/archive/exports/${exported.id}/advance`,'POST'));
  assert.equal(exported.state,'ready');const archive=await json(await request(`records/archive/exports/${exported.id}/download`));assert.ok(!JSON.stringify(archive).includes(token));
  await json(await request(`records/archive/exports/${exported.id}/abort`,'POST'));
  let restored=await json(await request('records/archive/imports','POST',{confirmed:true,manifest:archive.manifest}));
  for(const part of archive.parts)await json(await request(`records/archive/imports/${restored.id}/parts/${part.index}`,'PUT',part));
  for(let n=0;n<700&&restored.state!=='complete';n++)restored=await json(await request(`records/archive/imports/${restored.id}/finalize`,'POST',{}));
  assert.equal(restored.state,'complete');session=await createDependencies(f.db).auth.createSession(f.actor);
  const paused=await json(await request('imports/hubspot/connection'));assert.equal(paused.state,'unresolved-setup');assert.match(paused.reason,/paused/);
  assert.equal((await request('imports/hubspot/pulls','POST')).status,409,'Restored source cannot resume without fresh owner connection');
 }finally{await f.dispose();}
}
