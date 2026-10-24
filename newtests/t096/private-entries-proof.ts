import assert from 'node:assert/strict';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {createApp} from '../../tests/support/app';
import {createId} from '../../src/core/shared/ids';
import {snapshot} from '../../src/core/features/delegation/evidence';
import {collaborator,nativeRecord,type fixture} from './fixture';
export async function privateEntriesProof(f:Awaited<ReturnType<typeof fixture>>){
 const viewer=await collaborator(f,'guest'),deal=await nativeRecord(f,'opportunity',{title:'Synthetic private entry deal'}),app=createApp({database:f.db,sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)})!,captureOrigin:'https://orbit.test',assets:{fetch:async()=>new Response('')}}),base=`/api/v2/workspaces/workspace/records/opportunity/${deal.ref.id}`;
 await f.admin.grant(await f.nativeContext(),{subjectKind:'operator',subjectId:viewer.operator.operatorId,resourceType:'opportunity',resourceId:deal.ref.id,actions:['graph.read','entries.read'],fields:[],purpose:'Review notes, calls and meetings',expiresAt:null});
 async function request(path:string,cookie=f.cookie,method='GET',body?:unknown){return app.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}
 async function json(path:string,cookie=f.cookie,method='GET',body?:unknown,status=200){const response=await request(path,cookie,method,body);assert.equal(response.status,status,await response.clone().text());return await response.json() as any;}
 const entries=[];
 for(const kind of ['note','call','meeting']){const entry=await json(`/api/v1/records/opportunity/${deal.ref.id}/entries`,f.cookie,'POST',{kind,text:`Synthetic ${kind} private needle @${viewer.operator.email}`,occurredAt:new Date(Date.now()-1000).toISOString(),...(kind==='note'?{}:{durationMinutes:10})});entries.push(entry.id);}
 let shared=await json(base+'/entries',viewer.cookie);assert.deepEqual(shared.entries.map((e:any)=>e.id).sort(),[...entries].sort());
 const privacy=(source:string,id:string)=>`/api/v1/entries/visibility/${source}/${id}`;
 assert.equal((await request(privacy('entry',entries[0]),viewer.cookie,'PUT',{private:true})).status,403,'a collaborator cannot change entry visibility');
 await json(privacy('entry',entries[0]),f.cookie,'PUT',{private:true});
 shared=await json(base+'/entries',viewer.cookie);assert.deepEqual(shared.entries.map((e:any)=>e.id).sort(),entries.slice(1).sort(),'a private note is absent from Shared records despite the entries grant');
 const mentions=await json('/api/v1/records/mentions',viewer.cookie),notifications=await json('/api/v1/notifications',viewer.cookie);assert.equal(mentions.mentions.some((m:any)=>m.id===entries[0]),false);assert.equal(notifications.notifications.some((n:any)=>n.href?.includes(entries[0])),false,'a private mention never opens through notifications');
 const {legacyDatabase}=await import('../../src/core/features/access/legacy-database'),context=await f.access.resolveOperatorContext(viewer.operator,'workspace','private search'),scoped=legacyDatabase(f.db,context);
 assert.equal((await scoped.prepare('SELECT id FROM timeline_entries WHERE id=?').bind(entries[0]).all()).results.length,0,'record/search projection hides private entry');
 await json('/api/v2/access/workspaces/workspace/grants',f.cookie,'POST',{subjectKind:'operator',subjectId:viewer.operator.operatorId,resourceType:'legacy',resourceId:'*',actions:['legacy.read'],fields:[],purpose:'Exercise the native record search on the explicitly shared deal',expiresAt:null});
 const search='/api/v1/records/opportunity?q='+encodeURIComponent('Synthetic note private needle');assert.equal((await json(search,viewer.cookie)).records.length,0,'native record search cannot find the private note');assert.equal((await json(search)).records.some((record:any)=>record.id===deal.ref.id),true,'full operator search still finds its private note');
 assert.equal((await json(base+'/entries')).entries.some((e:any)=>e.id===entries[0]),true,'full operators retain equal access');
 const task=await json('/api/v1/tasks',f.cookie,'POST',{title:'Synthetic private task',recordType:'opportunity',recordId:deal.ref.id,ownerId:f.nativeOperator.operatorId,dueAt:new Date(Date.now()+86400000).toISOString(),priority:'normal',type:'other',notes:`Synthetic task note @${viewer.operator.email}`,recurrence:'none',timezone:'UTC',reminderMinutes:null},201);await json(privacy('task',task.id),f.cookie,'PUT',{private:true});assert.equal((await json(base+'/entries',viewer.cookie)).entries.some((e:any)=>e.id===task.id),false);
 const handoff=createId(),target=`opportunities/${deal.ref.id}/handoffs/${handoff}`,review=await snapshot(f.db,target,true);
 await json('/delegation/handoffs',f.cookie,'POST',{operationKey:createId(),operation:'orbit.handoff.upsert',target,expectedRevision:review.revision,expectedAudienceRevision:review.audience.audienceRevision,content:{title:'Synthetic private handoff',description:`Synthetic handoff @${viewer.operator.email}`,assigneeId:f.nativeOperator.operatorId,dueAt:null,status:'open'}});await json(privacy('handoff',handoff),f.cookie,'PUT',{private:true});assert.equal((await json(base+'/entries',viewer.cookie)).entries.some((e:any)=>e.id===handoff),false);
 assert.equal(await f.db.prepare("SELECT count(*) n FROM audit_entries WHERE action='entry.visibility' AND entity_id IN(?,?,?)").bind(entries[0],task.id,handoff).first('n'),3);
 const catalog=await (await import('../../src/core/features/records/archive-fold-catalog')).foldArchiveCatalog(f.db);assert.ok(catalog.some(t=>t.name==='entry_privacy'),'private visibility travels as record data, not authority');
 await json('/api/v1/calls/settings',f.cookie,'PUT',{accountSid:'AC'+'1'.repeat(32),token:'synthetic-orbit-call-secret',from:'+12025550101',operatorPhone:'+12025550102'});
 const restored=await (await import('../../tests/support/isolated-database')).isolatedDatabase();
 try{await (await import('../../tests/support/capture-privacy-archive')).localArchiveRoundTrip(f.db,restored.db);assert.equal(await restored.db.prepare('SELECT count(*) n FROM call_credentials').first('n'),0,'CLI archives never carry installation calling credentials');assert.deepEqual((await restored.db.prepare('SELECT * FROM entry_privacy ORDER BY source,entry_id').all()).results,(await f.db.prepare('SELECT * FROM entry_privacy ORDER BY source,entry_id').all()).results,'private visibility round-trips with its entry through the CLI portability engine');}finally{await restored.dispose();}
 await json(`/api/v1/records/opportunity/${deal.ref.id}/entries/${entries[0]}`,f.cookie,'DELETE',{});assert.equal(await f.db.prepare("SELECT 1 FROM entry_privacy WHERE source='entry' AND entry_id=?").bind(entries[0]).first(),null,'entry deletion erases its private flag');
 return {deal:deal.ref.id,viewer,entries};
}
