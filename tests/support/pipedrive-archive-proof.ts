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
  for(const table of ['crm_import_pipedrive_connections','crm_import_pipedrive_pulls','crm_import_pipedrive_reviews'])assert.equal(await target.db.prepare(`SELECT count(*) n FROM ${table}`).first('n'),0);
 }finally{await target.dispose();}
}
