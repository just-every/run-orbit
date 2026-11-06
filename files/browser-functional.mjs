import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
const require=createRequire(process.cwd()+'/package.json');
const {chromium}=require('@playwright/test');
const packet=new URL('./packet/',import.meta.url).pathname;
const origin='http://127.0.0.1:15870';
const issued=JSON.parse(execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','tests/support/issue-operator-session.ts'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:900},extraHTTPHeaders:{Cookie:`${issued.cookieName}=${issued.token}`}});
const page=await context.newPage();
const observations={source:'3b0ce18793254ec00c67e677dad3b081c3cb83d2',browser:'headless /usr/bin/chromium --no-sandbox',freshContext:true,realHome:true,steps:[],screens:[]};
const check=(condition,message)=>{if(!condition)throw Error(message);};
const api=async(path,method='GET',data)=>{
 const r=await page.request.fetch(origin+'/api/v1/'+path,{method,headers:{Origin:origin},...(data===undefined?{}:{data})});
 check(r.ok(),`${method} ${path}: HTTP ${r.status()} ${await r.text()}`);
 return r.json();
};
try{
 await page.goto(origin+'/app',{waitUntil:'networkidle'});
 await page.getByRole('link',{name:'Open Fieldhouse Studio workspace'}).click();
 await page.getByTestId('next-action').waitFor();
 const id=new URL(page.url()).pathname.split('/').at(-1);
 const before=(await api('opportunities/'+id)).opportunity;
 check(before.lifecycle==='open','Fixture deal must be open');
 const contact=before.contacts[0];check(contact?.email,'Populated contact required');
 const configured=await api('sources/ct-evaluation-review','PUT',{name:'CT disposable signed evidence',enabled:true});
 const input={eventId:crypto.randomUUID(),type:'email.replied',subject:'CT disposable customer reply',occurredAt:new Date().toISOString(),email:contact.email};
 const raw=JSON.stringify(input),timestamp=String(Math.floor(Date.now()/1000));
 const signature=createHmac('sha256',configured.secret).update(timestamp+'.'+raw).digest('hex');
 const accepted=await page.request.post(origin+'/api/v1/signals/ct-evaluation-review',{headers:{'X-Orbit-Timestamp':timestamp,'X-Orbit-Signature':signature,'Content-Type':'application/json'},data:raw});
 check(accepted.status()===201,'Signed reply must be accepted');
 const scored=(await api('opportunities/'+id)).opportunity;
 check(scored.evaluation?.contributions.some(item=>item.signalType==='email.replied'&&item.contribution===40),'Native evaluation must include the actual fresh reply at 40 points');
 observations.steps.push({name:'signed populated HTTP ingestion and native detail',http:201,score:scored.score,band:scored.band,evaluationId:scored.evaluation.id,policyVersion:scored.evaluation.policyVersion,contributions:scored.evaluation.contributions.map(c=>({type:c.signalType,contribution:c.contribution}))});
 await page.reload({waitUntil:'networkidle'});
 const evidence=page.getByTestId('contributing-evidence');await evidence.locator('summary').click();
 check((await evidence.innerText()).includes('CT disposable customer reply'),'Browser must render real signed evidence');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  await page.screenshot({path:packet+`browser-${width}.png`,fullPage:true});
  observations.screens.push({width,file:`browser-${width}.png`});
 }
 // Exercise the real People control. This changes an association through the same native save that the product uses.
 await page.setViewportSize({width:1440,height:900});
 const peopleBefore=await api('relationships/opportunity/'+id);
 const firstName=peopleBefore.stakeholders[0].name??peopleBefore.stakeholders[0].email;
 const put=page.waitForResponse(r=>r.url()===origin+'/api/v1/relationships/opportunity/'+id&&r.request().method()==='PUT');
 await page.getByRole('button',{name:'More for '+firstName,exact:true}).click();
 await page.getByRole('menuitem',{name:'Remove from deal',exact:true}).click();
 const saved=await put;check(saved.ok(),'People removal must save successfully');
 const peopleAfter=await saved.json();
 check(peopleAfter.stakeholders.length===peopleBefore.stakeholders.length-1,'Persisted association count must decrease');
 const savedAt=Date.now(),immediate=(await api('opportunities/'+id)).opportunity;
 // Deadline observation is part of this single public-door journey, not a second run.
 await new Promise(resolve=>setTimeout(resolve,31000));
 const later=(await api('opportunities/'+id)).opportunity;
 await page.reload({waitUntil:'networkidle'});
 check(await page.getByRole('list',{name:'People on this deal'}).getByRole('link',{name:firstName,exact:true}).count()===0,'Browser reload must show the association removed');
 observations.steps.push({name:'People association removal and 30-second evaluation deadline',saveHttp:saved.status(),stakeholdersBefore:peopleBefore.stakeholders.length,stakeholdersAfter:peopleAfter.stakeholders.length,elapsedAfterSaveMs:Date.now()-savedAt,evaluationBefore:scored.evaluation.id,evaluationImmediatelyAfter:immediate.evaluation?.id,evaluationAfterDeadline:later.evaluation?.id,evaluatedAtBefore:scored.evaluation.evaluatedAt,evaluatedAtAfterDeadline:later.evaluation?.evaluatedAt,lifecycle:later.lifecycle,reevaluated:later.evaluation?.id!==scored.evaluation.id});
 await page.screenshot({path:packet+'browser-association-after.png',fullPage:true});
 observations.completed=true;
 console.log(JSON.stringify(observations,null,2));
}finally{
 writeFileSync(packet+'browser-functional.json',JSON.stringify(observations,null,2)+'\n');
 await context.close();await browser.close();
}
