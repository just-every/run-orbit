import assert from 'node:assert/strict';
import {Agent,request} from 'node:http';
import {generateKeyPairSync,sign} from 'node:crypto';
import {signRelayBody} from '../../src/base/sendgrid-event-relay/crypto';

export type MailKind='relay'|'sendgrid'|'reply';
export function mailTransportKeys(){
 const secret=crypto.randomUUID()+crypto.randomUUID(),keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const publicKey=keys.publicKey.export({type:'spki',format:'der'}).toString('base64');
 return {
  bindings:{RER_MAIL_RELAY_SECRET:secret,SENDGRID_WEBHOOK_PUBLIC_KEY:publicKey,SENDGRID_PARSE_PUBLIC_KEY:publicKey},
  async headers(kind:MailKind,body:Uint8Array,identity:string){
   const timestamp=String(Math.floor(Date.now()/1000));
   const signature=kind==='relay'?await signRelayBody(secret,timestamp,body):sign('sha256',Buffer.concat([Buffer.from(timestamp),body]),keys.privateKey).toString('base64');
   return {'CF-Connecting-IP':identity,...(kind==='relay'?{'x-rer-mail-timestamp':timestamp,'x-rer-mail-signature':signature}:{'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':signature})};
  }
 };
}

/** Real HTTP/1 framing: omitting length uses chunked transfer, never a buffered fetch body. */
export function mailTransportClient(origin:string){
 const agent=new Agent({keepAlive:true,maxSockets:1});
 async function send(path:string,headers:Record<string,string>,chunks:Uint8Array[],tail:'end'|'stall'='end'){
  return new Promise<{status:number;category:string;retryAfter:string|undefined;connection:string|undefined}>((resolve,reject)=>{
   let uploadComplete:Promise<void>;
   const req=request(origin+path,{method:'POST',agent,headers},response=>{
    const received:Buffer[]=[];let bytes=0;
    response.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes<=65536)received.push(chunk);});
    response.on('error',()=>reject(Error('HTTP response stream failed')));
    response.on('end',async()=>{
     clearTimeout(timer);
     const text=Buffer.concat(received).toString();
     const category=text.includes('Network connection lost')?'proxy-network-loss':text.includes('MiniflareProxyWorker')?'proxy-error':text.includes('payload limit')?'body-limit':text.includes('rate limit')?'rate-limit':text.includes('accepted')?'accepted':text.includes('persist')||text.includes('storage')?'storage-error':'other';
     if(tail==='stall')await new Promise<void>(resolve=>{req.once('close',resolve);req.destroy();});
     else await uploadComplete;
     resolve({status:response.statusCode!,category,connection:response.headers.connection,retryAfter:typeof response.headers['retry-after']==='string'?response.headers['retry-after']:undefined});
    });
   });
   const timer=setTimeout(()=>{req.destroy();reject(Error('HTTP response deadline exceeded'));},8000);
   req.on('error',()=>{clearTimeout(timer);reject(Error('HTTP request transport failed'));});
   req.flushHeaders();
   uploadComplete=(async()=>{
    for(const chunk of chunks){
     if(req.destroyed)break;
     await new Promise<void>((resolve,reject)=>req.write(chunk,error=>error?reject(Error('HTTP upload failed')):resolve()));
     // Separate writes reach the server independently, including the final over-limit byte.
     await new Promise(resolve=>setTimeout(resolve,2));
    }
    if(tail==='end'&&!req.destroyed)req.end();
   })().catch(error=>{clearTimeout(timer);req.destroy();reject(error);});
  });
 }
 return {send,close:()=>agent.destroy()};
}

export function mailBody(kind:MailKind,size?:number){
 if(kind!=='reply'){
  const base=Buffer.from('[ ]\n');
  return {body:size===undefined?base:Buffer.concat([base,Buffer.alloc(size-base.length,32)]),type:'application/json'};
 }
 const boundary='orbit-'+crypto.randomUUID();
 const prefix=Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="from"\r\n\r\ntransport@customer.test\r\n--${boundary}\r\nContent-Disposition: form-data; name="headers"\r\n\r\nMessage-ID: <${crypto.randomUUID()}@customer.test>\r\nDate: ${new Date().toUTCString()}\r\n--${boundary}\r\nContent-Disposition: form-data; name="text"\r\n\r\ncafé ☃ `);
 const suffix=Buffer.from(`\r\n--${boundary}--\r\n`);
 const padding=size===undefined?0:size-prefix.length-suffix.length;assert.ok(padding>=0);
 return {body:Buffer.concat([prefix,Buffer.alloc(padding,120),suffix]),type:`multipart/form-data; boundary=${boundary}`};
}
