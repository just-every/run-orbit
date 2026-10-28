import assert from 'node:assert/strict';

type Request=(path:string,method?:string,body?:unknown)=>Promise<Response>;

/** Paths here are absolute API paths, so one authenticated request exercises native records, reports and dashboards. */
export async function exerciseRecordOwnerReports(request:Request,actor:string,other:string,limitedRequest?:Request){
 const call=async(path:string,method='GET',body?:unknown)=>{const response=await request(path,method,body),data=await response.json() as any;assert.ok(response.ok,`${path}: ${JSON.stringify(data)}`);return data;};
 const native='/api/v1',operations='/api/v2/workspaces/workspace/operations',dashboards='/api/v2/workspaces/workspace/dashboards';
 const fixture:Record<string,string[]>={contact:[],company:[]},noteKeys:Record<string,string[]>={contact:[],company:[]};
 const occurredAt='2026-03-12T12:00:00.000Z',month={from:'2026-03',through:'2026-03'};
 for(const kind of ['contact','company'] as const){
  for(const [index,ownerId] of [actor,other,null].entries()){
   const record=await call(`${native}/records/${kind}`,'POST',{name:`synthetic-orbit-owner-report-${kind}-${index}`,...(kind==='contact'?{job_title:'synthetic-orbit-owner-report'}:{})});fixture[kind].push(record.id);
   const review=await call(`${native}/records/ownership/review`,'POST',{kind,ids:[record.id],ownerId});await call(`${native}/records/ownership/${review.id}/apply`,'POST',{});
   await call(`${native}/records/${kind}/${record.id}/entries`,'POST',{kind:'note',text:'synthetic-orbit-owner-report activity',occurredAt});
   const detail=await call(`${native}/records/${kind}/${record.id}`);noteKeys[kind].push(`activity:${detail.timeline.find((entry:any)=>entry.kind==='manual.note').id}`);
  }
 }
 // Native count reports read owner_id from the real sidecar and disclose each group's exact records.
 const definition={name:'Synthetic contact owner report',description:'Contact owners independent of deal owners',aggregation:'count',unit:'records',sourceTypes:['contact'],sourceOperation:'graph.read',sourceFields:['created_at','owner_id','job_title'],currency:null,missingPolicy:'incomplete',lateArrival:'recompute',attributionModel:'none',attributionWindowDays:1,dateField:'created_at',groupBy:'owner_id',filters:{job_title:'synthetic-orbit-owner-report'}};
 const period={version:1,from:'2020-01-01T00:00:00.000Z',through:'2030-01-01T00:00:00.000Z'};
 await call(`${operations}/metrics`,'POST',{id:'synthetic-contact-owners',version:1,definition});
 const nativePreview=await call(`${operations}/metrics/synthetic-contact-owners/preview`,'POST',period);assert.equal(nativePreview.values.n,3);
 for(const [index,ownerId] of [actor,other,null].entries()){
  const group=nativePreview.values.groups.find((item:any)=>item.group===ownerId);assert.ok(group);assert.equal(group.n,1);assert.deepEqual(group.records,[{type:'contact',id:fixture.contact[index]}]);if(ownerId===null)assert.equal(group.label,'Unassigned');
 }
 const nativeSaved=await call(`${operations}/metrics/synthetic-contact-owners/snapshots`,'POST',{...period,reviewHash:nativePreview.reviewHash});
 const exported=await call(`${operations}/snapshots/${nativeSaved.id}/export`);assert.deepEqual(exported.values.groups,nativePreview.values.groups);
 await call(`${operations}/metrics`,'POST',{id:'synthetic-unassigned-contacts',version:1,definition:{...definition,filters:{...definition.filters,owner_id:null}}});
 const unassigned=await call(`${operations}/metrics/synthetic-unassigned-contacts/preview`,'POST',period);assert.equal(unassigned.values.n,1);assert.deepEqual(unassigned.values.groups[0].records,[{type:'contact',id:fixture.contact[2]}]);
 for(const kind of ['contact','company'] as const){
  const id=`synthetic-${kind}-owner-activities`,sales={kind:'sales',name:`Synthetic ${kind} activities`,description:'Activity rows grouped by linked record owners',measures:['activities'],pipelineIds:[],repIds:[],groupBy:'owner',bucket:'month',recordOwnerType:kind};
  await call(`${operations}/metrics`,'POST',{id,version:1,definition:sales});
  const preview=await call(`${operations}/reports/${id}/preview`,'POST',{version:1,...month});
  const table=preview.sections[0].tables.find((table:any)=>table.key==='record-owner');assert.ok(table);
  for(const [index,ownerId] of [actor,other,'unassigned'].entries()){
   const group=table.groups.find((group:any)=>group.key===ownerId);assert.ok(group);const cell=group.cells.find((cell:any)=>cell.key==='total');assert.ok(cell.rows.includes(noteKeys[kind][index]));
   assert.ok(!cell.rows.includes(noteKeys[kind][(index+1)%3]));assert.equal(cell.value,cell.rows.length);for(const key of cell.rows)assert.ok(preview.rows[key],'Every counted row has a drill-through row');
  }
  const saved=await call(`${operations}/reports/${id}/snapshots`,'POST',{version:1,...month,reviewHash:preview.reviewHash});
  const reopened=await call(`${operations}/snapshots/${saved.id}/export`);assert.deepEqual(reopened.sections[0].tables.find((table:any)=>table.key==='record-owner'),table);
  const filters={ownerIds:['unassigned'],pipelineIds:[],...month,field:null},tile={id:'activities',source:'report',sourceId:id,version:'live',snapshotId:null,measure:'activities',kind:'table',width:12,height:1,bindings:{}};
  await call(`${dashboards}/${id}`,'PUT',{version:0,definition:{name:`Synthetic ${kind} owners`,filters,tiles:[tile]}});
  const board=await call(`${dashboards}/${id}/compute`,'POST',filters),result=board.tiles[0];assert.equal(result.status,'ready');
  const total=result.report.sections[0].totals.find((cell:any)=>cell.key==='total');assert.ok(total.rows.includes(noteKeys[kind][2]));assert.ok(!total.rows.includes(noteKeys[kind][0]));assert.ok(!total.rows.includes(noteKeys[kind][1]));assert.equal(total.value,total.rows.length);
  assert.ok(board.reps.some((rep:any)=>rep.id==='unassigned'));
  const reassignment=await call(`${native}/records/ownership/review`,'POST',{kind,ids:[fixture[kind][2]],ownerId:other});await call(`${native}/records/ownership/${reassignment.id}/apply`,'POST',{});
  const after=await call(`${dashboards}/${id}/compute`,'POST',filters);assert.ok(!after.tiles[0].report.sections[0].totals.find((cell:any)=>cell.key==='total').rows.includes(noteKeys[kind][2]),'Dashboard owner filter uses current ownership');
  const chosen=await call(`${dashboards}/${id}/compute`,'POST',{...filters,ownerIds:[other]});assert.ok(chosen.tiles[0].report.sections[0].totals.find((cell:any)=>cell.key==='total').rows.includes(noteKeys[kind][2]));
  if(limitedRequest){const denied=await limitedRequest(`${operations}/snapshots/${saved.id}/export`);assert.equal(denied.status,403);assert.doesNotMatch(await denied.text(),/synthetic-orbit-owner-report/);}
 }
 if(limitedRequest){const denied=await limitedRequest(`${operations}/metrics/synthetic-contact-owners/preview`,'POST',period);assert.equal(denied.status,403);assert.doesNotMatch(await denied.text(),/synthetic-orbit-owner-report/);}
 const historical=await call(`${operations}/snapshots/${nativeSaved.id}/export`);assert.deepEqual(historical.values.groups,nativePreview.values.groups,'A later ownership change does not rewrite or hide a saved measurement');
 return fixture;
}
