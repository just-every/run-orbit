import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {unstable_DevEnv} from 'wrangler';
import {scheduleOutreach} from './scheduled-outreach.mjs';
import {waitForNativeServerCapacity} from '../support/native-server-load.mjs';

/** Cloudflare has not delivered a Cron tick in this fresh-install fixture. */
export async function holdCloudflareTimer(checkout){
 const path=join(checkout.root,'wrangler.jsonc');
 await writeFile(path,(await readFile(path,'utf8')).replace(/"crons":\s*\[[^\]]*\]/,'"crons": []'));
}

/** The native CLI session continues on the same host under hosted HTTPS settings. */
export async function hostedScheduling({checkout,page,port,bindings,opportunityURL,evidence}){
 await waitForNativeServerCapacity();
 const origin=`https://127.0.0.1:${port}`,runtime=new unstable_DevEnv(),submissions=[];
 try{
  const worker=await runtime.startWorker({
   config:join(checkout.root,'dist/server/wrangler.json'),
   bindings:{...bindings,AUTH_LOCAL:{type:'plain_text',value:'false'},AUTH_ORIGIN:{type:'plain_text',value:origin},MAIL_PROVIDER:{type:'plain_text',value:'sendgrid'}},
   dev:{remote:false,persist:join(checkout.root,'.wrangler/state'),watch:false,inspector:false,
    // TLS at the browser and Worker origin must agree with hosted identity.
    server:{hostname:'127.0.0.1',port,secure:true},origin:{secure:true},
    outboundService:async request=>{
     assert.equal(new URL(request.url).origin,'https://api.sendgrid.com');
     assert.equal(new URL(request.url).pathname,'/v3/mail/send');
     submissions.push(await request.json());
     return new Response(null,{status:202,headers:{'x-message-id':'test-paid-provider-acceptance'}});
    }
   }
  });
  await worker.ready;
  const hostedOpportunity=new URL(opportunityURL);hostedOpportunity.protocol='https:';
  await page.goto(hostedOpportunity.href);
  await scheduleOutreach(page,hostedOpportunity.href,evidence,submissions);
 }finally{await runtime.teardown();}
}
