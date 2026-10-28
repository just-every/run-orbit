import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import type {CaptureFixture} from '../../tests/support/capture-fixture';
import {createId} from '../../src/core/shared/ids';
import {issueNativeCredential} from '../../tests/support/api-credentials-proof';

/** Library revisions and opt-out links are content; API credentials are local authority. */
export async function portableLibrary(f:CaptureFixture){
 const now=new Date().toISOString(),library=['template','snippet','signature'].map((kind,index)=>({id:createId(),kind,name:'Portable '+kind,subject:kind==='template'?'Hello {{contact.name}}':'',body:'Saved '+kind+' 雪',visibility:index===1?'private':'shared',owner_id:f.operator,revision:index+1,updated_at:now}));
 for(const row of library)await f.db.prepare('INSERT INTO message_library(id,kind,name,subject,body,visibility,owner_id,revision,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(...Object.values(row)).run();
 const id=createId(),metadata={library_selection_json:JSON.stringify(Object.fromEntries(library.map(row=>[row.kind,{id:row.id,revision:row.revision}]))),merge_review_json:null};
 await f.db.prepare('INSERT INTO drafts(id,opportunity_id,author_id,recipient_contact_id,recipient_email,subject,body,created_at,updated_at,library_selection_json) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,f.opportunity,f.operator,f.ana,'ana@acme.example','Portable library selection','Saved draft body',now,now,metadata.library_selection_json).run();
 const capability={token:randomBytes(32).toString('hex'),message_id:f.scheduled,contact_id:f.ana,origin:'https://orbit.test',created_at:now};
 await f.db.batch([f.db.prepare("INSERT OR REPLACE INTO outbound_message_opt_out VALUES(?,1,'added')").bind(f.scheduled),f.db.prepare('INSERT OR REPLACE INTO outbound_opt_out_capabilities VALUES(?,?,?,?,?)').bind(...Object.values(capability))]);
 const credential=await issueNativeCredential(f.db,f.operator,f.opportunity),sort=(rows:unknown[])=>rows.map(row=>JSON.stringify(row)).sort();
 return{
  assertExport(archive:any){assert.ok(!JSON.stringify(archive).includes(credential.secret));assert.ok(!archive.manifest.tables.some((table:any)=>table.name==='api_credentials'));},
  async assertRestored(db:D1Database){
   assert.equal(await db.prepare('SELECT count(*) n FROM api_credentials').first('n'),0);
   assert.deepEqual(sort((await db.prepare('SELECT * FROM message_library').all()).results),sort(library));
   assert.deepEqual(await db.prepare('SELECT library_selection_json,merge_review_json FROM drafts WHERE id=?').bind(id).first(),metadata);
   assert.deepEqual(await db.prepare('SELECT * FROM outbound_opt_out_capabilities WHERE token=?').bind(capability.token).first(),capability);
   assert.deepEqual(await db.prepare('SELECT * FROM outbound_message_opt_out WHERE message_id=?').bind(f.scheduled).first(),{message_id:f.scheduled,carries:1,marking:'added'});
  }
 };
}
