import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture as nativeFixture,collaborator,nativeRecord} from './fixture';
import {OperationsStore} from '../../src/core/features/operations/store';
import {AnalyticsMetrics} from '../../src/core/features/analytics/metrics';
import {NativeAnalyticsSources} from '../../src/core/features/analytics/native-sources';
import {domainEventStatements} from '../../src/core/features/effects/event-statements';
import {ensureOpenOpportunitiesDefinition,previewOpenOpportunities,saveOpenOpportunities} from '../../src/core/features/analytics/built-in-report';
const command=<T>(input:T,expectedRevision?:number)=>({schemaVersion:1 as const,requestId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),input,expectedRevision});
async function fixture(){const f=await nativeFixture(),store=new OperationsStore(f.db,f.access,domainEventStatements),metrics=new AnalyticsMetrics(store,new NativeAnalyticsSources(f.access)),record=await nativeRecord(f,'opportunity',{title:'Native report source'}),definition=await ensureOpenOpportunitiesDefinition(metrics,await f.context());
 const graph=Object.assign(f.graph,{async updateRecord(ctx:any,cmd:any){const before=await f.records.detail('opportunity',cmd.input.record.id);await f.access.authorize(ctx,'graph.update',cmd.input.record,Object.keys(cmd.input.fields));await f.records.save('opportunity',{...before.record,...cmd.input.fields,custom_fields:JSON.parse(before.record.custom_fields_json),contact_ids:[],primary_contact_id:null},f.operator.operatorId,cmd.input.record.id);return f.graph.getRecord(await f.context(),cmd.input.record,[]);}});
 return Object.assign(f,{metrics,graph,record,definition});}
async function readOnly(f:Awaited<ReturnType<typeof fixture>>){const session=await collaborator(f);await f.admin.setRoleBundle(await f.nativeContext(),'analyst',['analytics.read','graph.read','graph.search'],['lifecycle']);f.operator=session.operator;return f.context();}
// Exact selected assertion statements come from the preserved original source.
// Setup uses a distinct accepted collaborator; native-full equality is separately tested.
test('native owner preview/save/reopen and reader cannot persist either report path',async()=>{
 const f=await fixture();try{
 const ctx=await f.context(),preview=await previewOpenOpportunities(f.metrics,f.graph,ctx,1);
 assert.equal(preview.values.value,1);assert.equal(await f.db.prepare('SELECT count(*) n FROM analytics_snapshots').first('n'),0);
 const saved=await saveOpenOpportunities(f.metrics,f.graph,ctx,1,preview.reviewHash);
 assert.equal((await f.metrics.listSnapshots(ctx,f.definition.id,1)).items[0].id,saved.id);
 const reader=await readOnly(f),readPreview=await previewOpenOpportunities(f.metrics,f.graph,reader,1);
 await assert.rejects(saveOpenOpportunities(f.metrics,f.graph,reader,1,readPreview.reviewHash),/not permitted/);
 await assert.rejects(f.metrics.compute(reader,f.definition.id,1,'2026-01-01T00:00:00.000Z','2026-02-01T00:00:00.000Z'),/not permitted/);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM analytics_snapshots').first('n'),1);
 }finally{await f.close();}
});
test('saved report outer disclosure rejects a native session revoked after the final row read',async()=>{
 const f=await fixture();try{
 const ctx=await f.context(),preview=await previewOpenOpportunities(f.metrics,f.graph,ctx,1);
 await saveOpenOpportunities(f.metrics,f.graph,ctx,1,preview.reviewHash);
 const read=f.metrics.read.bind(f.metrics);f.metrics.read=async(c,id)=>{const result=await read(c,id);await f.db.prepare('UPDATE sessions SET revoked_at=? WHERE id=?').bind(new Date().toISOString(),f.operator.sessionId).run();return result;};
 await assert.rejects(f.metrics.listSnapshots(ctx,f.definition.id,1));
 }finally{await f.close();}
});
test('source changes invalidate report preview and revoked fields cannot be listed',async()=>{
 const f=await fixture();try{
 const ctx=await f.context(),preview=await previewOpenOpportunities(f.metrics,f.graph,ctx,1);
 await saveOpenOpportunities(f.metrics,f.graph,ctx,1,preview.reviewHash);
 await f.graph.updateRecord(ctx,command({record:f.record.ref,fields:{title:'Changed'},evidence:[]},f.record.ref.revision));
 await assert.rejects(saveOpenOpportunities(f.metrics,f.graph,ctx,1,preview.reviewHash),/changed/);
 await assert.rejects(f.metrics.listSnapshots(ctx,f.definition.id,1),/changed/);
 await assert.rejects(previewOpenOpportunities(f.metrics,f.graph,{...ctx,tenantId:'wrong'},1));
 }finally{await f.close();}
});
test('report list rejects revoked source fields after reading its last row',async()=>{
 const f=await fixture();try{
 const ctx=await f.context(),preview=await previewOpenOpportunities(f.metrics,f.graph,ctx,1);
 await saveOpenOpportunities(f.metrics,f.graph,ctx,1,preview.reviewHash);
 const reader=await readOnly(f),read=f.metrics.read.bind(f.metrics);
 f.metrics.read=async(c,id)=>{const snapshot=await read(c,id);await f.db.prepare('UPDATE access_role_bundles SET fields_json=? WHERE role=?').bind('["title"]','analyst').run();return snapshot;};
 await assert.rejects(f.metrics.listSnapshots(reader,f.definition.id,1));
 }finally{await f.close();}
});
test('custom report writer retains access to its authorized private opportunity',async()=>{
 const f=await fixture();try{
 await readOnly(f);
 await f.db.prepare('UPDATE access_role_bundles SET actions_json=? WHERE role=?').bind(JSON.stringify(['analytics.read','analytics.snapshot','graph.read','graph.search']),'analyst').run();
 await f.db.prepare("UPDATE graph_records SET visibility='restricted',owner_id=? WHERE id=?").bind(f.nativeOperator.operatorId,f.record.ref.id).run();
 await f.admin.grant(await f.nativeContext(),{subjectKind:'operator',subjectId:f.operator.operatorId,resourceType:'opportunity',resourceId:f.record.ref.id,actions:['graph.read','graph.search'],fields:['lifecycle'],purpose:'Read the native-owned restricted report source',expiresAt:null});
 const ctx=await f.context(),preview=await previewOpenOpportunities(f.metrics,f.graph,ctx,1);
 assert.equal(preview.values.value,1);
 const saved=await saveOpenOpportunities(f.metrics,f.graph,ctx,1,preview.reviewHash);
 assert.equal((await f.metrics.read(ctx,saved.id)).values.value,1);
 }finally{await f.close();}
});
