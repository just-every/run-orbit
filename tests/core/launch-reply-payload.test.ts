import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {signedReplies,replyForm} from '../support/signed-reply';
import {createId} from '../../src/core/shared/ids';
import {archiveHash} from '../../src/core/features/records/archive-schema';

test('SIGNAL-003 signed reply conflicts include extra and duplicate fields, headers and complete file semantics',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),sent=await f.message(a.contactId,a.opportunityId,'accepted'),scheduled=await f.message(a.contactId,a.opportunityId),post=signedReplies(f.db),id=`<${createId()}@customer.test>`;
  const form=()=>{const value=replyForm(a.email,id,sent.messageId);value.set('envelope',JSON.stringify({from:a.email}));value.append('attachment',new File(['original attachment'],'evidence.txt',{type:'text/plain'}));return value;};
  assert.equal((await post(form())).status,200);
  const snapshot=async()=>archiveHash({receipt:(await f.db.prepare('SELECT * FROM mail_provider_events').all()).results,messages:(await f.db.prepare('SELECT * FROM outbound_messages').all()).results,signals:(await f.db.prepare('SELECT * FROM signals').all()).results,replies:(await f.db.prepare('SELECT * FROM unlinked_replies').all()).results});
  const before=await snapshot();
  assert.equal((await post(form())).status,200,'Generated multipart boundary does not change semantics');
  assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts').first())!.n,0);
  const variants=[
   (value:FormData)=>value.set('envelope','changed provider envelope'),
   (value:FormData)=>value.set('headers',`${value.get('headers')}\r\nAuthentication-Results: extra.test; dkim=pass`),
   (value:FormData)=>value.append('text','duplicate secret text'),
   (value:FormData)=>value.append('headers','X-Extra: duplicate header field'),
   (value:FormData)=>value.set('attachment',new File(['changed attachment'],'evidence.txt',{type:'text/plain'})),
   (value:FormData)=>value.set('attachment',new File(['original attachment'],'renamed.txt',{type:'text/plain'})),
   (value:FormData)=>value.set('new-provider-field','unparsed provider secret')
  ];
  for(const [index,mutate] of variants.entries()){
   const value=form();mutate(value);assert.equal((await post(value)).status,200);assert.equal((await post(value)).status,200);
   assert.equal((await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts').first())!.n,index+1);
   assert.equal(await snapshot(),before,'Accepted receipt and every original effect remain immutable');
  }
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
  const diagnostics=JSON.stringify((await f.db.prepare('SELECT * FROM mail_provider_conflicts').all()).results)+JSON.stringify((await f.db.prepare('SELECT * FROM source_event_errors').all()).results);
  for(const raw of [a.email,id,'duplicate secret text','unparsed provider secret','changed attachment'])assert.equal(diagnostics.includes(raw),false);
 }finally{await f.dispose();}
});
