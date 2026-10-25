import assert from 'node:assert/strict';
import {createApp} from '../../tests/support/app';
import {fixture,collaborator} from './fixture';
import type {DashboardView} from '../../src/core/features/dashboards/repository';
import type {DashboardDefinition} from '../../src/core/features/dashboards/schema';

/** Extends the existing period-boundary registration; every result comes through authenticated HTTP. */
export async function dashboardBackendProof(){
 const f=await fixture();
 try{
  const root='/api/v2/workspaces/workspace',ops=root+'/operations',base=root+'/dashboards/native-boundaries';
  let scheduleNow='2026-10-25T14:00:00Z';
  const clock={now:()=>new Date(scheduleNow)};
  const app=createApp({database:f.db,clock,assets:{fetch:async()=>{throw Error('API-only proof');}}});
  const request=(path:string,method='GET',body?:unknown,cookie=f.cookie,target=app)=>target.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const call=async<T=any>(path:string,method='GET',body?:unknown,cookie=f.cookie):Promise<T>=>{const response=await request(path,method,body,cookie);assert.ok(response.ok,`${method} ${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<T>;};
  const settings=(await call('/api/v1/settings')).workspace;
  await call('/api/v1/settings','PUT',{name:settings.name,timezone:'America/New_York',currency:'USD',workingHours:JSON.parse(settings.working_hours_json),staleIntervalDays:settings.stale_interval_days,awaitingResponseWorkingDays:settings.awaiting_response_working_days,freeMailDomains:JSON.parse(settings.free_mail_domains_json)});
  const source='native-boundary-report';
  await call(ops+'/metrics','POST',{id:source,version:1,definition:{kind:'sales',name:'Native boundary sales',description:'Existing calculations under dashboard predicates',measures:['pipeline','reasons','activities','revenue'],pipelineIds:[],repIds:[],groupBy:'pipeline',bucket:'month'},sharing:{audience:'workspace',operatorIds:[]}});
  const deal=async(title:string,amount:number,at:string,region='Northeast')=>call('/api/v1/records/opportunity','POST',{title,stage_id:f.stage,value_cents:amount,owner_id:f.operator.operatorId,expected_close_at:at,custom_fields:{Territory:region}});
  const before=await deal('Before local day',10000,'2026-11-01T03:59:59Z');
  const inside=await deal('Inside local day',20000,'2026-11-01T04:00:00Z');
  const last=await deal('Last local hour',30000,'2026-11-02T04:59:59Z','West');
  const after=await deal('After local day',40000,'2026-11-02T05:00:00Z');
  await call(root+'/forecast/stages','POST',{stageId:f.stage,probability:50,category:'pipeline',reason:'Reviewed boundary example'});
  await call(root+'/forecast/quotas','POST',{operatorId:f.operator.operatorId,period:'quarterly',startDate:'2026-10-01',amountCents:1000000,reason:'Reviewed goal'});
  const forecastPeriod={from:'2026-11-01',through:'2026-11-02'};
  const preview=await call(root+'/forecast/preview','POST',forecastPeriod);
  const savedForecast=await call(root+'/forecast/snapshots','POST',{...forecastPeriod,reviewHash:preview.reviewHash});
  // The standalone source retains its existing UTC-day definition and immutable saved result.
  assert.equal(savedForecast.result.totals.openUnweightedCents,30000);
  const common={source:'report' as const,sourceId:source,version:1 as const,snapshotId:null,width:6,height:1 as const,bindings:{Region:'Territory'}};
  const definition:DashboardDefinition={name:'Native dashboard boundaries',filters:{ownerIds:[],pipelineIds:[],from:'2026-11',through:'2026-11',dateRange:{from:'2026-11-01',through:'2026-11-01'},field:null},tiles:[
   {...common,id:'pipeline',measure:'pipeline',kind:'chart'},
   {...common,id:'reasons',measure:'reasons',kind:'table'},
   {...common,id:'activities',measure:'activities',kind:'table'},
   {...common,id:'forecast',source:'forecast',sourceId:savedForecast.id,version:'live',measure:'pipeline',kind:'forecast'},
  ]};
  await call(base,'PUT',{version:0,definition});
  const initial=await call<DashboardView>(base);
  const ready=(view:DashboardView,id:string)=>{const tile=view.tiles.find(t=>t.id===id);assert.ok(tile?.status==='ready');return tile;};
  assert.equal(ready(initial,'forecast').forecast!.result.totals.openUnweightedCents,50000,'workspace November 1 has 25 hours; both local boundary deals are included');
  assert.equal(ready(initial,'forecast').forecast!.result.totals.weightedExpectedCents,25000);
  assert.deepEqual(ready(initial,'forecast').forecast!.result.deals.filter(d=>d.inPeriod).map(d=>d.deal.id).sort(),[inside.id,last.id].sort());
  assert.match(ready(initial,'forecast').forecast!.result.basis,/America\/New_York/);
  assert.equal(ready(initial,'forecast').forecast!.asOf,ready(initial,'forecast').forecast!.result.asOf);
  const bound=await call<DashboardView>(base+'/compute','POST',{...definition.filters,field:{name:'Region',value:'Northeast'}});
  assert.equal(ready(bound,'forecast').forecast!.result.totals.openUnweightedCents,20000,'forecast and sales tiles honor the saved field binding');
  assert.equal(ready(bound,'pipeline').report!.sections[0]!.totals.find(c=>c.key==='value')!.value,70000);
  const missingFilters={...definition.filters,field:{name:'MissingField',value:'no such value'}};
  const missing=await call<DashboardView>(base+'/compute','POST',missingFilters);
  for(const id of ['pipeline','reasons','activities','forecast'])assert.ok(ready(missing,id).notes.some(note=>/MissingField filter not applied/.test(note)));
  assert.equal(ready(missing,'pipeline').report!.sections[0]!.totals.find(c=>c.key==='value')!.value,100000,'an inapplicable field is disclosed, never presented as a false zero');
  assert.equal(ready(missing,'forecast').forecast!.result.totals.openUnweightedCents,50000);
  assert.equal(missing.takeEveryFilter,0);
  for(const id of ['pipeline','forecast']){
   const csv=await request(`${base}/tiles/${id}/csv?filters=${encodeURIComponent(JSON.stringify(missingFilters))}`);
   assert.equal(csv.status,200);assert.match(await csv.text(),/MissingField filter not applied/);
  }
  const forecastCsv=await request(base+'/tiles/forecast/csv');assert.equal(forecastCsv.status,200);assert.match(await forecastCsv.text(),/Timezone: America\/New_York/);
  // Saved forecast values remain original, even under a dashboard date and field filter.
  const edit=await call(base+'/definition');edit.definition.tiles[3].version=1;
  await call(base,'PUT',edit);
  const pinned=await call<DashboardView>(base+'/compute','POST',missingFilters);
  assert.deepEqual(ready(pinned,'forecast').forecast,savedForecast);
  const invalidRange=await call<DashboardView>(base+'/compute','POST',{...missingFilters,dateRange:{from:'2026-11-02',through:'2026-11-01'}});
  assert.deepEqual(ready(invalidRange,'forecast').forecast,savedForecast,'invalid live filters never disturb an immutable saved forecast result');
  assert.ok(ready(pinned,'forecast').notes.some(note=>/Dashboard filters not applied/.test(note)));
  assert.equal((await request(base,'PUT',edit)).status,409,'a stale definition cannot overwrite a later dashboard version');
  const overfull={...definition,tiles:Array.from({length:25},(_,i)=>({...definition.tiles[0]!,id:`tile-${i}`}))};
  assert.equal((await request(root+'/dashboards/too-many','PUT',{version:0,definition:overfull})).status,400);
  const many={...definition,tiles:overfull.tiles.slice(0,24)};await call(root+'/dashboards/full','PUT',{version:0,definition:many});
  const retained=await call(root+'/dashboards/full/definition');assert.deepEqual(retained.definition.tiles.map((t:any)=>[t.id,t.width,t.height]),many.tiles.map(t=>[t.id,t.width,t.height]));
  // Named edit grants do not grant record amounts, report administration or forecast access.
  const seller=await collaborator(f,'seller');
  await call('/api/v2/access/workspaces/workspace/roles/seller','PUT',{actions:['analytics.read'],fields:['*']});
  const share=await call(base+'/sharing');await call(base+'/sharing','PUT',{version:share.version,audience:'named',grants:[{operatorId:seller.operator.operatorId,access:'edit'}]});
  const grant=await call('/api/v2/access/workspaces/workspace/grants','POST',{subjectKind:'operator',subjectId:seller.operator.operatorId,resourceType:'opportunity',resourceId:inside.id,actions:['graph.read'],fields:['title','lifecycle','stage_id','owner_id','expected_close_at','created_at','updated_at'],purpose:'Counts without amounts',expiresAt:null});
  const limited=await call<DashboardView>(base,'GET',undefined,seller.cookie);
  const section=ready(limited,'pipeline').report!.sections[0]!;
  assert.equal(section.totals.find(c=>c.key==='deals')!.value,1);
  assert.equal(section.totals.find(c=>c.key==='value')!.value,null,'the denied amount is unavailable, not a zero or inferred sum');
  assert.deepEqual(section.totals.find(c=>c.key==='deals')!.rows,[`deal:${inside.id}`]);
  assert.ok(!JSON.stringify(limited).includes('Before local day'));
  assert.equal(limited.tiles.find(t=>t.id==='forecast')!.status,'unavailable');
  const editable=await call(base+'/definition','GET',undefined,seller.cookie);editable.definition.name='Named editor saved this dashboard';await call(base,'PUT',editable,seller.cookie);
  assert.equal((await request(base+'/sharing','GET',undefined,seller.cookie)).status,403);
  await call(base+'/default','PUT',{enabled:true},seller.cookie);
  assert.equal((await call(root+'/dashboards','GET',undefined,seller.cookie)).items[0].id,'native-boundaries');
  await call('/api/v2/access/workspaces/workspace/grants/'+grant.id,'DELETE',{});
  const csv=await request(base+'/tiles/pipeline/csv','GET',undefined,seller.cookie);assert.equal(csv.status,200);assert.doesNotMatch(await csv.text(),/Inside local day|\$200\.00/);
  for(const path of [base,base+'/outline',base+'/pdf',base+'/tiles/pipeline/csv'])assert.equal((await request(path,'GET',undefined,'')).status,401);
  // Calendar definitions survive a new application instance without acquiring email authority.
  let scheduleVersion=0;
  for(const example of [
   {now:'2026-10-25T14:00:00Z',frequency:'weekly',hour:8,minute:0,weekday:1,day:1,next:'2026-10-26T12:00:00.000Z'},
   {now:'2026-11-01T14:00:00Z',frequency:'weekly',hour:8,minute:0,weekday:1,day:1,next:'2026-11-02T13:00:00.000Z'},
   {now:'2026-03-08T05:00:00Z',frequency:'daily',hour:2,minute:30,weekday:1,day:1,next:'2026-03-08T07:30:00.000Z'},
   {now:'2026-11-01T05:31:00Z',frequency:'daily',hour:1,minute:30,weekday:1,day:1,next:'2026-11-02T06:30:00.000Z'},
   {now:'2026-10-29T14:00:00Z',frequency:'monthly',hour:8,minute:0,weekday:1,day:28,next:'2026-11-28T13:00:00.000Z'},
  ]){
   scheduleNow=example.now;
   const schedule=await call(base+'/schedule','PUT',{version:scheduleVersion,frequency:example.frequency,hour:example.hour,minute:example.minute,weekday:example.weekday,day:example.day,recipientIds:[f.operator.operatorId,seller.operator.operatorId],channelId:null,pdf:true,csv:true});
   scheduleVersion=schedule.definition.version;assert.equal(schedule.nextAt,example.next);assert.equal(schedule.state,'paused');assert.deepEqual(schedule.history,[]);
   const restarted=createApp({database:f.db,clock,assets:{fetch:async()=>{throw Error('API-only proof');}}});
   const reopened=await request(base+'/schedule','GET',undefined,f.cookie,restarted);assert.equal(reopened.status,200);
   const retained=await reopened.json() as any;assert.equal(retained.nextAt,example.next);assert.equal(retained.state,'paused');assert.deepEqual(retained.history,[]);
  }
  // A missing pinned result must not acquire loading chrome or CSV from another source.
  const invalid=await call(base+'/definition');invalid.definition.tiles[1].snapshotId='missing-saved-result';await call(base,'PUT',invalid);
  for(const path of [base,base+'/outline']){const view=await call<DashboardView>(path),tile=view.tiles.find(t=>t.id==='reasons')!;assert.equal(tile.status,'unavailable');assert.ok(!('name' in tile)&&!('version' in tile)&&!('period' in tile));}
  assert.equal((await request(base+'/tiles/reasons/csv')).status,404);
  // Pause only at the last real metadata read. Delete the source through a second real HTTP request.
  // No database result or product calculation is replaced.
  let interrupted=false,mutation:()=>Promise<unknown>;
  const database=new Proxy(f.db,{get(target,key){if(key!=='prepare'){const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}return(sql:string)=>{
   const statement=target.prepare(sql);
   if(!sql.startsWith('SELECT 1 FROM sales_dashboard_defaults'))return statement;
   const wrap=(query:D1PreparedStatement):D1PreparedStatement=>new Proxy(query,{get(object,property){if(property==='bind')return(...args:unknown[])=>wrap(object.bind(...args));if(property==='first')return async(...args:Parameters<D1PreparedStatement['first']>)=>{if(!interrupted){interrupted=true;await mutation();}return object.first(...args);};const value=Reflect.get(object,property);return typeof value==='function'?value.bind(object):value;}});
   return wrap(statement);
  };}});
  const racing=createApp({database,assets:{fetch:async()=>{throw Error('API-only proof');}}});
  const held=async(change:()=>Promise<unknown>,cookie=f.cookie)=>{
   interrupted=false;mutation=change;
   const response=await request(base+'/pdf','GET',undefined,cookie,racing);
   assert.equal(interrupted,true);assert.equal(response.status,409,await response.clone().text());assert.doesNotMatch(await response.text(),/Before local day|Inside local day|%PDF/);
  };
  await held(()=>call(`${root}/records/opportunity/${inside.id}`,'PUT',{value_cents:21000}));
  assert.equal(ready(await call<DashboardView>(base),'pipeline').report!.sections[0]!.totals.find(c=>c.key==='value')!.value,101000);
  const currentGrant=await call('/api/v2/access/workspaces/workspace/grants','POST',{subjectKind:'operator',subjectId:seller.operator.operatorId,resourceType:'opportunity',resourceId:inside.id,actions:['graph.read'],fields:['*'],purpose:'Revoked before export finishes',expiresAt:null});
  await held(()=>call('/api/v2/access/workspaces/workspace/grants/'+currentGrant.id,'DELETE',{}),seller.cookie);
  await held(()=>call(ops+'/reports/'+source,'DELETE',{}));
  const removed=await call<DashboardView>(base);for(const tile of removed.tiles.filter(t=>t.id!=='forecast'))assert.equal(tile.status,'unavailable');
  // Reusing the key after deletion does not revive withdrawn source pointers.
  await call(ops+'/metrics','POST',{id:source,version:1,definition:{kind:'sales',name:'New unrelated report',description:'A replacement key',measures:['pipeline'],pipelineIds:[],repIds:[],groupBy:'pipeline',bucket:'month'}});
  assert.equal((await call<DashboardView>(base)).tiles.find(t=>t.id==='pipeline')!.status,'unavailable');
  assert.deepEqual(await call(root+'/forecast/snapshots/'+savedForecast.id),savedForecast);
  void before;void after;
 }finally{await f.close();}
}
