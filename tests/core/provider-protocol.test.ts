import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {isolatedDatabase} from '../support/isolated-database';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';
test('SIGNAL-009 signed relay accepts its full one MiB protocol envelope and rejects oversize or modified bodies',async()=>{
 const p=await isolatedDatabase();try{const secret='protocol-test-secret-'.repeat(3),app=createMailEventRoutes(p.db,{relaySecret:secret}),timestamp=String(Math.floor(Date.now()/1000));
 const raw=JSON.stringify(Array.from({length:400},(_,i)=>({sg_event_id:`protocol-${i}`,event:'delivered',timestamp:Number(timestamp),email:'unmatched@example.invalid',reason:'x'.repeat(800),rer_product:'orbit'})));assert.ok(Buffer.byteLength(raw)>262144);assert.ok(Buffer.byteLength(raw)<1048576);const signature=await signRelayBody(secret,timestamp,raw);
 const post=(body:string,sig:string)=>app.request('https://orbit.test/relay',{method:'POST',headers:{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':sig},body});assert.equal((await post(raw,signature)).status,200);assert.equal((await post(raw+' ',signature)).status,401);assert.equal((await post('x'.repeat(1048577),signature)).status,413);
 }finally{await p.dispose();}
});
test('OUT-004 native signed multipart reply preserves decoded text and rejects tampering before any record is written',async()=>{
 const p=await isolatedDatabase();try{const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),publicKey=keys.publicKey.export({type:'spki',format:'der'}).toString('base64'),app=createMailEventRoutes(p.db,{parseKey:publicKey});
 const form=new FormData();form.set('from','Customer <customer@example.invalid>');form.set('subject','Signed reply');form.set('text','A genuine multipart body with accents: café.');form.set('headers','Message-ID: <signed-multipart@example.invalid>\r\nDate: Sun, 13 Sep 2026 01:00:00 +0000\r\nReferences: <unmatched@example.invalid>');const request=new Request('https://orbit.test/reply',{method:'POST',body:form}),raw=Buffer.from(await request.arrayBuffer()),timestamp=String(Math.floor(Date.now()/1000)),signature=sign('sha256',Buffer.concat([Buffer.from(timestamp),raw]),keys.privateKey).toString('base64');
 const post=(body:Buffer)=>app.request('https://orbit.test/reply',{method:'POST',headers:{'content-type':request.headers.get('content-type')!,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':signature},body});assert.equal((await post(Buffer.concat([raw,Buffer.from('tampered')]))).status,401);assert.equal((await p.db.prepare('SELECT COUNT(*) n FROM unlinked_replies').first<{n:number}>())!.n,0);assert.equal((await post(raw)).status,200);assert.equal((await post(raw)).status,200);const rows=(await p.db.prepare('SELECT body,subject,opportunity_id FROM unlinked_replies').all()).results;assert.deepEqual(rows,[{body:'A genuine multipart body with accents: café.',subject:'Signed reply',opportunity_id:null}]);
 }finally{await p.dispose();}
});
