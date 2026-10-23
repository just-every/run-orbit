import {generateKeyPairSync,sign} from 'node:crypto';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';

export function signedReplies(db:D1Database){
 const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),app=createMailEventRoutes(db,{parseKey:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')});
 return async(form:FormData)=>{
  const request=new Request('https://orbit.test/reply',{method:'POST',body:form}),raw=Buffer.from(await request.arrayBuffer()),timestamp=String(Math.floor(Date.now()/1000));
  return app.request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')!,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':sign('sha256',Buffer.concat([Buffer.from(timestamp),raw]),keys.privateKey).toString('base64')},body:raw});
 };
}
export function replyForm(from:string,id:string,references:string){
 const form=new FormData();form.set('from',from);form.set('subject','Actual customer reply');form.set('text','Customer reply body');
 form.set('headers',`Message-ID: ${id}\r\nDate: Mon, 05 Oct 2026 12:00:00 GMT\r\nReferences: ${references}`);
 return form;
}
/** The provider's signed delivery HTTP edge, without a provider account. */
export function signedDeliveryEvents(db:D1Database){
 const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),app=createMailEventRoutes(db,{eventKey:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')});
 return async(events:unknown[])=>{const body=JSON.stringify(events),timestamp=String(Math.floor(Date.now()/1000));return app.request('https://orbit.test/sendgrid',{method:'POST',headers:{'Content-Type':'application/json','X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':sign('sha256',Buffer.from(timestamp+body),keys.privateKey).toString('base64')},body});};
}
