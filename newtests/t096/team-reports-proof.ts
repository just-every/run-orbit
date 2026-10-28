import assert from 'node:assert/strict';
import {fixture,signIn} from './fixture';
import {createApp} from '../../tests/support/app';
import type {DashboardView} from '../../src/core/features/dashboards/repository';

/** Sales team reporting through the native authenticated HTTP doors; called by the team's retained journey. */
export async function teamReportsProof(){
 const f=await fixture();try{
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response('')}}),root='/api/v2/workspaces/workspace',ops=root+'/operations',settings='/api/v1/settings/teams';
  const request=(path:string,method='GET',body?:unknown,cookie=f.cookie)=>app.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const call=async(path:string,method='GET',body?:unknown,cookie=f.cookie):Promise<any>=>{const response=await request(path,method,body,cookie);assert.ok(response.ok,`${method} ${path} ${response.status}: ${await response.clone().text()}`);return response.json();};
  const person=async(name:string)=>{await call('/api/v1/settings/operators','POST',{email:`${name}@team-report.test`,displayName:name});return signIn(f.db,`${name}@team-report.test`);};
  const manager=await person('Manager'),rep=await person('Rep'),outsider=await person('Other');
  const role=async(id:string,role:string,scope:string,fields=['amounts','notes','mail'],permissions=['export','forecast.override'])=>call(`${settings}/roles/${id}`,'PUT',{role,scope,fields,permissions,includeAssociations:false});
  await role(manager.operator.operatorId,'manager','team');await role(rep.operator.operatorId,'seller','assigned');await role(outsider.operator.operatorId,'seller','assigned');
  const team=await call(settings,'POST',{name:'North',active:true,defaultDashboardId:null});await call(`${settings}/${team.id}/members`,'PUT',{operatorIds:[manager.operator.operatorId,rep.operator.operatorId]});
  const deal=async(title:string,owner:string,amount:number)=>call('/api/v1/records/opportunity','POST',{title,stage_id:f.stage,owner_id:owner,value_cents:amount,expected_close_at:'2026-11-10T12:00:00Z'});
  const own=await deal('North permitted',rep.operator.operatorId,21000),other=await deal('Hidden south',outsider.operator.operatorId,99000);
  await call(ops+'/metrics','POST',{id:'team-sales',version:1,definition:{kind:'sales',name:'Team sales',description:'Scoped sales records',measures:['pipeline','reasons'],pipelineIds:[],repIds:[],groupBy:'owner',bucket:'month'},sharing:{audience:'teams',operatorIds:[],teamIds:[team.id]}});
  const preview=async(cookie:string)=>call(ops+'/reports/team-sales/preview','POST',{version:1,from:'2026-11',through:'2026-11'},cookie);
  const total=(view:any)=>view.sections.find((s:any)=>s.measure==='pipeline').totals.find((c:any)=>c.key==='value').value;
  const managerView=await preview(manager.cookie);assert.equal(total(managerView),21000);assert.deepEqual(Object.values(managerView.rows).map((r:any)=>r.label),['North permitted']);assert.ok(!JSON.stringify(managerView).includes(other.id));
  assert.equal((await request(ops+'/reports/team-sales/preview','POST',{version:1,from:'2026-11',through:'2026-11'},outsider.cookie)).status,403);
  const base=root+'/dashboards/team-board',definition={name:'Team board',filters:{ownerIds:[],pipelineIds:[],teamIds:[],from:'2026-11',through:'2026-11',field:null},tiles:[{id:'value',source:'report',sourceId:'team-sales',version:'live',snapshotId:null,measure:'pipeline',kind:'number',width:6,height:1,bindings:{}}]};
  await call(base,'PUT',{version:0,definition});await call(base+'/sharing','PUT',{version:1,audience:'teams',grants:[],teamGrants:[{teamId:team.id,access:'view'}]});await call(base+`/teams/${team.id}/default`,'PUT',{enabled:true});
  const board:DashboardView=await call(base,'GET',undefined,rep.cookie),ready=board.tiles[0];assert.equal(board.isDefault,true);assert.ok(ready?.status==='ready');assert.equal(total(ready.report),21000);
  const csv=await request(base+'/tiles/value/csv','GET',undefined,rep.cookie);assert.equal(csv.status,200);const text=await csv.text();assert.match(text,/210/);assert.ok(!text.includes('Hidden south'));
  const pdf=await request(base+'/pdf','GET',undefined,rep.cookie);assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');
  await call(base+'/default','PUT',{enabled:false},rep.cookie);assert.equal((await call(base,'GET',undefined,rep.cookie)).isDefault,false);
  await call(base+'/default','PUT',{enabled:true},rep.cookie);assert.equal((await call(base,'GET',undefined,rep.cookie)).isDefault,true);
  const empty=await call(base+'/compute','POST',{...definition.filters,teamIds:['no-such-team']},rep.cookie);assert.equal(total(empty.tiles[0].report),0);
  await call(root+'/forecast/stages','POST',{stageId:f.stage,probability:50,category:'pipeline',reason:'Reviewed probability'});
  await call(root+'/forecast/quotas','POST',{operatorId:rep.operator.operatorId,period:'monthly',startDate:'2026-11-01',amountCents:100000,reason:'Rep goal'});
  await call(root+'/forecast/quotas','POST',{teamId:team.id,period:'monthly',startDate:'2026-11-01',amountCents:200000,reason:'North goal'});
  const won=await deal('North won',rep.operator.operatorId,40000);await call(`/api/v1/records/opportunity/${won.id}/lifecycle`,'POST',{state:'won',reason:'Signed'});await f.db.prepare('UPDATE opportunities SET closed_at=? WHERE id=?').bind('2026-11-05T12:00:00Z',won.id).run();
  const period={from:'2026-11-01',through:'2026-12-01'},forecast=await call(root+'/forecast/preview','POST',period,manager.cookie);assert.equal(forecast.result.totals.openUnweightedCents,21000);assert.equal(forecast.result.totals.weightedExpectedCents,10500);assert.equal(forecast.result.quotaAttainment.find((q:any)=>q.quota.teamId===team.id)?.attainmentPercent,20);assert.equal(forecast.result.quotaAttainment.find((q:any)=>!q.quota.teamId&&q.quota.operatorId===rep.operator.operatorId)?.attainmentPercent,40);
  const externalWon=await deal('South won',outsider.operator.operatorId,30000);await call(`/api/v1/records/opportunity/${externalWon.id}/lifecycle`,'POST',{state:'won',reason:'Signed south'});await f.db.prepare('UPDATE opportunities SET closed_at=? WHERE id=?').bind('2026-11-05T12:00:00Z',externalWon.id).run();
  const ownerPreview=await call(root+'/forecast/preview','POST',period),snapshot=await call(root+'/forecast/snapshots','POST',{...period,reviewHash:ownerPreview.reviewHash});const projected=await call(root+`/forecast/snapshots/${snapshot.id}`,'GET',undefined,manager.cookie);assert.equal(projected.result.totals.openUnweightedCents,21000);assert.ok(!JSON.stringify(projected).includes(other.id));await call(`${settings}/${team.id}/members`,'PUT',{operatorIds:[manager.operator.operatorId,rep.operator.operatorId,outsider.operator.operatorId]});const historical=await call(root+`/forecast/snapshots/${snapshot.id}`,'GET',undefined,manager.cookie);assert.equal(historical.result.totals.wonBookingsCents,70000);assert.equal(historical.result.quotaAttainment.find((q:any)=>q.quota.teamId===team.id)?.attainmentPercent,20,'a saved team quota retains the membership measured at saving');await call(`${settings}/${team.id}/members`,'PUT',{operatorIds:[manager.operator.operatorId,rep.operator.operatorId]});
  assert.equal((await request(root+`/forecast/deals/${other.id}`,'POST',{probability:90,category:null,closeDate:null,schedules:[],reason:'Forbidden'},manager.cookie)).status,403);
  await call(root+`/forecast/deals/${own.id}`,'POST',{probability:70,category:null,closeDate:null,schedules:[],reason:'North review'},manager.cookie);
  await role(rep.operator.operatorId,'seller','assigned',[],['export']);const hidden=await preview(rep.cookie);assert.equal(total(hidden),null);assert.ok(!JSON.stringify(hidden).includes('21000'));
  const hiddenForecast=await call(root+'/forecast/preview','POST',period,rep.cookie);assert.equal(hiddenForecast.result.deals.length,0);assert.equal(hiddenForecast.result.totals.openUnweightedCents,0);assert.equal(hiddenForecast.result.quotaAttainment.length,0);
  await role(rep.operator.operatorId,'seller','assigned',[],[]);assert.equal((await request(base+'/pdf','GET',undefined,rep.cookie)).status,403);assert.equal((await request(base+'/tiles/value/csv','GET',undefined,rep.cookie)).status,403);assert.equal((await request(base,'GET',undefined,rep.cookie)).status,200);
  await call(`${settings}/${team.id}/members`,'PUT',{operatorIds:[manager.operator.operatorId]});assert.equal((await request(base,'GET',undefined,rep.cookie)).status,403);assert.equal((await request(ops+'/reports/team-sales/preview','POST',{version:1,from:'2026-11',through:'2026-11'},rep.cookie)).status,403);
 }finally{await f.close();}
}
