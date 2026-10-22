import assert from 'node:assert/strict';
import type {fixture} from './fixture';
import type {ArchivePart} from '../../src/core/features/records/archive-schema';
/** Composed into REPORT-001's existing HTTP and actual local CLI round-trip and contact-erasure journey. */
export async function dashboardArchiveBefore(target:Awaited<ReturnType<typeof fixture>>,archived:(name:string)=>ArchivePart['records'][number]['row'][]){
 for(const table of ['sales_dashboards','sales_dashboard_versions','sales_dashboard_shares','sales_dashboard_defaults','sales_dashboard_schedules']){
  const expected=archived(table);assert.ok(expected.length,`${table} has actual dashboard data`);const actual=(await target.db.prepare(`SELECT * FROM ${table}`).all()).results;
  const normalize=(rows:Record<string,unknown>[])=>rows.map(row=>JSON.stringify(table==='sales_dashboards'?{...row,authority:0}:table==='sales_dashboard_schedules'?{...row,state:'paused'}:row)).sort();assert.deepEqual(normalize(actual),normalize(expected));
  if(table==='sales_dashboards')assert.ok(actual.every(row=>row.authority===0));if(table==='sales_dashboard_schedules')assert.ok(actual.every(row=>row.state==='paused'));
 }
 const cookie=(await import('./fixture')).signIn;
 const owner=(await cookie(target.db,'owner@fold.test')).cookie;
 // The same public schedule read crosses US daylight saving using the existing Clock seam.
 for(const [now,expected] of [['2026-10-25T14:00:00Z','2026-10-26T12:00:00.000Z'],['2026-11-01T14:00:00Z','2026-11-02T13:00:00.000Z']] as const){
  const current=(await import('../../tests/support/app')).createApp({database:target.db,assets:{fetch:async()=>new Response('')},clock:{now:()=>new Date(now)}}),id=String(archived('sales_dashboard_schedules')[0]!.dashboard_id),response=await current.request(`https://orbit.test/api/v2/workspaces/workspace/dashboards/${id}/schedule`,{headers:{Cookie:owner}});assert.equal(response.status,200,await response.clone().text());const body=await response.json() as any;assert.equal(body.nextAt,expected);assert.equal(body.state,'paused');
 }
}
export async function dashboardArchiveAfter(target:Awaited<ReturnType<typeof fixture>>,erasedSnapshot:string){
 const rows=(await target.db.prepare('SELECT body_json FROM sales_dashboard_versions').all<{body_json:string}>()).results;assert.ok(rows.length);assert.ok(rows.every(row=>!row.body_json.includes(erasedSnapshot)),'erasure removes saved-result pointers from every version');
}
