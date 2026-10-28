import assert from 'node:assert/strict';
import type {CaptureFixture} from '../../tests/support/capture-fixture';

type Door={db:D1Database;request:(path:string,init?:RequestInit)=>Promise<Response>};
const base='/api/v2/workspaces/workspace',ops=base+'/operations',forecast=base+'/forecast';
const report='synthetic-orbit-portable-sales',dashboard='synthetic-orbit-portable-dashboard';
const json=async(door:Door,path:string,method='GET',body?:unknown)=>{
 const response=await door.request(path,{method,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 assert.ok(response.ok,`${method} ${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;
};

/** Populate feature data once; the archive journey supplies both public transfer doors and their restored installation. */
export async function portableReports(f:CaptureFixture){
 const now=new Date(),month=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)),next=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1));
 const from=month.toISOString().slice(0,10),through=next.toISOString().slice(0,10),monthKey=from.slice(0,7);
 const state=await json(f,forecast),stage=state.stages[0].id;
 const deal=await json(f,'/api/v1/records/opportunity','POST',{title:'Synthetic Orbit portable renewal',stage_id:stage,owner_id:f.operator,company_id:f.company,contact_ids:[f.ana],primary_contact_id:f.ana,value_cents:100000,expected_close_at:from+'T12:00:00.000Z'});
 await json(f,forecast+'/stages','POST',{stageId:stage,probability:50,category:'pipeline',reason:'Synthetic Orbit reviewed sales plan'});
 await json(f,forecast+'/deals/'+deal.id,'POST',{probability:70,category:'committed',closeDate:from,schedules:[{label:'Synthetic Orbit subscription',kind:'monthly',amountCents:25000,startDate:from,endDate:null}],reason:'Synthetic Orbit procurement confirmed'});
 await json(f,forecast+'/quotas','POST',{operatorId:f.operator,period:'monthly',startDate:from,amountCents:1000000,reason:'Synthetic Orbit monthly sales goal'});
 const forecastPreview=await json(f,forecast+'/preview','POST',{from,through}),forecastSaved=await json(f,forecast+'/snapshots','POST',{from,through,reviewHash:forecastPreview.reviewHash});
 assert.ok(forecastSaved.result.inputs.dealInputs.some((input:any)=>input.dealId===deal.id&&input.schedules.length===1));
 const definition={kind:'sales',name:'Synthetic Orbit portable sales',description:'A saved sales result used by the shared portability journey',measures:['pipeline','revenue','activities'],pipelineIds:[],repIds:[],groupBy:'pipeline',bucket:'month'};
 await json(f,ops+'/metrics','POST',{id:report,version:1,definition,sharing:{audience:'workspace',operatorIds:[]}});
 const period={version:1,from:monthKey,through:monthKey},preview=await json(f,ops+'/reports/'+report+'/preview','POST',period),saved=await json(f,ops+'/reports/'+report+'/snapshots','POST',{...period,reviewHash:preview.reviewHash});
 await json(f,base+'/dashboards/'+dashboard,'PUT',{version:0,definition:{name:'Synthetic Orbit portable sales board',filters:{ownerIds:[],pipelineIds:[],from:monthKey,through:monthKey,field:null},tiles:[{id:'synthetic-sales',source:'report',sourceId:report,version:1,snapshotId:saved.id,measure:'revenue',kind:'number',width:6,height:1,bindings:{}},{id:'synthetic-forecast',source:'forecast',sourceId:forecastSaved.id,version:1,snapshotId:null,measure:'pipeline',kind:'forecast',width:6,height:1,bindings:{}}]}});
 await json(f,base+'/dashboards/'+dashboard+'/sharing','PUT',{version:1,audience:'workspace',grants:[]});
 await json(f,base+'/dashboards/'+dashboard+'/schedule','PUT',{version:0,frequency:'monthly',hour:8,minute:0,weekday:1,day:1,recipientIds:[f.operator],channelId:null,pdf:true,csv:true});
 await json(f,base+'/dashboards/'+dashboard+'/default','PUT',{enabled:true});
 return {
  async assertRestored(target:Door){
   const retained=await json(target,forecast+'/snapshots/'+forecastSaved.id);assert.deepEqual(retained,forecastSaved,'Forecast as-of inputs and measured figures restore unchanged');
   const forecastState=await json(target,forecast);assert.ok(forecastState.dealInputs.some((input:any)=>input.dealId===deal.id&&input.reason==='Synthetic Orbit procurement confirmed'&&input.schedules.length===1));assert.ok(forecastState.quotas.some((quota:any)=>quota.operatorId===f.operator&&quota.amountCents===1000000));
   const result=await json(target,ops+'/snapshots/'+saved.id);assert.deepEqual(result.sections,saved.sections,'Saved sales figures keep their original input basis');assert.deepEqual(result.definition,saved.definition);
   const source=await json(target,ops+'/reports/'+report+'/sharing');assert.equal(source.audience,'workspace');
   const board=await json(target,base+'/dashboards/'+dashboard+'/definition');assert.equal(board.definition.tiles.length,2);assert.equal(board.definition.tiles[0].snapshotId,saved.id);
   const authority=await target.db.prepare('SELECT authority FROM sales_dashboards WHERE id=?').bind(dashboard).first('authority');assert.equal(authority,0,'Restoring dashboard data never restores sending authority');
   const schedule=await json(target,base+'/dashboards/'+dashboard+'/schedule');assert.equal(schedule.state,'paused');assert.equal(schedule.definition.recipientIds[0],f.operator);
  },
  async assertErased(target:Door){
   const snapshot=await target.request(forecast+'/snapshots/'+forecastSaved.id);assert.equal(snapshot.status,400,'Erasure withdraws a forecast that names the removed contact');
   const result=await target.request(ops+'/snapshots/'+saved.id);assert.equal(result.status,400,'Erasure withdraws a sales result that names the removed contact');
   const versions=await target.db.prepare('SELECT body_json FROM sales_dashboard_versions WHERE dashboard_id=?').bind(dashboard).all<{body_json:string}>();assert.ok(versions.results.length);assert.ok(versions.results.every(row=>!row.body_json.includes(saved.id)),'Every dashboard version drops a withdrawn saved-result pointer');
  }
 };
}
