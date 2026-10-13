import assert from 'node:assert/strict';
import {test} from 'node:test';
import {sqliteDatabase} from './sqlite';
import {canonical,hash,random,revision,effectSchema} from '../../src/core/features/delegation/protocol';
import {challenge} from '../../src/core/features/delegation/token';
import {delegationRoutes} from '../../src/core/features/delegation/routes';
import { testAuth } from '../support/test-auth';
import {snapshot} from '../../src/core/features/delegation/evidence';
import {archiveCatalog} from '../../src/core/features/records/archive-schema';
import {exercise} from './scenario';
test('canonicalization and strict mail exclusion',async()=>{assert.equal(canonical({z:[2,{b:1,a:'é'}],a:null}),' {"a":null,"z":[2,{"a":"é","b":1}]}'.trim());assert.equal(await revision({b:2,a:1}),await revision({a:1,b:2}));assert.throws(()=>canonical({a:Infinity}));assert.equal(effectSchema.safeParse({operation:'outreach.send'}).success,false);});
test('native consent, real SQL handoff, exact receipts, audience and current authority',async()=>{const fixture=sqliteDatabase();try{await exercise(fixture.db);}finally{fixture.close();}});

test('native edits during dispatch roll back the complete guarded mutation',async()=>{
 const fixture=sqliteDatabase(),db=fixture.db;
 try{
  await exercise(db);
  await db.prepare("UPDATE operators SET status='active' WHERE id='operator'").run();
  const target='opportunities/opp/handoffs/handoff',s=await snapshot(db,target);
  const {writeHandoff}=await import('../../src/core/features/delegation/effects');
  const wrapped={prepare:db.prepare.bind(db),async batch(statements:D1PreparedStatement[]){await db.prepare("UPDATE opportunities SET title='Concurrent native edit' WHERE id='opp'").run();return db.batch(statements);}} as D1Database;
  await assert.rejects(writeHandoff(wrapped,{operationKey:'racing',operation:'orbit.handoff.upsert',target,expectedRevision:s.revision,expectedAudienceRevision:s.audience.audienceRevision,content:{title:'Cannot commit',description:'No partial mutation',assigneeId:null,dueAt:null,status:'open'}},{actor:'operator'}),/REVISION_CONFLICT/);
  assert.equal((await db.prepare('SELECT title FROM handoff_tasks').first())!.title,'Arrange onboarding');assert.equal((await db.prepare('SELECT count(*) n FROM delegation_guards').first())!.n,0);
  // Parent deletion removes real tasks, while non-content receipt hashes remain auditable.
  await db.prepare("DELETE FROM opportunities WHERE id='opp'").run();assert.equal((await db.prepare('SELECT count(*) n FROM handoff_tasks').first())!.n,0);await assert.rejects(snapshot(db,target),/NOT_FOUND/);
 }finally{fixture.close();}
});


test('erasure follows retained handoff provenance after contacts are detached',async()=>{
 const fixture=sqliteDatabase(),db=fixture.db;
 try{
  await exercise(db);const now=new Date().toISOString();
  await db.prepare("INSERT INTO contacts(id,name,contactability,created_at,updated_at) VALUES('contact','Customer','contactable',?,?)").bind(now,now).run();
  await db.prepare("INSERT INTO handoff_contacts VALUES('handoff','contact')").run();
  await db.prepare("DELETE FROM contacts WHERE id='contact'").run();
  assert.equal((await db.prepare('SELECT count(*) n FROM handoff_tasks').first())!.n,0);
  assert.equal((await db.prepare('SELECT count(*) n FROM handoff_contacts').first())!.n,0);
  assert.equal((await db.prepare('SELECT count(*) n FROM delegation_receipts').first())!.n,1);
  assert.ok(!(await db.prepare('SELECT receipt_json FROM delegation_receipts').first<{receipt_json:string}>())!.receipt_json.includes('Arrange onboarding'));
 }finally{fixture.close();}
});
