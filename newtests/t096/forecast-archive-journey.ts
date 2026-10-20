import assert from 'node:assert/strict';
import {fixture,signIn} from './fixture';
import {archiveHttp,httpArchive,httpRestore} from './archive-http-proof';
import {createApp} from '../../tests/support/app';
import {isolatedDatabase} from '../../tests/support/isolated-database';
import {localArchiveRoundTrip} from '../../tests/support/capture-privacy-archive';
import type {ForecastSnapshot} from '../../src/core/features/forecast/types';

export interface ForecastJourneyProof {prior:ForecastSnapshot;unrelated:ForecastSnapshot;dealId:string;contactId:string;overrideReason:string}
/** The browser's real installation goes through the same authenticated Records archive doors. */
export async function forecastArchiveJourney(source:Awaited<ReturnType<typeof fixture>>,proof:ForecastJourneyProof){
 const sourceApp=createApp({database:source.db,assets:{fetch:async()=>new Response('')}});
 const sourceSession=await signIn(source.db,'owner@fold.test');
 const archive=await httpArchive(archiveHttp(sourceApp,()=>sourceSession.cookie));
 const forecastTables=archive.manifest.tables.filter(table=>table.name.startsWith('forecast_'));
 assert.ok(forecastTables.length>0);assert.ok(forecastTables.some(table=>table.name==='forecast_snapshots'&&table.rows>=2));
 const local=await isolatedDatabase();
 try{await localArchiveRoundTrip(source.db,local.db);const copy=await local.db.prepare('SELECT body_json FROM forecast_snapshots WHERE id=?').bind(proof.prior.id).first<string>('body_json');assert.ok(copy);assert.deepEqual(JSON.parse(copy),proof.prior,'the local CLI archive engine also preserves forecast snapshots');for(const table of ['forecast_revisions','forecast_snapshots','forecast_snapshot_records'])assert.deepEqual((await local.db.prepare(`SELECT * FROM ${table} ORDER BY 1,2`).all()).results,(await source.db.prepare(`SELECT * FROM ${table} ORDER BY 1,2`).all()).results,`${table} is portable through the local engine`);}finally{await local.dispose();}
 const target=await fixture();
 try{
  const app=createApp({database:target.db,assets:{fetch:async()=>new Response('')}});let cookie=target.cookie;
  await httpRestore(archiveHttp(app,()=>cookie),archive);
  cookie=(await signIn(target.db,'owner@fold.test')).cookie;
  const request=async(path:string,method='GET',body?:unknown)=>app.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const base='/api/v2/workspaces/workspace/forecast';
  const retained=await request(`${base}/snapshots/${proof.prior.id}`);assert.equal(retained.status,200);assert.deepEqual(await retained.json(),proof.prior,'archive import preserves original as-of values and attributed inputs byte for byte');
  const stateResponse=await request(base);assert.equal(stateResponse.status,200);const state=await stateResponse.json() as any;
  assert.ok(state.dealInputs.some((input:any)=>input.dealId===proof.dealId&&input.reason===proof.overrideReason&&input.schedules.length>0),'archive carries override and recurring schedules');
  assert.ok(state.quotas.length>=2,'archive carries monthly and quarterly rep quotas');
  const erased=await request(`/api/v1/records/contact/${proof.contactId}`,'DELETE',{confirmed:true});assert.equal(erased.status,200,await erased.text());
  assert.equal((await request(`${base}/snapshots/${proof.prior.id}`)).status,400,'erasure withdraws the affected immutable snapshot rather than rewriting it');
  const untouched=await request(`${base}/snapshots/${proof.unrelated.id}`);assert.equal(untouched.status,200);assert.deepEqual(await untouched.json(),proof.unrelated,'unrelated prior snapshot stays unchanged after erasure');
  const after=await request(base);assert.equal(after.status,200);const serialized=JSON.stringify(await after.json());assert.ok(!serialized.includes(proof.overrideReason),'erasure removes related override history');
  const afterArchive=await httpArchive(archiveHttp(app,()=>cookie));
  const rows=JSON.stringify(afterArchive.parts.flatMap(part=>part.records.filter(record=>record.table.startsWith('forecast_'))));
  assert.ok(!rows.includes(proof.contactId),'erasure removes linked contact copies from forecast archives');assert.ok(!rows.includes(proof.overrideReason),'erasure removes copied override reason from forecast archives');
 }finally{await target.close();}
}
