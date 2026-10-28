import assert from 'node:assert/strict';
import {createApp} from '../../tests/support/app';
import {fixture,nativeRecord} from './fixture';

/** A manager reviews a complete period, then must review again after its population changes. */
export async function reportPeriodJourney(){
 const f=await fixture();
 try{
  const app=createApp({database:f.db,assets:{fetch:async()=>{throw Error('HTTP report journey');}}});
  const base='/api/v2/workspaces/workspace/operations';
  const request=(path:string,body:unknown)=>app.request('https://orbit.test'+base+path,{method:'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(body)});
  const call=async(path:string,body:unknown)=>{const response=await request(path,body);assert.equal(response.status,200,await response.clone().text());return response.json() as Promise<any>;};
  const expected:string[]=[];
  for(const [name,date,included] of [
   ['before','2026-10-01T11:59:59.999Z',false],['start seconds','2026-10-01T12:00:00Z',true],
   ['start milliseconds','2026-10-01T12:00:00.000Z',true],['start offset','2026-10-01T22:00:00+10:00',true],
   ['inside','2026-10-01T12:59:59.999Z',true],['end offset','2026-10-01T23:00:00+10:00',false],
   ['unavailable native date','unavailable',false],
  ] as const){
   const record=await nativeRecord(f,'contact',{name,email:name.replaceAll(' ','-')+'@time.test'});
   await f.db.prepare('UPDATE contacts SET created_at=? WHERE id=?').bind(date,record.ref.id).run();
   if(included)expected.push(record.ref.id);
  }
  await call('/metrics',{id:'instants',version:1,definition:{name:'Exact period population',description:'Native report review across timezone boundaries',aggregation:'count',unit:'contacts',sourceTypes:['contact'],sourceOperation:'graph.read',sourceFields:['created_at'],currency:null,missingPolicy:'incomplete',lateArrival:'recompute',attributionModel:'none',attributionWindowDays:1,dateField:'created_at'}});
  const period={version:1,from:'2026-10-01T22:00:00+10:00',through:'2026-10-01T23:00:00+10:00'};
  const preview=await call('/metrics/instants/preview',period);
  assert.equal(preview.values.value,expected.length);assert.equal(preview.values.invalidDates,1);
  assert.deepEqual(preview.inputs.map((ref:any)=>ref.id).sort(),expected.sort());assert.ok(preview.incompleteReasons.length);
  assert.equal((await request('/metrics/instants/preview',{...period,through:period.from})).status,400);
  const added=await nativeRecord(f,'contact',{name:'Arrived after review',email:'late@population.test'});
  await f.db.prepare('UPDATE contacts SET created_at=? WHERE id=?').bind('2026-10-01T12:30:00Z',added.ref.id).run();
  const stale=await request('/metrics/instants/snapshots',{...period,reviewHash:preview.reviewHash});
  assert.equal(stale.status,409);assert.equal(await f.db.prepare('SELECT count(*) n FROM analytics_snapshots').first('n'),0);
  const fresh=await call('/metrics/instants/preview',period),saved=await call('/metrics/instants/snapshots',{...period,reviewHash:fresh.reviewHash});
  assert.equal(fresh.values.value,expected.length+1);
  const exported=await app.request(`https://orbit.test${base}/snapshots/${saved.id}/export`,{headers:{Cookie:f.cookie}});
  assert.equal(exported.status,200);assert.deepEqual((await exported.json() as any).inputs.map((ref:any)=>ref.id).sort(),[...expected,added.ref.id].sort());
 }finally{await f.close();}
}
