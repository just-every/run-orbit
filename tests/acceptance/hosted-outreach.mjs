import {verifiedEditionCommit} from './edition-source.mjs';
import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {chromium} from '@playwright/test';
import {mailbox} from './hosted/mailbox.mjs';
import {outreach} from './hosted/outreach.mjs';
const editionCommit=verifiedEditionCommit();
const configPath=process.env.ORBIT_PRIVATE_CONFIG,statePath=process.env.ORBIT_ACCEPTANCE_STORAGE_STATE;
if(!configPath||!statePath||!isAbsolute(configPath)||!isAbsolute(statePath))throw new Error('Absolute ORBIT_PRIVATE_CONFIG and ORBIT_ACCEPTANCE_STORAGE_STATE are required; obtain state through actual emailed native sign-in.');
const configuration=JSON.parse(await readFile(configPath,'utf8')),origin=configuration.AUTH_ORIGIN;
if(origin!=='https://orbit.justevery.com')throw new Error('This bounded acceptance run is authorized only for the named Orbit deployment.');
const receive=await mailbox(),browser=await chromium.launch(),context=await browser.newContext({storageState:statePath}),page=await context.newPage();await mkdir('verification',{recursive:true});
try{
 const api=async(path,body)=>{const response=await context.request.fetch(`${origin}/api/v1/${path}`,{method:body?'POST':'GET',headers:{Origin:origin},...(body?{data:body}:{})});if(!response.ok())throw new Error(`Authenticated acceptance endpoint failed: HTTP ${response.status()} ${path}`);return response.json();};
 console.log('Verifying real reviewed outreach, SMTP delivery, threaded reply and provider unsubscribe.');
 const proof=await outreach({page,origin,api,receive,recipient:`orbit-outreach-${Date.now()}@acceptance-mail.justevery.com`,configuration}),lock=JSON.parse(await readFile('composition.lock.json','utf8'));
 const result={observedAt:new Date().toISOString(),origin,editionCommit,familyCommit:lock.repositories.family.commit,baseCommit:lock.repositories.base.commit,...proof};await writeFile('verification/hosted-outreach.json',JSON.stringify(result,null,2)+'\n');await appendFile('verification/external-results.jsonl',JSON.stringify({runner:'actual-smtp-and-cloudflare',name:'AI-001 AI-002 AI-003 SIGNAL-001 SIGNAL-003 SIGNAL-004 OUT-001 OUT-004 OUT-007 OUT-009 OUT-012 actual reviewed message, delivered footer, signed threaded reply and one-click stop',status:'passed',editionCommit:result.editionCommit,familyCommit:result.familyCommit,baseCommit:result.baseCommit,evidence:'verification/hosted-outreach.json'})+'\n');console.log('Actual outreach, reply cancellation and unsubscribe acceptance passed.');
}finally{await browser.close();}
