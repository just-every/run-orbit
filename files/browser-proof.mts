import {isolatedDatabase} from './tests/support/isolated-database';
import {createDependencies} from './tests/support/dependencies';
import {browserRiskData} from './tests/support/browser-risk-data';
import {identityVarArgs} from './tests/support/worker-identity.mjs';
import {sessionCookieName} from './tests/support/test-auth';
import {fixtureMailbox} from './tests/support/capture-mail';
import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdirSync,writeFileSync} from 'node:fs';
const packet='/home/agent/rer-consolidation/work/main-orbit-next-step-links-1/packet';
mkdirSync(packet,{recursive:true});
const fixture=await isolatedDatabase(),origin='http://127.0.0.1:8748';
let worker,browser;
try {
 const deps=createDependencies(fixture.db),owner='01M4R2BR1EF0000000000000AA';
 await deps.auth.ensureOperator({id:owner,email:'owner@brief.test',displayName:'Rose Owner'});
 await fixture.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(owner).run();
 await deps.workspace.ensureWorkspace({name:'Next steps',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
 await deps.workspace.ensurePipelineStage({id:'01M4R2BR1EF00000000000STGA',name:'Qualified',position:1});
 await fixture.db.prepare("INSERT OR IGNORE INTO first_run_setup(id,completed_at) VALUES('workspace',?)").bind(new Date().toISOString()).run();
 const session=await deps.auth.createSession(owner),data=await browserRiskData(fixture.db,owner);
 await fixture.close();
 worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',fixture.directory,'--port','8748','--inspector-port','0',...identityVarArgs(origin)],{stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1'}});
 let output='';worker.stdout.on('data',c=>output+=c);worker.stderr.on('data',c=>output+=c);
 for(let i=0;i<300;i++){try{if((await fetch(origin+'/health')).ok)break;}catch{}if(i===299)throw Error(output);await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({baseURL:origin,extraHTTPHeaders:{Cookie:`${sessionCookieName}=${session.token}`},viewport:{width:1440,height:900}}),page=await context.newPage();
 await page.goto(`/app/opportunities/${data.deal}`);const risks=page.getByTestId('deal-risks');await risks.locator(':scope > summary').click();await risks.getByText('Run deal-risk agent',{exact:true}).click();
 const response=page.waitForResponse(r=>r.url().endsWith('/agent-runs'));await risks.getByRole('button',{name:'Start agent',exact:true}).click();const run=await(await response).json();await risks.getByRole('region',{name:'Deal-risk agent run'}).waitFor();
 await expect(risks.getByRole('region',{name:'Deal-risk agent run'})).not.toContainText(/orbit\.[a-z.]+|policy_unset|\bunset\b|\brefused\b|\bstandard\b|\bmeasure\b/);await expect(risks.getByRole('status')).toContainText(/company.*policy.*not.*set/i);
 const beforeAgent=await risks.getByRole('region',{name:'Deal-risk agent run'}).innerText();for(const width of [1440,390]){await page.setViewportSize({width,height:900});await risks.getByRole('region',{name:'Deal-risk agent run'}).screenshot({path:packet+`/after-agent-${width}.png`});}await page.setViewportSize({width:1440,height:900});
 await page.goto('/app/settings/capture/connect/files');await page.getByLabel('Mail (.eml or mbox) and calendar (.ics) files').setInputFiles({name:'meeting.ics',mimeType:'text/calendar',buffer:Buffer.from(fixtureMailbox({anaThread:'<synthetic-orbit-1>',bobThread:'<synthetic-orbit-2>'},'risk.test').invite.replaceAll('ana@risk.test','synthetic-orbit-38@risk.test'))});await page.getByRole('button',{name:'Add files',exact:true}).click();await page.getByRole('region',{name:'Import result'}).waitFor();
 await page.goto('/app/settings/capture');const card=page.locator('#capture-source-capture-files');await card.waitFor();
 const sourceText=await card.innerText(),links=await card.locator('a').evaluateAll(a=>a.map(x=>({text:x.textContent,href:x.getAttribute('href')})));for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:packet+`/after-capture-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:1440,height:900});await card.getByRole('link',{name:/review .*pending proposals/i}).click();await expect(page).toHaveURL(/app\/review\?source=capture-files$/);await expect(page.locator('.capture-proposal')).toHaveCount(2);
 writeFileSync(packet+'/candidate-browser.json',JSON.stringify({main:process.env.REPRO_MAIN,agent:{text:beforeAgent,filed:run.filed,codes:run.calls.map(c=>c.answer.code)},capture:{text:sourceText,links}},null,2)+'\n');console.log('CANDIDATE '+JSON.stringify({agent:beforeAgent,capture:sourceText,links}));
} finally {await browser?.close();if(worker&&worker.exitCode===null){const done=once(worker,'exit');worker.kill('SIGTERM');await done;}await fixture.dispose();}
