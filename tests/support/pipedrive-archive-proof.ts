import {pipedriveNetwork} from './pipedrive-network';
import assert from 'node:assert/strict';
import {launchFixture} from './launch-fixture';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import type {SourceSecurity} from '../../src/core/platform/source-security';
import {json} from './crm-import-flow';
/** Restore the actual exported native document; no connection or review grant may reappear. */
export async function restoredPipedriveAuthority(archive:any,security:SourceSecurity,oldPull:string,oldReview:string){
 const target=await launchFixture();try{
  await target.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(target.actor).run();
  // The destination already has local read authority and a private saved review.
  const network=pipedriveNetwork(),localSession=await createDependencies(target.db).auth.createSession(target.actor);let now=Date.parse('2026-11-01T12:00:00Z');
  const localApp=createApp({database:target.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,pipedriveFetch:network.fetcher,pipedriveNow:()=>now});
  const local=(path:string,method='GET',body?:unknown)=>localApp.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${localSession.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  await json(await local('imports/pipedrive/connection','POST',{token:'synthetic-orbit-restore-credential',confirmedReadOnly:true}));
  let prior=await json(await local('imports/pipedrive/pulls','POST'));
  for(let step=0;step<20&&prior.state!=='ready';step++){if(prior.nextAt)now=Date.parse(prior.nextAt)+1;prior=await json(await local(`imports/pipedrive/pulls/${prior.id}/advance`,'POST'));}
  assert.equal(prior.state,'ready');const priorReview=await json(await local(`imports/pipedrive/pulls/${prior.id}/preview`,'POST',{stages:{'1:101':target.stage,'2:201':target.stage},owners:{'71':target.actor,'72':null}}));assert.ok((await json(await local(`imports/${priorReview.id}`))).rows.length);
  // The CLI policy refuses a destination with live credentials before it can restore.
  const policy=(await import('../../scripts/installer/portability-policy.mjs')).default;
  await assert.rejects(policy.validateStaged({db:target.db,tables:{}}),/Disconnect Pipedrive/);
  assert.equal((await json(await local('imports/pipedrive'))).connected,true);
  let restored=await json(await target.request('records/archive/imports','POST',{confirmed:true,manifest:archive.manifest}));
  for(const part of archive.parts)await json(await target.request(`records/archive/imports/${restored.id}/parts/${part.index}`,'PUT',part));
  for(let step=0;step<700&&restored.state!=='complete';step++)restored=await json(await target.request(`records/archive/imports/${restored.id}/finalize`,'POST',{}));
  assert.equal(restored.state,'complete');
  const session=await createDependencies(target.db).auth.createSession(target.actor),app=createApp({database:target.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security});
  const request=(path:string,method='GET')=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test'}});
  assert.equal((await json(await request('imports/pipedrive'))).connected,false);
  assert.equal((await request('imports/pipedrive/pulls','POST')).status,409);
  assert.equal((await request(`imports/pipedrive/pulls/${oldPull}`)).status,404);
  assert.equal((await request(`imports/${oldReview}`)).status,404);
  assert.equal((await request(`imports/pipedrive/pulls/${prior.id}`)).status,404);assert.equal((await request(`imports/${priorReview.id}`)).status,404);
  await policy.validateStaged({db:target.db,tables:{}});
  for(const table of ['crm_import_pipedrive_connections','crm_import_pipedrive_pulls','crm_import_pipedrive_reviews'])assert.equal(await target.db.prepare(`SELECT count(*) n FROM ${table}`).first('n'),0);
 }finally{await target.dispose();}
}
