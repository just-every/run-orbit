import {expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {readArchiveFile} from '../../src/core/shared/archive-file.ts';
import {isolatedDatabase} from '../support/isolated-database.ts';
import {createDependencies} from '../support/dependencies.ts';
import {identityVarArgs} from '../support/worker-identity.mjs';
import {sessionCookieName} from '../support/test-auth.ts';
import {browserAPI} from '../rer/browser-api.mjs';

/** A captured attendee and an explicitly cleared hold survive a native Settings archive move. */
export async function contactPermissionJourney({page,context,testInfo,authenticate}){
 const fixture=await isolatedDatabase(),port=Number(process.env.ORBIT_ARCHIVE_PORT??8723)+20,origin=`http://127.0.0.1:${port}`;
 let worker,sourceContext;
 try{
  const deps=createDependencies(fixture.db),owner='01J00000000000000000000990';
  await deps.auth.ensureOperator({id:owner,email:'archive-owner@example.test',displayName:'Archive owner'});
  await deps.workspace.ensureWorkspace({name:'Permission journey',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
  await deps.workspace.ensurePipelineStage({id:'01J00000000000000000000991',name:'Qualified',position:1});
  await fixture.db.prepare("INSERT OR REPLACE INTO first_run_setup VALUES('workspace',?)").bind(new Date().toISOString()).run();
  const session=await deps.auth.createSession(owner);await fixture.close();
  worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',fixture.directory,'--port',String(port),'--inspector-port','0',...identityVarArgs(origin)],{stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1'}});
  let output='';worker.stdout.on('data',c=>output+=c);worker.stderr.on('data',c=>output+=c);
  let ready=false;for(let i=0;i<300;i++){try{if((await fetch(origin+'/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw new Error(output);
  sourceContext=await context.browser().newContext({baseURL:origin,acceptDownloads:true,viewport:{width:1440,height:1000},extraHTTPHeaders:{Cookie:`${sessionCookieName}=${session.token}`}});
  await sourceContext.addCookies([{name:sessionCookieName,value:session.token,url:`https://127.0.0.1:${port}`,secure:true,httpOnly:true,sameSite:'Lax'}]);
  const source=await sourceContext.newPage();await source.goto('/app');
  const api=(path,method='GET',body)=>browserAPI(source,path,method,body);
  const stages=(await api('/api/v1/workbench')).stages;
  const deal=await api('/api/v1/workbench/opportunities','POST',{title:'Permission review',companyName:'Synthetic Orbit',contactName:'Known attendee',email:'synthetic-orbit-1@example.test',stageId:stages[0].id,valueCents:0});
  const known=(await api(`/api/v1/opportunities/${deal.id}`)).opportunity.contacts[0].id;
  const start=new Date(Date.now()+86400000),stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const invite=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Orbit permission journey//EN','METHOD:REQUEST','BEGIN:VEVENT','UID:synthetic-orbit-1@example.test','SEQUENCE:0',`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(start.getTime()+1800000))}`,'SUMMARY:Permission review meeting','ORGANIZER:mailto:archive-owner@example.test','ATTENDEE;CN=Known attendee:mailto:synthetic-orbit-1@example.test','ATTENDEE;CN=New attendee:mailto:synthetic-orbit-2@example.test','STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const upload=await source.request.post('/api/v1/capture/imports',{headers:{Origin:origin},multipart:{files:{name:'permission.ics',mimeType:'text/calendar',buffer:Buffer.from(invite)}}});expect(upload.status(),await upload.text()).toBe(201);
  const proposals=(await api('/api/v1/capture/proposals?status=pending')).proposals;
  for(const proposal of proposals.filter(p=>p.kind==='link_signal'))await api(`/api/v1/capture/proposals/${proposal.id}/accept`,'POST',{});
  await source.goto('/app/brief');await source.getByRole('link',{name:'Plan this meeting',exact:true}).click();
  await source.getByRole('button',{name:'Create contact synthetic-orbit-2@example.test'}).click();
  const attendee=source.getByRole('link',{name:'synthetic-orbit-2@example.test',exact:true});await expect(attendee).toBeVisible();
  for(const width of [1440,390]){await source.setViewportSize({width,height:1000});await source.screenshot({path:testInfo.outputPath(`permission-plan-${width}.png`),fullPage:true});}
  await source.setViewportSize({width:1440,height:1000});await attendee.click();
  await expect.soft(source.getByLabel('Email permission',{exact:true})).toHaveValue('do_not_contact');
  await expect.soft(source.getByRole('button',{name:/^Email /})).toHaveCount(0);
  const captured=(await api('/api/v1/records/contact')).records.find(c=>c.email==='synthetic-orbit-2@example.test');
  console.log(`PERMISSION before archive captured=${captured.contactability}`);
  // A separate, known contact deliberately reviews and clears a hold.
  await source.goto(`/app/contacts/${known}`);const permission=source.getByLabel('Email permission',{exact:true});
  await permission.selectOption('do_not_contact');await source.getByRole('button',{name:'Stop mail',exact:true}).click();await expect(permission).toHaveValue('do_not_contact');
  await permission.selectOption('contactable');await source.getByRole('button',{name:'Clear do-not-contact',exact:true}).click();await expect(permission).toHaveValue('contactable');
  const before=await api(`/api/v1/records/contact/${known}`);expect(before.record.contactability).toBe('contactable');
  const retained=await api('/api/v1/records/contact','POST',{name:'Retained safety hold',email:'synthetic-orbit-3@example.test'});
  await source.goto('/app/settings/data');await source.getByRole('button',{name:'Prepare export',exact:true}).click();await expect(source.getByRole('link',{name:'Download completed archive'})).toBeVisible({timeout:90_000});
  const downloadPromise=source.waitForEvent('download');await source.getByRole('link',{name:'Download completed archive'}).click();const download=await downloadPromise,file=testInfo.outputPath('permission-archive.json');await download.saveAs(file);
  const archived=[];for await(const entry of readArchiveFile(Readable.toWeb(createReadStream(file))))if(entry.kind==='part')archived.push(...entry.part.records);
  expect(archived.find(r=>r.table==='contacts'&&r.row.id===known).row.contactability).toBe('contactable');
  expect(archived.some(r=>r.table==='timeline_entries'&&r.row.kind==='contactability.cleared')).toBe(true);
  await sourceContext.close();sourceContext=undefined;const stopped=once(worker,'exit');worker.kill('SIGTERM');await stopped;worker=undefined;
  // The destination is a fresh owner-only installation, after the original empty archive journey.
  await authenticate(context);await page.goto('/app/settings/data');
  const targetStop=await browserAPI(page,'/api/v1/records/contact','POST',{name:'Destination stop',email:'synthetic-orbit-3@example.test',contactability:'do_not_contact'});
  await browserAPI(page,`/api/v1/records/contact/${targetStop.id}`,'DELETE',{confirmed:true});
  await page.getByLabel('Archive file',{exact:true}).setInputFiles(file);await page.getByRole('checkbox').check();await expect(page.getByRole('region',{name:'Email permission after restore',exact:true})).toBeVisible();
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:testInfo.outputPath(`permission-restore-review-${width}.png`),fullPage:true});}
  await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Start restore',exact:true}).click();await expect(page.locator('[data-archive-state=complete]')).toBeVisible({timeout:90_000});
  expect((await page.request.get(`/api/v1/records/contact/${known}`)).status()).toBe(401);await authenticate(context);
  for(const [id,expected,name] of [[captured.id,'do_not_contact','captured'],[known,'contactable','cleared'],[retained.id,'do_not_contact','retained']]){
   await page.goto(`/app/contacts/${id}`);await expect.soft(page.getByLabel('Email permission',{exact:true})).toHaveValue(expected);
   const restored=await browserAPI(page,`/api/v1/records/contact/${id}`);console.log(`PERMISSION after restore ${name}=${restored.record.contactability}`);
   expect.soft(restored.record.contactability).toBe(expected);
   if(name==='cleared'){
    const cleared=before.timeline.find(t=>t.kind==='contactability.cleared');expect(cleared).toBeTruthy();expect(restored.timeline.find(t=>t.id===cleared.id)).toEqual(cleared);
    expect(restored.timeline.some(t=>t.kind==='contactability.restore_hold')).toBe(false);
    await expect(page.getByTestId('record-activity')).toContainText('Contactability Cleared');
   }
   if(name==='retained'){
    const hold=restored.timeline.find(t=>t.kind==='contactability.restore_hold');expect.soft(hold).toBeTruthy();
    if(hold){const reason=JSON.parse(hold.payload_json);expect(reason.reason).toBe('retained_suppression');expect(reason.archivedContactability).toBe('contactable');expect(hold.actor_name).toBeTruthy();await expect(page.getByTestId('record-activity')).toContainText(reason.text);}
   }
   for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath(`permission-restored-${name}-${width}.png`),fullPage:true});}
   await page.setViewportSize({width:1440,height:1000});
  }
 }finally{
  await sourceContext?.close();if(worker&&worker.exitCode===null){const stopped=once(worker,'exit');worker.kill('SIGTERM');await stopped;}await fixture.dispose();
 }
}
