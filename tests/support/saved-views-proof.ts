import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {todayApp} from './today-workspace';
import {emailLinkSignIn} from './email-link';

/** Populated native routes prove definition custody, current reads and stale edits. */
export async function savedViewsProof(){const f=await isolatedDatabase();try{let t=await todayApp(f.db);const actor=t.actor,db=f.db,base='/api/v1/records/views';await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(actor).run();
 let other=await todayApp(db);const otherActor=other.actor,stage=await db.prepare('SELECT id FROM pipeline_stages LIMIT 1').first<string>('id');
 const definition={kind:'contact',fieldKey:'saved_rank',label:'Saved rank',valueType:'number',required:false,unique:false,options:[],archived:false};
 async function configure(input:any){const preview=await t.json<any>('/api/v1/settings/custom-fields/preview',{body:input},200);await t.json('/api/v1/settings/custom-fields/confirm',{body:{input,reviewHash:preview.reviewHash,confirmed:true}},200);}
 const retained:any[]=[],erasedEmail=['synthetic-orbit-saved-erasure','example.test'].join('@');
 for(const kind of ['contact','company','opportunity']){
  await configure({...definition,kind});
  const title=kind==='opportunity'?'title':'name',content=(name:string,rank:number)=>({[title]:name,custom_fields:{saved_rank:rank},...(kind==='opportunity'?{stage_id:stage,value_cents:0,contact_ids:[],owner_id:null}:{})});
  const a=await t.json<any>(`/api/v1/records/${kind}`,{body:{...content('Synthetic saved tie',2),...(kind==='contact'?{email:erasedEmail}:{})}},201),b=await t.json<any>(`/api/v1/records/${kind}`,{body:content('Synthetic saved tie',2)},201);
  await t.json(`/api/v1/records/${kind}`,{body:content('Synthetic excluded',0)},201);
  const input={name:`Synthetic ${kind} list`,kind,visibility:'private',q:'Synthetic saved',filters:{owner_id:'unassigned',...(kind==='opportunity'?{lifecycle:'open',pipeline_id:(await t.json<any>(`/api/v1/records/opportunity/${a.id}`)).record.pipeline_id,stage_id:stage,band:'low',queue_state:'none'}:{})},columns:[title,'custom:saved_rank'],sort:{column:'custom:saved_rank',direction:'asc'}};
  let saved=(await t.json<any>(base,{body:input},201)).view;
  assert.equal((await other.call(`${base}/${saved.id}`)).status,404,'another full operator cannot open a private view');
  assert.ok(!(await other.json<any>(base+`?kind=${kind}`)).views.some((v:any)=>v.id===saved.id));
  await f.close();await f.reopen();t=await todayApp(f.db,{operatorId:actor});other=await todayApp(f.db,{operatorId:otherActor});
  let opened=await t.json<any>(`${base}/${saved.id}`,{},200);assert.deepEqual(opened.view,saved,'fresh session preserves every filter, column and sort');assert.deepEqual(opened.records.map((r:any)=>r.id),[a.id,b.id].sort(),'sort ties use ascending record identity');
  const stale=saved.revision;saved=(await t.json<any>(`${base}/${saved.id}`,{method:'PUT',body:{revision:stale,view:{...input,name:'Synthetic shared list',visibility:'workspace',sort:{column:'custom:saved_rank',direction:'desc'}}}},200)).view;
  const current=await t.json<any>(`${base}/${saved.id}`);assert.equal((await t.call(`${base}/${saved.id}`,{method:'PUT',body:{revision:stale,view:input}})).status,409);assert.equal((await t.call(`${base}/${saved.id}`,{method:'DELETE',body:{revision:stale}})).status,409);assert.deepEqual(await t.json(`${base}/${saved.id}`),current,'stale mutations leave the current definition and records unchanged');
  assert.equal((await other.call(`${base}/${saved.id}`)).status,200,'workspace sharing permits a current full reader');assert.equal((await other.call(`${base}/${saved.id}`,{method:'DELETE',body:{revision:saved.revision}})).status,403);
  await t.json(`/api/v1/records/${kind}`,{body:content('Synthetic saved new row',3)},201);opened=await t.json<any>(`${base}/${saved.id}`);assert.equal(opened.records.length,3,'open recomputes populated results');assert.equal(JSON.parse(opened.records[0].custom_fields_json).saved_rank,3,'numeric sort is applied to current rows');
  async function assign(ownerId:string|null){if(kind==='opportunity'){await t.json(`/api/v1/records/opportunity/${a.id}`,{method:'PUT',body:{...content('Synthetic saved tie',2),owner_id:ownerId}},200);}else{const review=await t.json<any>('/api/v1/records/ownership/review',{body:{kind,ids:[a.id],ownerId}},200);const applied=await t.json<any>(`/api/v1/records/ownership/${review.id}/apply`,{body:{}},200);assert.equal(applied.items.filter((item:any)=>item.applied).length,1);}}
  await assign(actor);const owned=(await t.json<any>(base,{body:{...input,name:'Synthetic owned view',filters:{...input.filters,owner_id:actor}}},201)).view;
  assert.deepEqual((await t.json<any>(`${base}/${owned.id}`,{},200)).records.map((r:any)=>r.id),[a.id],'a saved owner filter selects the assigned current record');await assign(null);assert.equal((await t.json<any>(`${base}/${owned.id}`,{},200)).records.length,0,'reassignment is recomputed when reopening');await t.json(`${base}/${owned.id}`,{method:'DELETE',body:{revision:owned.revision}},200);
  await configure({...definition,kind,label:'Archived saved rank'});await configure({...definition,kind,label:'Archived saved rank',archived:true});opened=await t.json<any>(`${base}/${saved.id}`);assert.deepEqual(opened.columns.find((c:any)=>c.key==='custom:saved_rank'),{key:'custom:saved_rank',label:'Archived saved rank',archived:true});assert.equal(JSON.parse(opened.records[0].custom_fields_json).saved_rank,3);
  let count=3;if(kind==='contact'){
   const personal=[];
   for(const property of ['q','name']){
    const view=(await t.json<any>(base,{body:{...input,visibility:'workspace',[property]:erasedEmail}},201)).view;
    assert.ok((await other.json<any>(`${base}/${view.id}`)).records.some((r:any)=>r.id===a.id),'a current full reader opens the populated mailbox-bearing view before erasure');personal.push(view);
   }
   await t.json(`/api/v1/records/contact/${a.id}`,{method:'DELETE',body:{confirmed:true}},200);
   for(const view of personal){assert.equal((await t.call(`${base}/${view.id}`)).status,404);assert.equal((await other.call(`${base}/${view.id}`)).status,404);assert.equal((await t.call(`${base}/${view.id}`,{method:'PUT',body:{revision:view.revision,view:input}})).status,404,'a stale edit cannot recreate an erased definition');}
   assert.ok(!JSON.stringify(await other.json(base+'?kind=contact')).includes(erasedEmail),'saved-view discovery exposes no erased mailbox');
   opened=await t.json<any>(`${base}/${saved.id}`,{},200);assert.ok(!opened.records.some((r:any)=>r.id===a.id),'erasure cannot be resurrected by a saved result');count=2;
  }
  retained.push({saved,input,count});
 }
 const invitation=await t.json<any>('/api/v2/access/workspaces/workspace/invitations',{body:{email:['synthetic-orbit-viewer','example.test'].join('@'),role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()}},200),guest=await emailLinkSignIn(f.db,['synthetic-orbit-viewer','example.test'].join('@'));
 const request=(path:string,method='GET',body?:unknown)=>t.app.request('https://orbit.test'+path,{method,headers:{cookie:guest.cookie,origin:'https://orbit.test','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await request('/api/v2/access/invitations/accept','POST',{token:invitation.token})).status,200);
 const before=(await f.db.prepare('SELECT * FROM record_saved_views ORDER BY id').all()).results;
 for(const row of retained){assert.equal((await request(`${base}/${row.saved.id}`)).status,403,'collaborator cannot open workspace view without full authority');assert.equal((await request(base,'POST',row.input)).status,403,'collaborator cannot save workspace data');}
 assert.equal((await request(base+'?kind=contact')).status,403);assert.deepEqual((await f.db.prepare('SELECT * FROM record_saved_views ORDER BY id').all()).results,before);
 const revoked=await todayApp(f.db);await f.db.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(revoked.actor).run();assert.equal((await revoked.call(`${base}/${retained[0].saved.id}`)).status,401);
 const target=await isolatedDatabase();try{
 let exported=await t.json<any>('/api/v1/records/archive/exports',{body:{}},201);for(let step=0;step<300&&exported.state!=='ready';step++)exported=await t.json<any>(`/api/v1/records/archive/exports/${exported.id}/advance`,{body:{}},200);assert.equal(exported.state,'ready');const archive=await t.json<any>(`/api/v1/records/archive/exports/${exported.id}/download`,{},200);assert.deepEqual(archive.parts.flatMap((part:any)=>part.records).filter((record:any)=>record.table==='record_saved_views').map((record:any)=>record.row).sort((a:any,b:any)=>a.id.localeCompare(b.id)),before,'populated public export contains every saved definition');
 const destination=await todayApp(target.db,{operatorId:actor});await target.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(destination.actor).run();let imported=await destination.json<any>('/api/v1/records/archive/imports',{body:{manifest:archive.manifest,confirmed:true}},201);for(const part of archive.parts)await destination.json(`/api/v1/records/archive/imports/${imported.id}/parts/${part.index}`,{method:'PUT',body:part},200);for(let step=0;step<2000&&imported.state!=='complete';step++)imported=await destination.json<any>(`/api/v1/records/archive/imports/${imported.id}/finalize`,{body:{}},200);assert.equal(imported.state,'complete');assert.equal((await destination.app.request('https://orbit.test/api/v1/records/views',{headers:{cookie:`__Host-orbit_session=${t.session.token}`}})).status,401,'source sessions never travel with saved definitions');
 assert.ok(!JSON.stringify(archive).includes(erasedEmail),'populated export contains no erased mailbox-bearing definition');assert.deepEqual((await target.db.prepare('SELECT * FROM record_saved_views ORDER BY id').all()).results,before,'populated public export and restore retains definitions and revision');const restored=await todayApp(target.db,{operatorId:actor});for(const row of retained){const opened=await restored.json<any>(`${base}/${row.saved.id}`,{},200);assert.equal(opened.records.length,row.count);assert.equal(opened.columns[1].label,'Archived saved rank');assert.equal(opened.view.revision,row.saved.revision);}}finally{await target.dispose();}
 for(const row of retained){await t.json(`${base}/${row.saved.id}`,{method:'DELETE',body:{revision:row.saved.revision}},200);assert.equal((await t.call(`${base}/${row.saved.id}`)).status,404);}
 console.log(JSON.stringify({proof:'saved-record-views',kinds:retained.map(row=>row.saved.kind),viewsRestored:retained.length,privateRead:404,workspaceRead:200,staleEdit:409,staleDelete:409,collaboratorRead:403,collaboratorWrite:403,revokedSession:401,stableTies:true,currentOwners:true,archivedColumns:true,erasure:true,erasedDefinitions:true}));
 }finally{await f.dispose();}}
