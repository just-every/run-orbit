import {proveApiCredentials} from '../support/api-credentials-proof';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isolatedDatabase} from '../support/isolated-database';
import {authorityFixture} from './authority-fixture';
import {snapshot} from '../../src/core/features/delegation/evidence';
import {writeHandoff} from '../../src/core/features/delegation/effects';
import {bearer} from '../../src/core/features/delegation/authority';

const target='opportunities/opp/handoffs/task';
async function effect(db:D1Database,key:string){const s=await snapshot(db,target,true);return {operationKey:key,operation:'orbit.handoff.upsert' as const,target,expectedRevision:s.revision,expectedAudienceRevision:s.audience.audienceRevision,content:{title:'Follow up internally',description:'Arrange customer onboarding',assigneeId:'peer',dueAt:'2026-10-10T00:00:00.000Z',status:'open' as const}};}
test('API-001 native credential lifecycle and delegation D1 reject ambient cookies, scope escalation, expiration, disable and revocation on every read/write',async()=>{
 const fixture=await isolatedDatabase(),db=fixture.db;
 try{
  const f=await authorityFixture(db);await proveApiCredentials(db,'owner',f.cookie,'stage');const g=await f.grant(),read=await f.grant('crm.evidence.read');
  assert.equal((await f.api.request('https://orbit.test/identity',{headers:{Cookie:f.cookie}})).status,401);
  assert.equal((await read.request('/effects',await effect(db,'read-only'))).status,403);
  assert.equal((await g.request('/check?target='+target)).status,200);
  assert.equal((await g.request('/audience?operation=orbit.handoff.upsert&target='+target)).status,200);
  assert.equal((await g.request('/audience?operation=outreach.send&target='+target)).status,422);
  assert.equal((await f.form('/authorize',{account_id:'other'})).status,400);
  assert.equal((await g.request('/effects',await effect(db,'committed'))).status,200);
  for(const mode of ['expired','revoked','disabled']){
   const h=await f.grant();
   if(mode==='expired')await db.prepare("UPDATE delegation_grants SET expires_at='2000-01-01' WHERE id=?").bind(h.id).run();
   if(mode==='revoked')assert.equal((await f.form('/grants/'+h.id+'/revoke',{})).status,303);
   if(mode==='disabled')assert.equal((await f.form('/clients/slate/disable',{})).status,303);
   for(const path of ['/identity','/check?target='+target,'/evidence?target='+target,'/audience?target='+target,'/effects/committed'])assert.equal((await h.request(path)).status,401,mode+' '+path);
   assert.equal((await h.request('/effects',await effect(db,mode))).status,401);
  }
 }finally{await fixture.dispose();}
});
test('delegation D1 transaction rolls back task, timeline, provenance and receipt together; concurrent exact replay has one effect',async()=>{
 const fixture=await isolatedDatabase(),db=fixture.db;
 try{
  const f=await authorityFixture(db),g=await f.grant();
  const input=await effect(db,'atomic'),grant=await bearer(db,new Request('https://orbit.test/api/delegation/v1/identity',{headers:{Authorization:'Bearer '+g.token}}));
  await db.exec("CREATE TRIGGER fail_receipt BEFORE INSERT ON delegation_receipts BEGIN SELECT RAISE(ABORT,'receipt failure'); END;");
  await assert.rejects(writeHandoff(db,input,{grant,actor:'owner'}),/receipt failure/);
  for(const table of ['handoff_tasks','handoff_contacts','delegation_receipts','delegation_guards'])assert.equal((await db.prepare(`SELECT count(*) n FROM ${table}`).first<{n:number}>())!.n,0,table);
  assert.equal((await db.prepare("SELECT count(*) n FROM timeline_entries WHERE source='orbit-handoff'").first<{n:number}>())!.n,0);
  await db.exec('DROP TRIGGER fail_receipt');
  const responses=await Promise.all([g.request('/effects',input),g.request('/effects',input)]);
  assert.deepEqual(responses.map(r=>r.status),[200,200]);
  const replayRevision=(await responses[0].clone().json()).receipt.afterRevision;
  for(const table of ['handoff_tasks','handoff_contacts','delegation_receipts'])assert.equal((await db.prepare(`SELECT count(*) n FROM ${table}`).first<{n:number}>())!.n,1,table);
  assert.equal((await db.prepare("SELECT count(*) n FROM timeline_entries WHERE source='orbit-handoff'").first<{n:number}>())!.n,1);
  assert.equal((await g.request('/effects',{...input,content:{...input.content,title:'Changed'}})).status,409);
  for(const status of ['completed','cancelled','open']){
   const update={...await effect(db,'native-'+status),content:{...input.content,title:'Native '+status,assigneeId:status==='cancelled'?null:'owner',dueAt:status==='completed'?null:'2026-10-11T00:00:00.000Z',status}};
   const r=await f.native.request('https://orbit.test/handoffs',{method:'POST',headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify(update)});assert.equal(r.status,200,await r.text());
   const recovered=await(await g.request('/effects/atomic')).json();assert.equal(recovered.receipt.afterRevision,replayRevision);assert.deepEqual(recovered.observed.content,update.content);
  }
  assert.equal((await db.prepare('SELECT count(*) n FROM outbound_messages').first<{n:number}>())!.n,0);
 }finally{await fixture.dispose();}
});

test('delegation D1 authority changing after snapshot refuses every durable effect',async()=>{
 const fixture=await isolatedDatabase(),db=fixture.db;
 try{
  const f=await authorityFixture(db),g=await f.grant(),grant=await bearer(db,new Request('https://orbit.test/api/delegation/v1/identity',{headers:{Authorization:'Bearer '+g.token}})),input=await effect(db,'revoked-in-dispatch');
  const wrapped={prepare:db.prepare.bind(db),async batch(statements:D1PreparedStatement[]){await db.prepare('UPDATE delegation_grants SET revoked_at=? WHERE id=?').bind(new Date().toISOString(),g.id).run();return db.batch(statements);}} as D1Database;
  await assert.rejects(writeHandoff(wrapped,input,{grant,actor:'owner'}),/REVISION_CONFLICT/);
  for(const table of ['handoff_tasks','handoff_contacts','delegation_receipts','delegation_guards'])assert.equal((await db.prepare(`SELECT count(*) n FROM ${table}`).first<{n:number}>())!.n,0,table);
  assert.equal((await g.request('/effects/revoked-in-dispatch')).status,401);
 }finally{await fixture.dispose();}
});
