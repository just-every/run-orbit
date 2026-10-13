import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {signedReplies,replyForm} from '../support/signed-reply';
import {createId} from '../../src/core/shared/ids';
import {archiveHash} from '../../src/core/features/records/archive-schema';
import {TestDataRepository} from '../support/record-data';

test('SIGNAL-003 legacy reply receipt and changed-payload diagnostic commit together or roll back completely',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),sent=await f.message(a.contactId,a.opportunityId,'accepted'),post=signedReplies(f.db),id=`<${createId()}@customer.test>`,data=new TestDataRepository(f.db);
  const form=(text='Customer reply body')=>{const value=replyForm(a.email,id,sent.messageId);value.set('text',text);return value;};
  assert.equal((await post(form())).status,200);
  await f.db.prepare('DELETE FROM mail_provider_events').run();
  const before=await archiveHash((await data.export()).tables);
  await f.db.prepare("CREATE TRIGGER test_legacy_conflict_failure BEFORE INSERT ON mail_provider_conflicts BEGIN SELECT RAISE(ABORT,'Injected legacy diagnostic failure'); END").run();
  assert.equal((await post(form('changed legacy reply'))).status,503);
  assert.equal(await archiveHash((await data.export()).tables),before,'A real D1 diagnostic failure must leave all original domain tables unchanged');
  await f.db.prepare('DROP TRIGGER test_legacy_conflict_failure').run();
  assert.deepEqual((await Promise.all([post(form('changed legacy reply')),post(form('other changed legacy reply'))])).map(response=>response.status),[200,200]);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n,1);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts').first())!.n,2);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,1);
  assert.equal((await f.db.prepare('SELECT body FROM unlinked_replies').first())!.body,'Customer reply body');
  assert.equal((await post(form('changed legacy reply'))).status,200);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts').first())!.n,2);
  // The exact first legacy replay can establish the full semantic receipt, once.
  await f.db.prepare('DELETE FROM mail_provider_conflicts').run();
  await f.db.prepare('DELETE FROM mail_provider_events').run();
  assert.deepEqual((await Promise.all([post(form()),post(form())])).map(response=>response.status),[200,200]);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts').first())!.n,0);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,1);
 }finally{await f.dispose();}
});
