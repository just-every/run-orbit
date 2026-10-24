import {isolatedDatabase} from '../../tests/support/isolated-database';
import assert from 'node:assert/strict';
import type {Hono} from 'hono';
import {fixture,signIn} from './fixture';
import {createApp} from '../../tests/support/app';
import {archiveHttp,httpArchive,httpRestore} from './archive-http-proof';
import {localArchiveRoundTrip} from '../../tests/support/capture-privacy-archive';
export async function formsMappedCustody(f:Awaited<ReturnType<typeof fixture>>,app:Hono<any>,cookie:string,input:{formId:string;contactId:string;email:string;submitted:string}){
 const archive=await httpArchive(archiveHttp(app,()=>cookie)),target=await fixture();try{
  assert.ok(archive.parts.flatMap(part=>part.records).some(record=>record.table==='marketing_form_submissions'&&JSON.stringify(record.row).includes(input.submitted)),'the export carries submitted hidden values');
  let restoredCookie=target.cookie;const restored=createApp({database:target.db,assets:{fetch:async()=>new Response(null,{status:404})}});await httpRestore(archiveHttp(restored,()=>restoredCookie),archive);restoredCookie=(await signIn(target.db,'owner@fold.test')).cookie;
  for(const table of ['form_assignment_rotation','content_entities','marketing_form_submissions','consent_events','capture_proposals'])assert.deepEqual((await target.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results,(await f.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results,`${table} survives Records transfer`);
  const local=await isolatedDatabase();try{await localArchiveRoundTrip(f.db,local.db);for(const table of ['form_assignment_rotation','content_entities','marketing_form_submissions'])assert.deepEqual((await local.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results,(await f.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results,`${table} survives local CLI transfer`);}finally{await local.dispose();}
  const erased=await restored.request(`https://orbit.test/api/v1/records/contact/${input.contactId}`,{method:'DELETE',headers:{Cookie:restoredCookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({confirmed:true})});assert.equal(erased.status,200,await erased.clone().text());
  const fresh=await httpArchive(archiveHttp(restored,()=>restoredCookie));for(const value of [input.email,input.submitted]){const copies=fresh.parts.flatMap(part=>part.records).filter(record=>JSON.stringify(record.row).includes(value)).map(record=>record.table);assert.deepEqual(copies,[],'Erasure removes mapped source, proposal, consent, hidden-field and destination mailbox copies');}assert.equal(await target.db.prepare('SELECT count(*) n FROM form_assignment_rotation WHERE form_id=?').bind(input.formId).first('n'),1);
 }finally{await target.close();}
}
