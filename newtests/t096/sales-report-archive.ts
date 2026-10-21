import assert from 'node:assert/strict';
import type {Hono} from 'hono';
import {fixture,signIn} from './fixture';
import {archiveHttp,httpArchive,httpRestore} from './archive-http-proof';
import {emittedRequest} from './emitted-request';
import {createApp} from '../../tests/support/app';
import {isolatedDatabase} from '../../tests/support/isolated-database';
import {localArchiveRoundTrip} from '../../tests/support/capture-privacy-archive';

/** REPORT-001 definitions, shares and saved results travel through the authenticated Records archive of the running Worker
 * and the local CLI engine without authority. Erasing a contact a saved result names withdraws that result in full, while an
 * unrelated saved result stays. */
type Total={key:string;value:number|null};
interface Saved{id:string;definition:unknown;period:unknown;sections:{measure:string;totals:Total[]}[]}
type Worker={origin:string;certificate:{cert:string}};
const ops='/api/v2/workspaces/workspace/operations',tables=['analytics_definitions','analytics_report_shares','analytics_snapshots','analytics_snapshot_sources'];
const totals=(sections:Saved['sections'])=>sections.map(section=>[section.measure,section.totals.map(cell=>[cell.key,cell.value])]);
const sorted=(rows:unknown[])=>rows.map(row=>JSON.stringify(row)).sort();
/** The archive doors of the emitted Worker, in the shape the Records archive proof drives. */
const emitted=(worker:Worker)=>({request:(url:string,init:{method:string;headers:{Cookie:string};body?:string})=>emittedRequest(worker,init.headers.Cookie,new URL(url).pathname,init.method,init.body===undefined?undefined:JSON.parse(init.body))}) as unknown as Hono<any>;

export async function salesReportArchive({worker,ownerCookie,saved,sellerId,contactId}:{worker:Worker;ownerCookie:string;saved:Saved;sellerId:string;contactId:string}){
 const archive=await httpArchive(archiveHttp(emitted(worker),()=>ownerCookie)),archived=(name:string)=>archive.parts.flatMap(part=>part.records.filter(record=>record.table===name).map(record=>record.row));
 for(const name of tables)assert.ok(archive.manifest.tables.some(table=>table.name===name&&table.rows>0),`${name} travels in the Records archive`);
 assert.ok(!archive.manifest.tables.some(table=>table.name==='access_grants'),'collaborator grants never travel');
 const target=await fixture();
 try{
  const app=createApp({database:target.db,assets:{fetch:async()=>new Response('')}});let cookie=target.cookie;
  await httpRestore(archiveHttp(app,()=>cookie),archive);cookie=(await signIn(target.db,'owner@fold.test')).cookie;
  for(const name of tables)assert.deepEqual(sorted((await target.db.prepare(`SELECT * FROM ${name}`).all()).results),sorted(archived(name)),`${name} restores exactly from the Records archive`);
  const local=await isolatedDatabase();
  try{await localArchiveRoundTrip(target.db,local.db);for(const name of tables)assert.deepEqual(sorted((await local.db.prepare(`SELECT * FROM ${name}`).all()).results),sorted(archived(name)),`${name} is portable through the local CLI engine`);}finally{await local.dispose();}
  const request=(path:string,method='GET',body?:unknown)=>app.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const sharing=await (await request(`${ops}/reports/us-monthly/sharing`)).json() as any;
  assert.deepEqual([sharing.audience,sharing.operatorIds],['operators',[sellerId]],'sharing travels as report data');
  const reopened=await request(`${ops}/snapshots/${saved.id}`);assert.equal(reopened.status,200,await reopened.clone().text());const view=await reopened.json() as any;
  assert.deepEqual([view.definition,view.period,totals(view.sections)],[saved.definition,saved.period,totals(saved.sections)],'the restored result keeps its definition, period and original measured figures');
  const erased=await request(`/api/v1/records/contact/${contactId}`,'DELETE',{confirmed:true});assert.equal(erased.status,200,await erased.text());
  assert.equal((await request(`${ops}/snapshots/${saved.id}`)).status,400,'erasing a contact the saved result names withdraws it in full');
  const unrelated=await request(`${ops}/metrics/disclosed-value-1440/versions/1/snapshots`);assert.equal(unrelated.status,200);assert.equal((await unrelated.json() as any).items.length,1,'an unrelated saved result stays');
  for(const name of tables){const rows=JSON.stringify((await target.db.prepare(`SELECT * FROM ${name}`).all()).results);assert.ok(!rows.includes(contactId)&&!rows.includes(saved.id),`${name} keeps no saved result or input naming the erased contact`);}
 }finally{await target.close();}
}
