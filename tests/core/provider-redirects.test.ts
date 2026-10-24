import {signInDomains} from '../support/sign-in-domains';
import assert from 'node:assert/strict';
import {createServer, type Server} from 'node:http';
import {test} from 'node:test';
import {createAIProvider} from '../../src/core/features/assistance/provider';
import {identityMailSender} from '../../src/core/features/identity';
import type {PlatformBindings} from '../../src/core/platform/assets';
import {SendGridSendError} from '../../src/base/modules/mail/src/sendgrid-email/index.mjs';
import {createOutboundMail} from '../../src/core/platform/outbound-mail';

async function listen(server:Server) {
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();
 assert.ok(address&&typeof address!=='string');
 return `http://127.0.0.1:${address.port}`;
}
async function close(server:Server) {
 server.closeAllConnections();
 await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}

test('BASE-DATA-004 BASE-DATA-005 AI-002 OUT-012 provider redirects never reach a second destination or become success',async()=>{
 const nativeFetch=globalThis.fetch;
 let redirectStatus=301,initialRequests=0,destinationRequests=0;
 const destination=createServer((_request,response)=>{
  destinationRequests++;
  response.writeHead(200,{'content-type':'application/json'});
  response.end(JSON.stringify({messages:[{msg_id:'unexpected-success',status:'delivered'}],status:'completed',usage:{input_tokens:1,output_tokens:1},output:[{content:[{type:'output_text',text:JSON.stringify({explanation:'Unexpected redirect result',subject:'Redirect',body:'Redirected private data',evidenceIds:['private-evidence']})}]}]}));
 });
 const destinationUrl=await listen(destination);
 const provider=createServer((request,response)=>{
  initialRequests++;
  request.resume();
  response.writeHead(redirectStatus,{location:destinationUrl});
  response.end();
 });
 try {
  const providerUrl=await listen(provider);
  // Map only the fixed provider entry points. Native fetch owns all redirect behavior.
  globalThis.fetch=(input,init)=>{
   const url=String(input);
   assert.ok(url==='https://api.openai.com/v1/responses'||url==='https://api.sendgrid.com/v3/mail/send'||url.startsWith('https://api.sendgrid.com/v3/messages?'));
   return nativeFetch(providerUrl,init);
  };
  const ai=createAIProvider({OPENAI_API_KEY:'local-test-key',AI_MODEL:'test-model',AI_INPUT_COST_PER_MILLION:'1',AI_OUTPUT_COST_PER_MILLION:'1'})!;
  const mail=createOutboundMail({SENDGRID_API_KEY:'local-test-key',MAIL_FROM:'sender@example.invalid',MAIL_REPLY_TO:'reply@example.invalid',SENDGRID_UNSUBSCRIBE_GROUP_ID:'1'})!;
  const auth=identityMailSender({AUTH_ORIGIN:'https://orbit.example.invalid',SENDGRID_API_KEY:'local-test-key',MAIL_FROM:'sender@example.invalid'} as PlatformBindings)!;
  for(const status of [301,302,303,307,308]) {
   redirectStatus=status;
   const before=initialRequests;
   await assert.rejects(ai.generate({evidence:'private-evidence'}),new RegExp(`HTTP ${status}`));
   assert.equal(initialRequests,before+1,`AI must not retry HTTP ${status}`);
   await assert.rejects(mail.lookup!('private-delivery-id'),new RegExp(`lookup failed \\(${status}\\)`));
   assert.equal(initialRequests,before+2,`lookup must not retry HTTP ${status}`);
   const ambiguous=(error:unknown)=>error instanceof SendGridSendError&&error.outcome==='ambiguous'&&error.status===status;
   await assert.rejects(mail.send({id:'local-outreach',recipient_email:'customer@example.invalid',subject:'Private subject',body:'Private body'}),ambiguous);
   assert.equal(initialRequests,before+3,`outreach must not retry HTTP ${status}`);
   assert.equal((await auth.send({deliveryId:'local-auth',from:'sender@example.invalid',to:['operator@example.invalid'],subject:'Sign in',text:'https://orbit.example.invalid/auth/confirm?token=private-token',html:'',headers:{}})).status,'uncertain','an unconfirmed sign-in mail is reported uncertain, never accepted');
   assert.equal(initialRequests,before+4,`authentication must not retry HTTP ${status}`);
   assert.equal(destinationRequests,0,`HTTP ${status} must not forward any request`);
  }
 } finally {
  globalThis.fetch=nativeFetch;
  await Promise.all([close(provider),close(destination)]);
 }
});

test('OPS-001 linked OIDC enforces reviewed domain policy, verified invited operators, recovery and next-request revocation',async()=>{await signInDomains();});
