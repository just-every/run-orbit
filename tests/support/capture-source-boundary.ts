import assert from 'node:assert/strict';
import {createApp} from './app';
import {eml,type CaptureFixture} from './capture-fixture';
import {createSourceSecurity,payloadHash} from '../../src/core/platform/source-security';
import {signSource} from '../../src/core/features/ingestion/booking-webhooks';
import {IngestionRepository} from '../../src/core/features/ingestion/repository';
import {connectSource} from '../../src/core/features/capture/sources';

/** Drive the signed HTTP doors, including the original pre-emption of a real reply. */
export async function captureSourceBoundary(f:CaptureFixture,reply:string){
 const security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'22'.repeat(32)})!,repository=new IngestionRepository(f.db);
 const app=createApp({database:f.db,assets:{fetch:async()=>new Response('')},sourceSecurity:security});
 const request=(path:string,method:string,body:unknown)=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{cookie:f.cookie,origin:'https://orbit.test','content-type':'application/json'},body:JSON.stringify(body)});
 const secret='test-only-legacy-signing-secret',ciphertext=await security.seal(secret),at=new Date().toISOString();
 const seed=async(id:string,type:string)=>f.db.prepare('INSERT INTO signal_sources(id,name,type,enabled,secret_ciphertext,created_at,updated_at) VALUES(?,?,?,1,?,?,?)').bind(id,id,type,ciphertext,at,at).run();
 const signed=async(id:string,eventId:string)=>{
  const raw=JSON.stringify({eventId,type:`${id}:note`,subject:'Pre-empt',occurredAt:at}),timestamp=String(Math.floor(Date.now()/1000));
  return app.request(`https://orbit.test/api/v1/signals/${id}`,{method:'POST',headers:{'content-type':'application/json','X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':await signSource(secret,`${timestamp}.${raw}`)},body:raw});
 };
 const refused=async(id:string)=>{
  for(const [method,suffix,body] of [['PUT','',{name:'Signed tool',enabled:true}],['PATCH','',{enabled:true}],['POST','/test',{contactId:f.ana}]] as const)
   assert.equal((await request(`sources/${id}${suffix}`,method,body)).status,403,`${method} refuses ${id}`);
  assert.equal((await signed(id,'blocked')).status,403,`signed ingress refuses ${id}`);
 };
 // An absent reserved ID cannot be pre-claimed, including future provider IDs.
 await refused('capture-future');
 assert.equal(await repository.source('capture-future'),null);
 // Registration may not adopt a pre-existing signed row or its secret.
 await seed('capture-files','signed_webhook');
 const legacy=await repository.source('capture-files');
 assert.equal((await f.upload([{name:'reply.eml',text:reply}])).status,409);
 assert.deepEqual(await repository.source('capture-files'),legacy);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_sources').first('n'),0);
 await f.db.prepare("DELETE FROM signal_sources WHERE id='capture-files'").run();
 const bob=eml({From:'bob@acme.example',To:'seller@orbit.test',Date:new Date(Date.now()-60000).toUTCString(),'Message-ID':'<boundary-bob@acme.example>'},'Hello');
 assert.equal((await f.upload([{name:'bob.eml',text:bob}])).status,201);
 const original=await repository.source('capture-files');
 await refused('capture-files');
 assert.deepEqual(await repository.source('capture-files'),original,'configuration refusal changes no source');
 // Legacy capture rows with a signing secret are refused, including IDs outside the namespace.
 await f.db.prepare("UPDATE signal_sources SET secret_ciphertext=? WHERE id='capture-files'").bind(ciphertext).run();
 await seed('old-mailbox','capture');await seed('capture-legacy','signed_webhook');
 await refused('old-mailbox');await refused('capture-legacy');
 const replyEvent='message:'+await payloadHash('<question-1@acme.example>');
 assert.equal((await signed('capture-files',replyEvent)).status,403);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM signals WHERE source_event_id=?').bind(replyEvent).first('n'),0);
 assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(f.scheduled).first('state'),'scheduled');
 // The caller imports the exact real reply next and checks that it cancels this send.
 const provider={id:'capture-provider',adapter:'test-provider',name:'Provider',scope:{mail:{folders:['INBOX']}},credential:'test-only-provider-grant'};
 await seed(provider.id,'signed_webhook');
 await assert.rejects(connectSource(f.db,provider,security,f.operator),/another source type/);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM capture_credentials WHERE source_id=?').bind(provider.id).first('n'),0);
 await f.db.prepare('DELETE FROM signal_sources WHERE id=?').bind(provider.id).run();
 await connectSource(f.db,provider,security,f.operator);
 assert.equal((await repository.source(provider.id))?.type,'capture');
 assert.equal((await repository.source(provider.id))?.secret_ciphertext,null);
 await f.db.prepare('UPDATE signal_sources SET secret_ciphertext=? WHERE id=?').bind(ciphertext,provider.id).run();
 await connectSource(f.db,provider,security,f.operator);
 assert.equal((await repository.source(provider.id))?.secret_ciphertext,null,'reconnect clears a legacy signed secret');

 // A verified authority snapshot cannot commit or replay once its row becomes capture.
 await seed('changing-source','signed_webhook');
 const authority=(await repository.source('changing-source'))!;
 const event={eventId:'before-conversion',type:'changing-source:note',subject:'Ordinary source',occurredAt:at};
 const raw=JSON.stringify(event),hash=await payloadHash(raw);
 await repository.ingest('changing-source',event,hash,raw,authority);
 await f.db.prepare("UPDATE signal_sources SET type='capture' WHERE id='changing-source'").run();
 for(const candidate of [event,{...event,eventId:'after-conversion'}])
  await assert.rejects(repository.ingest('changing-source',candidate,hash,raw,authority),/Source authority changed/);
 assert.equal(await f.db.prepare("SELECT count(*) n FROM signals WHERE source_id='changing-source'").first('n'),1);
 const reservedAuthority=(await repository.source('capture-legacy'))!;
 await assert.rejects(repository.ingest('capture-legacy',{...event,eventId:'reserved'},hash,raw,reservedAuthority),/Source authority changed/);
 // Ordinary signed tools retain configure, enable, test and signed intake.
 assert.equal((await request('sources/ordinary-tool','PUT',{name:'Tool',enabled:true})).status,200);
 assert.equal((await request('sources/ordinary-tool','PATCH',{enabled:true})).status,200);
 assert.equal((await request('sources/ordinary-tool/test','POST',{contactId:f.bob})).status,201);
}
