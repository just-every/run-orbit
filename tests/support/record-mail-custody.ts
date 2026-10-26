import assert from 'node:assert/strict';
import type {Hono} from 'hono';
import {fixture,signIn} from '../../newtests/t096/fixture';
import {archiveHttp,httpArchive,httpRestore} from '../../newtests/t096/archive-http-proof';
import {createApp} from './app';
import {isolatedDatabase} from './isolated-database';
import {localArchiveRoundTrip} from './capture-privacy-archive';
export async function recordMailCustody(f:Awaited<ReturnType<typeof fixture>>,app:Hono<any>,cookie:string,contactId:string,email:string){
 const archive=await httpArchive(archiveHttp(app,()=>cookie)),target=await fixture();try{
  let receiver=target.cookie;const restored=createApp({database:target.db,assets:{fetch:async()=>new Response(null,{status:404})}});await httpRestore(archiveHttp(restored,()=>receiver),archive);receiver=(await signIn(target.db,'owner@fold.test')).cookie;
  for(const table of ['record_mail_outbound_messages','record_mail_obligations'])assert.deepEqual((await target.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results,(await f.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results);
  assert.equal(await target.db.prepare('SELECT count(*) n FROM record_mail_drafts WHERE is_stale=0').first('n'),0);
  const local=await isolatedDatabase();try{await localArchiveRoundTrip(target.db,local.db);assert.deepEqual((await local.db.prepare('SELECT id,body,state FROM record_mail_outbound_messages ORDER BY id').all()).results,(await target.db.prepare('SELECT id,body,state FROM record_mail_outbound_messages ORDER BY id').all()).results);}finally{await local.dispose();}
  const response=await restored.request(`https://orbit.test/api/v1/records/contact/${contactId}`,{method:'DELETE',headers:{Cookie:receiver,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({confirmed:true})});assert.equal(response.status,200,await response.clone().text());const erased=await httpArchive(archiveHttp(restored,()=>receiver));assert.ok(!JSON.stringify(erased.parts).includes(email));assert.equal(await target.db.prepare('SELECT count(*) n FROM record_mail_drafts WHERE recipient_contact_id=?').bind(contactId).first('n'),0);assert.equal(await target.db.prepare("SELECT count(*) n FROM notifications WHERE kind='customer.reply'").first('n'),0,'Restored shared-key reply notifications erase with their contact');
 }finally{await target.close();}
}
