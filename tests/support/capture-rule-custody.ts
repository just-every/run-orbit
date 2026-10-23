import assert from 'node:assert/strict';
import {fixture,signIn} from '../../newtests/t096/fixture';
import {archiveHttp,httpArchive,httpRestore} from '../../newtests/t096/archive-http-proof';
import {createApp} from './app';
import {isolatedDatabase} from './isolated-database';
import {localArchiveRoundTrip} from './capture-privacy-archive';
export async function captureRuleCustody(f:any){
 const archive=await httpArchive(archiveHttp(f.app,()=>f.cookie)),target=await fixture();try{
  let cookie=target.cookie;const app=createApp({database:target.db,assets:{fetch:async()=>new Response(null,{status:404})}});await httpRestore(archiveHttp(app,()=>cookie),archive);cookie=(await signIn(target.db,'seller@orbit.test')).cookie;
  assert.equal(await target.db.prepare("SELECT capture_mail_rule FROM workspace_settings WHERE id='workspace'").first('capture_mail_rule'),'all');const local=await isolatedDatabase();try{await localArchiveRoundTrip(target.db,local.db);assert.equal(await local.db.prepare("SELECT capture_mail_rule FROM workspace_settings WHERE id='workspace'").first('capture_mail_rule'),'all');assert.deepEqual((await local.db.prepare("SELECT payload_json FROM timeline_entries WHERE kind='capture.association_corrected' ORDER BY id").all()).results,(await target.db.prepare("SELECT payload_json FROM timeline_entries WHERE kind='capture.association_corrected' ORDER BY id").all()).results);}finally{await local.dispose();}
  const response=await app.request(`https://orbit.test/api/v1/records/contact/${f.ana}`,{method:'DELETE',headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({confirmed:true})});assert.equal(response.status,200,await response.clone().text());const erased=await httpArchive(archiveHttp(app,()=>cookie));const retained=erased.parts.flatMap(part=>part.records.filter(record=>JSON.stringify(record.row).includes('ana@acme.example')).map(record=>({table:record.table,columns:Object.entries(record.row).filter(([,value])=>typeof value==='string'&&value.includes('ana@acme.example')).map(([column])=>column)})));assert.deepEqual(retained,[],'Erased mailbox remains in archive fields');assert.equal(await target.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='capture.association_corrected' AND EXISTS(SELECT 1 FROM json_each(timeline_entries.payload_json,'$.contactIds') WHERE value=?)").bind(f.ana).first('n'),0);
 }finally{await target.close();}
}
