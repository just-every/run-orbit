import assert from 'node:assert/strict';
import type {RejectedReportProofContext} from './agent-door-proof';
import {createApp} from '../../src/core/app/app';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';

/** Public MCP and native HTTP journeys share the real report store and managed owner admission. */
export async function savedReportDeletionProof({bindings,door,cookie,reviewerCookie,ownerId,sourceId,period,adopt,businessCall}:RejectedReportProofContext){
 const db=bindings.DB,origin=bindings.AUTH_ORIGIN!,agent={sub:'synthetic-orbit-report-remover',name:'Report assistant'};
 const call=async(name:string,args:Record<string,unknown>,overrides:Record<string,unknown>={})=>{
  const response=await businessCall(name,args,{act:agent,...overrides});
  assert.equal(response.status,200,JSON.stringify(response.body));return response.body.result;
 };
 const done=async(name:string,args:Record<string,unknown>)=>{const answer=await call(name,args);assert.equal(answer.isError,false,JSON.stringify(answer));return answer.structuredContent;};
 const preview=(id:string)=>done('orbit.reports.deletion_preview',{id});
 const deletion=(id:string,revision:string,key:string)=>({id,review_hash:revision,expected_revision:revision,idempotency_key:'synthetic-orbit-delete-'+key});
 const definition={name:'Native report deletion proof',description:'Count current native opportunities',aggregation:'count',unit:'opportunities',sourceTypes:['opportunity'],sourceOperation:'graph.read',sourceFields:[],filters:{id:sourceId},currency:null,missingPolicy:'incomplete',lateArrival:'recompute',attributionModel:'none',attributionWindowDays:30};
 const snapshot=async(id:string,version=1)=>{
  const range={...period,id,version},read=await done('orbit.reports.preview',range);
  return done('orbit.reports.compute',{...range,review_hash:read.reviewHash,idempotency_key:crypto.randomUUID()});
 };
 const create=async(id:string)=>{
  await done('orbit.reports.update',{id,version:1,definition,idempotency_key:crypto.randomUUID()});
  const first=await snapshot(id);
  await done('orbit.reports.update',{id,version:2,definition:{...definition,name:'Second saved version'},idempotency_key:crypto.randomUUID()});
  const second=await snapshot(id,2);return [first.id,second.id].sort();
 };
 const nativeState=async()=>Object.fromEntries(await Promise.all(['analytics_definitions','analytics_snapshots','analytics_snapshot_sources','analytics_report_shares','graph_records','opportunities','contacts','companies','sales_dashboard_versions','domain_events','domain_audit'].map(async table=>[table,(await db.prepare('SELECT * FROM '+table).all()).results.map(row=>JSON.stringify(row)).sort()])));
 const effects=async(id:string)=>(await db.prepare("SELECT actor_json,details_ref FROM domain_audit WHERE operation='analytics.deleted' AND json_extract(resource_json,'$.id')=?").bind(id).all<{actor_json:string;details_ref:string}>()).results;
 const audit=async()=>{
  const response=await door.handle(new Request(origin+'/agents/api/audit?agent='+agent.sub,{headers:{Cookie:cookie}}));
  assert.equal(response!.status,200);return (await response!.json() as any).rows as any[];
 };
 await adopt(autonomousPolicy());
 const listed=await businessCall('',{},{},'tools/list');
 const deleteTool=listed.body.result.tools.find((tool:any)=>tool.name==='orbit.reports.delete');
 assert.ok(deleteTool);assert.equal(deleteTool.annotations.readOnlyHint,false);assert.equal(deleteTool.annotations.destructiveHint,true);
 assert.deepEqual(deleteTool._meta['com.runeditrun/classes'],['destructive']);
 const app=createApp({database:db,assets:{fetch:async()=>new Response('asset')},authenticate:request=>operatorFromRequest(request,bindings),stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)});
 const workspace=await db.prepare('SELECT id FROM access_workspaces LIMIT 1').first<string>('id');
 const native=(id:string,method='GET',hash?:string)=>app.request(origin+'/api/v2/workspaces/'+workspace+'/operations/reports/'+id+(method==='GET'?'/deletion-preview':hash?'?reviewHash='+hash:''),{method,headers:{Cookie:cookie,Origin:origin}});

 const autonomousId='synthetic-orbit-autonomous-delete',snapshotIds=await create(autonomousId),scope=await preview(autonomousId);
 assert.deepEqual(scope.snapshotIds,snapshotIds);assert.deepEqual(scope.definitionVersions,[1,2]);
 assert.equal(scope.reportCount,1);assert.equal(scope.snapshotCount,2);assert.equal(scope.affectedItemCount,3);
 const httpPreview=await native(autonomousId);assert.equal(httpPreview.status,200);assert.deepEqual(await httpPreview.json(),scope,'both doors derive the same saved scope');
 const unrelated=await nativeState(),args=deletion(autonomousId,scope.revision,'autonomous');
 const autonomous=await call('orbit.reports.delete',{...args,classes:['standard'],affected_item_count:0,confirmed:true});
 assert.equal(autonomous.isError,false,JSON.stringify(autonomous));assert.deepEqual(autonomous.structuredContent,{deleted:true});
 assert.equal(autonomous._meta['com.runeditrun/decision'].disposition,'autonomous');
 assert.deepEqual(autonomous._meta['com.runeditrun/decision'].classes.map(({class:cls,facts}:any)=>({class:cls,facts})),[{class:'destructive',facts:{measure:3}}],'caller flags cannot change native affected item facts');
 assert.equal(await db.prepare('SELECT count(*) n FROM analytics_definitions WHERE id=?').bind(autonomousId).first('n'),0);
 assert.equal(await db.prepare('SELECT count(*) n FROM analytics_snapshots WHERE definition_id=?').bind(autonomousId).first('n'),0);
 assert.equal(await db.prepare('SELECT count(*) n FROM analytics_snapshot_sources WHERE snapshot_id IN(SELECT value FROM json_each(?))').bind(JSON.stringify(snapshotIds)).first('n'),0);
 const after=await nativeState();
 for(const table of ['graph_records','opportunities','contacts','companies','sales_dashboard_versions'])assert.deepEqual(after[table],unrelated[table],'report removal preserves '+table);
 assert.deepEqual(after.analytics_definitions,unrelated.analytics_definitions!.filter(row=>JSON.parse(row).id!==autonomousId));
 assert.deepEqual(after.analytics_snapshots,unrelated.analytics_snapshots!.filter(row=>JSON.parse(row).definition_id!==autonomousId));
 const replay=await call('orbit.reports.delete',args);assert.equal(replay.isError,false);assert.deepEqual(replay.structuredContent,autonomous.structuredContent);
 assert.deepEqual(replay._meta['com.runeditrun/decision'].classes.map(({class:cls,facts}:any)=>({class:cls,facts})),[{class:'destructive',facts:{measure:3}}]);
 assert.deepEqual(await nativeState(),after,'completed replay performs no second native deletion or audit effect');
 const autonomousAudit=(await audit()).find(row=>row.id===autonomous._meta['com.runeditrun/decision'].id);
 assert.deepEqual(autonomousAudit.resource,{kind:'report',id:autonomousId});assert.equal(autonomousAudit.decision,'autonomous');
 assert.equal(autonomousAudit.agent.id,agent.sub);assert.equal(autonomousAudit.sponsor.id,ownerId);
 assert.equal((await effects(autonomousId)).length,1);
 const nativeAudit=(await effects(autonomousId))[0]!;
 assert.equal(JSON.parse(nativeAudit.actor_json).agent.id,agent.sub);
 assert.deepEqual(JSON.parse(nativeAudit.details_ref),{ownerId,reviewHash:scope.revision,reportCount:1,snapshotCount:2,affectedItemCount:3});

 const heldId='synthetic-orbit-held-delete';await create(heldId);const heldScope=await preview(heldId);
 const held=heldPolicy();held.rules.find((rule:{do:string})=>rule.do==='approval')!.approver=['person:business-owner'];
 await adopt(held);
 const heldArgs=deletion(heldId,heldScope.revision,'held'),beforeHeld=await nativeState(),pending=await call('orbit.reports.delete',heldArgs);
 assert.equal(pending.resultType,'input_required');assert.ok(pending.requestState);assert.equal(pending.structuredContent,undefined);
 assert.equal(pending._meta['com.runeditrun/decision'].disposition,'approval');
 assert.deepEqual(await nativeState(),beforeHeld,'holding destructive work changes no native state');
 const approvalId=pending._meta['com.runeditrun/approval'].id;
 const approvalRequest=(id:string,action?:string,body?:object,session=cookie)=>new Request(origin+'/agents/api/approvals/'+id+(action?'/'+action:''),{method:action?'POST':'GET',headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const readApproval=async(id:string,session=cookie)=>{const response=await door.handle(approvalRequest(id,undefined,undefined,session));assert.equal(response!.status,200);return (await response!.json() as any).approval;};
 const approve=async(id:string,session=cookie)=>{const saved=await readApproval(id,session),response=await door.handle(approvalRequest(id,'approve',{revision:saved.revision,summary_sha256:saved.summary_sha256},session));assert.equal(response!.status,200);return (await response!.json() as any).approval;};
 const approval=await readApproval(approvalId);
 assert.deepEqual(approval.classes,[{class:'destructive',facts:{measure:3}}]);
 assert.deepEqual(approval.approvers,['person:business-owner']);assert.equal(approval.prepared_by.agent.id,agent.sub);assert.equal(approval.prepared_by.for.id,ownerId);
 for(const item of ['Reports: 1','Snapshots: 2','Affected items: 3','Native review: '+heldScope.revision])assert.ok(approval.summary.items.includes(item));
 for(const id of heldScope.snapshotIds)assert.ok(approval.summary.items.some((item:string)=>item.includes(id)));
 const pendingReplay=await call('orbit.reports.delete',heldArgs);assert.equal(pendingReplay._meta['com.runeditrun/approval'].id,approvalId);
 assert.deepEqual(await nativeState(),beforeHeld);
 assert.equal((await approve(approvalId)).state,'executed');
 const executed=await nativeState();assert.equal((await effects(heldId)).length,1);
 assert.equal((await approve(approvalId)).state,'executed');assert.deepEqual(await nativeState(),executed,'repeated person approval has one native effect');
 const heldReplay=await call('orbit.reports.delete',heldArgs);assert.equal(heldReplay.isError,false);assert.deepEqual(heldReplay.structuredContent,{deleted:true});
 assert.deepEqual(heldReplay._meta['com.runeditrun/receipt'].approved_by,[ownerId]);
 assert.equal(heldReplay._meta['com.runeditrun/receipt'].prepared_by.agent.id,agent.sub);
 assert.deepEqual(await nativeState(),executed);
 const retained=(await audit()).filter(row=>row.tool==='orbit.reports.delete'&&row.resource?.id===heldId);
 assert.ok(retained.some(row=>row.outcome==='pending'&&row.classes.some((item:any)=>item.class==='destructive'&&item.facts.measure===3)));
 assert.ok(retained.some(row=>row.outcome==='done'&&row.approval?.by.includes(ownerId)&&row.agent.id===agent.sub&&row.sponsor.id===ownerId));

 await adopt(autonomousPolicy());
 const staleId='synthetic-orbit-stale-delete';await create(staleId);const old=await preview(staleId);
 await adopt(held);const staleArgs=deletion(staleId,old.revision,'stale'),stalePending=await call('orbit.reports.delete',staleArgs);
 assert.equal(stalePending.resultType,'input_required');
 await adopt(autonomousPolicy());await snapshot(staleId,2);const fresh=await preview(staleId);
 assert.equal(fresh.affectedItemCount,4);assert.notEqual(fresh.revision,old.revision);
 const beforeStale=await nativeState(),stale=await call('orbit.reports.delete',deletion(staleId,old.revision,'stale-direct'));
 assert.equal(stale._meta['com.runeditrun/error'].code,'revision_conflict');assert.deepEqual(await nativeState(),beforeStale);
 const staleNative=await native(staleId,'DELETE',old.revision);assert.equal(staleNative.status,409);assert.deepEqual(await nativeState(),beforeStale);
 // A fresh hold at the old exact scope is refused even when policy itself stays unchanged.
 await adopt(held);const currentHold=await call('orbit.reports.delete',deletion(staleId,fresh.revision,'stale-held'));
 const changedDefinition={...definition,name:'Changed after person review'};
 const member=await db.prepare("SELECT id FROM operators WHERE id<>? AND status='active' LIMIT 1").bind(ownerId).first<string>('id');assert.ok(member);
 // Native report management remains separate from being a full operator.
 const wrongManager=await call('orbit.reports.delete',deletion(staleId,fresh.revision,'foreign'),{sub:'business-jamie',act:{sub:'synthetic-orbit-other-remover',name:'Other report assistant'}});
 assert.equal(wrongManager._meta['com.runeditrun/error'].code,'resource_unavailable');assert.deepEqual(await nativeState(),beforeStale);
 const header={Cookie:cookie,Origin:origin,'Content-Type':'application/json'};
 const defineNative=await app.request(origin+'/api/v2/workspaces/'+workspace+'/operations/metrics',{method:'POST',headers:header,body:JSON.stringify({id:staleId,version:3,definition:changedDefinition})});
 assert.equal(defineNative.status,200,await defineNative.clone().text());
 const changedState=await nativeState(),staleApproval=await approve(currentHold._meta['com.runeditrun/approval'].id);
 assert.equal(staleApproval.state,'refused');assert.equal(staleApproval.code,'revision_conflict');assert.deepEqual(await nativeState(),changedState);

 // Current owner authority is checked again on a pending action and a completed replay.
 await adopt(autonomousPolicy());const accessId='synthetic-orbit-current-access-delete';await create(accessId);const accessScope=await preview(accessId);
 const accessHeld=heldPolicy();accessHeld.rules.find((rule:{do:string})=>rule.do==='approval')!.approver=['person:business-jamie'];
 await adopt(accessHeld);const accessArgs=deletion(accessId,accessScope.revision,'access'),accessPending=await call('orbit.reports.delete',accessArgs);
 await db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(ownerId).run();
 const removedState=await nativeState(),removed=await businessCall('orbit.reports.delete',accessArgs,{act:agent});
 // The signed MCP token cannot map a removed sponsor, so authentication fails before tools run.
 assert.equal(removed.status,401);assert.equal(removed.body.result,undefined);
 const replayRemoved=await businessCall('orbit.reports.delete',args,{act:agent});assert.equal(replayRemoved.status,401);assert.equal(replayRemoved.body.result,undefined);
 const lostAuthorityApproval=await approve(accessPending._meta['com.runeditrun/approval'].id,reviewerCookie);
 assert.equal(lostAuthorityApproval.state,'refused');assert.equal(lostAuthorityApproval.code,'sponsor_unavailable');
 assert.deepEqual(await nativeState(),removedState,'person approval cannot revive a removed sponsor');
 await db.prepare("UPDATE operators SET status='active' WHERE id=?").bind(ownerId).run();
 await adopt(autonomousPolicy());
 const nativeId='synthetic-orbit-http-delete';await create(nativeId);const nativeScope=await preview(nativeId);
 const nativeDelete=await native(nativeId,'DELETE',nativeScope.revision);assert.equal(nativeDelete.status,200);assert.deepEqual(await nativeDelete.json(),{deleted:true});
 const httpAudit=(await effects(nativeId))[0]!;assert.equal(JSON.parse(httpAudit.actor_json).operatorId,ownerId);
 const httpFacts=JSON.parse(httpAudit.details_ref);assert.equal(httpFacts.affectedItemCount,3);assert.equal(httpFacts.snapshotCount,2);assert.equal(httpFacts.reportCount,1);
 const unanswered=autonomousPolicy();unanswered.rules=[{id:'standard-only',class:'standard',do:'autonomous'}];await adopt(unanswered);
 const unansweredScope=await preview(accessId),unansweredState=await nativeState();
 const unset=await call('orbit.reports.delete',deletion(accessId,unansweredScope.revision,'unanswered'));
 assert.equal(unset._meta['com.runeditrun/error'].code,'policy_unset');assert.deepEqual(await nativeState(),unansweredState,'no destructive default is invented for an unanswered company class');
 console.log(JSON.stringify({proof:'SURFACE-007.saved-report-deletion',autonomous:{id:autonomousId,affected:3,decision:autonomous._meta['com.runeditrun/decision'].id},approval:{id:approvalId,affected:3,oneEffect:true},staleScopeRefused:true,currentAccessRefused:true,replayWithoutEffect:true,retainedFactsAndAttribution:true,nativeHttpParity:true,unansweredClassUnchanged:true}));
}
