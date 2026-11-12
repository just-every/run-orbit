import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {mentionLink} from './mention-link.mjs';

const widths=[1440,390];
const serious=async page=>(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id);
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth?[]:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>`${e.tagName.toLowerCase()}.${e.className}`).slice(0,8));
const daysAgo=days=>new Date(Date.now()-days*86400000).toISOString();
const stamp=date=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');

/** Checks a screen at both widths: nothing wider than the screen, no serious or critical axe finding, a screenshot each. */
async function atWidths(page,evidence,name,ready){
 for(const width of widths){await page.setViewportSize({width,height:900});await ready();expect(await overflow(page),`${name} ${width}`).toEqual([]);expect(await serious(page),`${name} ${width}`).toEqual([]);await page.screenshot({path:`${evidence}/${name}-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:1440,height:900});
}

export async function todayJourney({first,second,colleague,evidence}){
 mkdirSync(evidence,{recursive:true});
 const page=await first.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/app');const origin=new URL(page.url()).origin,api=page.request;
 const post=async(path,data,status=201)=>{const r=await api.post(path,{headers:{Origin:origin},data});expect(r.status(),`${path} ${await r.text()}`).toBe(status);return r.json();};
 const files=async([[name,mimeType,text]],includeUnknown=false)=>{const r=await api.post('/api/v1/capture/imports',{headers:{Origin:origin},multipart:{files:{name,mimeType,buffer:Buffer.from(text)},...(includeUnknown?{includeUnknown:'on'}:{})}});expect(r.status(),await r.text()).toBe(201);};
 const brief=async()=>(await(await api.get('/api/v1/today')).json()).brief;
 const lineIds=b=>[...b.accounts.flatMap(a=>a.lines),...b.unresolved].map(l=>l.id).sort();

 // A day with nothing: the brief says so plainly.
 await atWidths(page,evidence,'brief-empty',async()=>{await page.goto('/app/brief');await expect(page.getByRole('heading',{name:'Nothing to do from your records today'})).toBeVisible();});

 // Earlier days, through the public doors.
 const stage=(await(await api.get('/api/v1/workbench')).json()).stages[0].id;
 const opportunity=async(title,companyName,contactName,email,valueCents)=>(await post('/api/v1/workbench/opportunities',{title,companyName,contactName,email,stageId:stage,valueCents})).id;
 const event=async(id,type,subject,age)=>(await post(`/api/v1/workbench/opportunities/${id}/events`,{type,subject,occurredAt:daysAgo(age),eventId:randomBytes(8).toString('hex')})).id;
 const acme=await opportunity('Acme renewal','Acme Logistics','Ana Ruiz','ana@acme.test',4800000),bright=await opportunity('Brightline pilot','Brightline Health','Jo Park','jo@brightline.test',2200000);
 const form=await event(acme,'form.submitted','Pricing request',3),view=await event(acme,'page.viewed','Viewed pricing page',2),oldReply=await event(acme,'email.replied','Re: contract terms',9);
 const completed=await event(bright,'meeting.completed','Pilot kickoff',3);
 const bright2=await opportunity('Cobalt expansion','Cobalt Works','Lee Chan','lee@cobalt.test',900000);
 const contact=(await(await api.get(`/api/v1/opportunities/${bright2}`)).json()).opportunity.contacts[0].id;
 const draft=(await post(`/api/v1/workbench/opportunities/${bright2}/drafts`,{contactId:contact,subject:'Expansion pricing',body:'The numbers we discussed.'})).id;
 const start=new Date(Date.now()+86400000);start.setUTCMinutes(0,0,0);
 await files([['invite.ics','text/calendar',['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Fixture//EN','METHOD:REQUEST','BEGIN:VEVENT',`UID:${randomBytes(8).toString('hex')}@acme.test`,'SEQUENCE:0',`DTSTAMP:${stamp(new Date(Date.now()-600000))}`,`CREATED:${stamp(new Date(Date.now()-600000))}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(start.getTime()+1800000))}`,'SUMMARY:Renewal review call','ORGANIZER:mailto:owner@brief.test','ATTENDEE;CN=Ana Ruiz:mailto:ana@acme.test','ATTENDEE;CN=Sam Lee:mailto:sam@acme.test','STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'].join('\r\n')]]);
 await files([['unknown.eml','message/rfc822',['From: Pat Unknown <pat@unmatched.test>','To: owner@brief.test','Subject: Question about your product',`Date: ${new Date(Date.now()-3600000).toUTCString()}`,`Message-ID: <${randomBytes(8).toString('hex')}@unmatched.test>`,'','Is anyone there?'].join('\r\n')]],true);
 // Before review, the captured invite is on the Brief as held, so the day is not shown as empty.
 await page.goto('/app/brief');await expect(page.locator('[data-line^="held-capture:"]')).toHaveCount(1);
 const proposals=(await(await api.get('/api/v1/capture/proposals?status=pending')).json()).proposals;
 for(const proposal of proposals.filter(p=>p.kind==='link_signal'))await post(`/api/v1/capture/proposals/${proposal.id}/accept`,{},200);

 // Day one: every expected line is present, nothing else is, and every link resolves to its evidence.
 const day1=await brief(),meeting=day1.accounts.flatMap(a=>a.lines).find(l=>l.kind==='meeting'&&l.title==='Renewal review call');
 const unlinked=day1.unresolved[0].evidence.id;
 expect(lineIds(day1)).toEqual([`meeting-no-next-step:${completed}`,`reply-unanswered:${oldReply}`,`signal:${completed}`,`signal:${form}`,`signal:${meeting.evidence.id}`,`signal:${oldReply}`,`signal:${view}`,`unlinked-signal:${unlinked}`].sort());
 await atWidths(page,evidence,'brief-day1',async()=>{await page.goto('/app/brief');for(const id of lineIds(day1))await expect(page.locator(`[data-line="${id}"]`)).toBeVisible();});
 await expect(page.getByRole('heading',{name:'Customer actions (observed)'}).first()).toBeVisible();await expect(page.getByRole('heading',{name:'Tool-reported activity (inferred)'})).toBeVisible();
 for(const line of [...day1.accounts.flatMap(a=>a.lines),...day1.unresolved]){
  await page.goto('about:blank');const response=await page.goto(line.href);expect(response.status(),line.href).toBe(200);
  const anchor=new URL(line.href,origin).hash.slice(1);
  if(anchor)await expect(page.locator(`[id="${anchor}"]`),line.href).toBeAttached({timeout:15000});else await expect(page.getByRole('heading',{level:1})).toBeVisible();
 }

 // Mark seen; the next day only the new reply is new, and the promises remain.
 await page.goto('/app/brief');await page.getByRole('button',{name:'Mark all as seen'}).click();await expect(page.locator(`[data-line="signal:${form}"]`)).toHaveCount(0);
 const reply=await event(acme,'email.replied','Re: pricing request',0);
 await page.goto('/app/brief');await expect(page.locator(`[data-line="signal:${reply}"]`)).toBeVisible();await expect(page.locator(`[data-line="draft-unsent:${draft}"]`)).toHaveCount(0);

 // AI-003: an unconfigured provider offers no AI action; the brief stays complete.
 await expect(page.getByRole('button',{name:/Summarise .* with AI/})).toHaveCount(0);

 // Meeting plan: attendees, unresolved attendee, notes that persist after sign-out, a next action from a plan line.
 await page.goto(meeting.planHref);
 await atWidths(page,evidence,'meeting-plan',async()=>{await expect(page.getByTestId('meeting-plan')).toBeVisible();await expect(page.getByText('sam@acme.test',{exact:true})).toBeVisible();});
 await expect(page.getByRole('link',{name:'Ana Ruiz'})).toBeVisible();const sam=page.locator('.plan-line--unresolved',{hasText:'sam@acme.test'});await expect(sam.getByRole('button',{name:'Create contact sam@acme.test'})).toBeVisible();await expect(sam.getByRole('link',{name:'Link by exact email'})).toBeVisible();
 await page.getByLabel('Agenda').fill('1. Renewal dates\n2. Owners');await page.getByLabel('Prep notes').fill('Bring the usage report');
 await page.getByRole('button',{name:'Save plan as note'}).click();await expect(page.getByText('Plan saved as a note.')).toBeVisible();
 const interaction=page.locator('.plan-line').filter({has:page.getByRole('link',{name:'Pricing request',exact:true})});await interaction.getByRole('button',{name:/Make next action/}).click();await expect(interaction.getByLabel('Next action')).toBeFocused();
 await interaction.getByLabel('Next action').fill('Send the usage report');await interaction.getByLabel(/^Due \(/).fill(new Date(Date.now()-86400000).toISOString().slice(0,16));
 await interaction.getByRole('button',{name:'Add next action'}).click();await expect(page.getByRole('link',{name:'Next action added'})).toBeFocused();
 await page.getByRole('button',{name:'Create contact sam@acme.test'}).click();await expect(page.getByRole('button',{name:'Create contact sam@acme.test'})).toHaveCount(0);await expect(page.getByRole('link',{name:'sam@acme.test'})).toBeVisible();
 await page.getByRole('button',{name:'Sign out'}).click();await page.waitForURL(/signin|\/$/);
 expect((await api.get('/api/v1/today')).status()).toBe(401);
 const again=await second.newPage();await again.goto(meeting.planHref);await expect(again.getByLabel('Agenda')).toHaveValue('1. Renewal dates\n2. Owners');await expect(again.getByLabel('Prep notes')).toHaveValue('Bring the usage report');
 const after=(await(await again.request.get('/api/v1/today')).json()).brief;
 expect(after.accounts.flatMap(a=>a.lines).filter(l=>l.kind==='handoff-due').map(l=>l.title)).toEqual(['Send the usage report']);

 // An authorised application reads the brief and plan and proposes a cited handoff; the person accepts it.
 const agent=again.request,nonce=randomBytes(12).toString('hex'),client='agent-'+nonce,callback='https://agent.example.test/callback';
 expect((await agent.post('/delegation/clients',{headers:{Origin:origin},form:{id:client,redirect_uri:callback},maxRedirects:0})).status()).toBe(303);
 const verifier=randomBytes(32).toString('hex'),query={client_id:client,redirect_uri:callback,response_type:'code',state:nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.handoff.write',targets:JSON.stringify(['opportunities/'+acme])};
 const consent=await agent.post('/delegation/authorize',{headers:{Origin:origin},form:query,maxRedirects:0});expect(consent.status()).toBe(303);
 const code=new URL(consent.headers().location).searchParams.get('code');
 const token=(await(await agent.post('/api/delegation/v1/token',{form:{grant_type:'authorization_code',client_id:client,redirect_uri:callback,code,code_verifier:verifier}})).json()).access_token,headers={Authorization:'Bearer '+token};
 const read=(await(await agent.get('/api/delegation/v1/brief',{headers})).json()).brief;expect(read.accounts.map(a=>a.name)).toEqual(['Acme Logistics']);
 expect((await agent.get('/api/delegation/v1/plan',{headers,params:{target:'signals/'+meeting.evidence.id}})).status()).toBe(200);
 const target=`opportunities/${acme}/handoffs/${nonce}`,check=await(await agent.get('/api/delegation/v1/check',{headers,params:{target}})).json(),audience=await(await agent.get('/api/delegation/v1/audience',{headers,params:{target,operation:'orbit.handoff.upsert'}})).json();
 const written=await agent.post('/api/delegation/v1/effects',{headers,data:{operationKey:nonce,operation:'orbit.handoff.upsert',target,expectedRevision:check.revision,expectedAudienceRevision:audience.audienceRevision,content:{title:'Prepare renewal pricing for the review',description:'Ana asked for pricing before the call.',assigneeId:null,dueAt:null,status:'open',evidence:[reply,form]}}});
 expect(written.status(),await written.text()).toBe(200);
 await again.goto('/app/brief');await expect(again.locator(`[data-line="handoff-proposed:${nonce}"]`)).toBeVisible();
 await again.goto(`/app/opportunities/${acme}#handoff-${nonce}`);
 const proposal=again.locator(`[id="handoff-${nonce}"]`);
 await atWidths(again,evidence,'handoff-proposal',async()=>{await expect(proposal.getByText(`Proposed by ${client}.`)).toBeVisible();await expect(proposal.getByRole('link',{name:'Re: pricing request'})).toBeVisible();});
 await proposal.getByRole('button',{name:'Accept',exact:true}).click();await expect(again.getByText(`Proposed by ${client}.`)).toHaveCount(0);
 await expect(again.getByTestId('record-activity').getByText('Handoff Accepted').first()).toBeVisible();
 await mentionLink({author:again,colleague,origin,opportunity:acme,occurredAt:daysAgo(20)});
 // Nothing was sent or drafted for a customer by any of this.
 for(const id of [acme,bright,bright2])expect((await(await again.request.get(`/api/v1/workbench/opportunities/${id}/messages`)).json()).messages).toEqual([]);
 expect(errors).toEqual([]);
}

/** The populated stalled-risk limb of the specialist week, with a linked held review. */
export async function stalledRiskPolicyJourney({page,expected,policy,bearer,evidence}) {
 const {stalledRiskComparison}=await import('../agent-door/native-journey.mjs');
 await page.setViewportSize({width:1440,height:900});
 const origin=new URL((await page.request.get('/health')).url()).origin;
 let rpc=0;
 const native=async()=>{const response=await page.request.get(`/api/v1/risks/${expected.id}/findings`);expect(response.status()).toBe(200);return response.json();};
 const baseline=await native();
 const recordPath=`/api/v1/records/opportunity/${expected.id}`;
 const originalRecord=await page.request.get(recordPath);expect(originalRecord.status()).toBe(200);const recordBefore=await originalRecord.json();
 for(const mode of ['autonomous','held']) {
  const adoption=await page.request.post('/api/rer/agent-policy',{headers:{Origin:origin},data:{policy:await policy(mode)}});expect(adoption.status(),await adoption.text()).toBe(200);
  const response=await page.request.post('/mcp',{headers:{Authorization:'Bearer '+await bearer(),'MCP-Protocol-Version':'2026-07-28','MCP-Method':'tools/call','MCP-Name':'orbit.risks.read'},data:{jsonrpc:'2.0',id:++rpc,method:'tools/call',params:{name:'orbit.risks.read',arguments:{id:expected.id},_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28'}}}});
  expect(response.status()).toBe(200);const result=(await response.json()).result;expect(result.isError).toBe(false);
  const {finding,evidence:source}=stalledRiskComparison(result.structuredContent.risks,await native(),expected);
  expect(result._meta['com.runeditrun/decision'].disposition).toBe(mode==='held'?'review':'autonomous');
  await page.goto(`/app/opportunities/${expected.id}`);
  const risks=page.getByTestId('deal-risks');await risks.locator(':scope > summary').click();
  const stalled=risks.locator('[data-kind="stalled"]');
  await expect(stalled.getByRole('heading')).toHaveText(finding.title);
  await expect(stalled.locator('blockquote')).toHaveText(expected.quote);
  await expect(stalled.getByText('Rule inference:',{exact:true})).toBeVisible();
  await expect(stalled.getByText(finding.inference.text,{exact:false})).toBeVisible();
  await expect(stalled.getByLabel('Proposed next task')).toHaveValue(expected.nextTask);
  const citation=stalled.getByRole('link',{name:source.label,exact:true});await expect(citation).toHaveAttribute('href',source.href);
  if(mode==='held') {
   // Assertions run once at desktop; each changed state is then shown once at both widths.
   for(const width of [1440,390]) {await page.setViewportSize({width,height:900});await stalled.scrollIntoViewIfNeeded();await page.screenshot({path:`${evidence}/specialist-stalled-${width}.png`,fullPage:true});}
  }
  await page.setViewportSize({width:1440,height:900});await citation.click();
  await expect(page.locator(`[id="entry-${expected.evidenceId}"]`)).toBeVisible();
  const unauthenticated=await page.request.get(source.href,{headers:{Cookie:''},maxRedirects:0});expect([302,303,401]).toContain(unauthenticated.status());
  if(mode==='held') {
   const review=result._meta['com.runeditrun/review'];expect(review.id).toBeTruthy();
   await page.goto('/agents');const item=page.locator(`[data-review-id="${review.id}"]`);
   await expect(item).toHaveAttribute('data-review-state','open');await expect(item).toContainText('Synthetic risk specialist for Rose Owner');
   await expect(item.getByRole('button',{name:'Mark reviewed',exact:true})).toBeVisible();
   for(const width of [1440,390]) {await page.setViewportSize({width,height:900});await item.scrollIntoViewIfNeeded();await page.screenshot({path:`${evidence}/specialist-risk-review-${width}.png`,fullPage:true});}
   await page.setViewportSize({width:1440,height:900});await item.getByRole('button',{name:'Mark reviewed',exact:true}).click();await expect(item).toHaveCount(0);
   const reviews=await page.request.get('/agents/api/reviews');expect((await reviews.json()).reviews.find(item=>item.id===review.id).state).toBe('reviewed');
  } else {expect(result._meta['com.runeditrun/review']).toBeUndefined();}
  expect(await native()).toEqual(baseline,'reading risk evidence and reviewing the agent preserve the native deal and findings');
  const recordAfter=await page.request.get(recordPath);expect(recordAfter.status()).toBe(200);
  expect(await recordAfter.json()).toEqual(recordBefore,'the browser read and review preserve the native sales fields and timeline');
 }
 console.log(JSON.stringify({proof:'SURFACE-013.stalled-browser',evidenceId:expected.evidenceId,quote:expected.quote,nativeMatch:true,evidenceLinkAuthenticated:true,reviewMarked:true,widths:[1440,390]}));
 await page.close();
}

/** Reviewed Zoom attachment and a factual recap in the emitted application; Zoom HTTP alone is replaced. */
export async function zoomMeetingJourney(page,{provider,fetch:workerFetch,origin,evidence}){
 await page.setViewportSize({width:1440,height:900});await page.goto('/app/settings/integrations');
 await page.getByRole('button',{name:'Connect Zoom',exact:true}).click();
 const settings=page.getByRole('region',{name:'Zoom meetings',exact:true});
 await expect(settings.getByRole('status')).toContainText('Unresolved setup');
 for(const [name,key] of [['Zoom account ID','accountId'],['Zoom client ID','clientId'],['Zoom client secret','clientSecret'],['Zoom webhook secret token','webhookSecret']])await settings.getByLabel(name,{exact:true}).fill(provider.credentials[key]);
 await settings.getByRole('button',{name:'Check and connect Zoom',exact:true}).click();
 await expect(page.getByRole('button',{name:'Open Zoom',exact:true})).toBeVisible();
 await expect(settings.getByRole('status').filter({hasText:'Zoom connected'})).toBeVisible();
 await expect(settings.getByLabel('Zoom client secret',{exact:true})).toHaveValue('');
 await screenshots(settings,'zoom-connected-settings');
 const post=async(path,data,status=201)=>{const response=await page.request.post(path,{headers:{Origin:origin},data});expect(response.status(),await response.text()).toBe(status);return response.json();};
 const contact=await post('/api/v1/records/contact',{name:'Synthetic Zoom browser attendee',email:provider.attendance[0].user_email}),stages=(await(await page.request.get('/api/v1/settings')).json()).stages;
 const deal=await post('/api/v1/records/opportunity',{title:'Synthetic Zoom browser deal',stage_id:stages[0].id,value_cents:350000,contact_ids:[contact.id],primary_contact_id:contact.id});
 await settings.getByLabel('Find a deal',{exact:true}).fill('Synthetic Zoom browser deal');await settings.getByRole('button',{name:'Find deals',exact:true}).click();
 await expect(settings.getByRole('option',{name:'Synthetic Zoom browser deal',exact:true})).toHaveCount(1);await settings.getByLabel('Deal',{exact:true}).selectOption(deal.id);
 await settings.getByLabel('Exact Zoom meeting ID',{exact:true}).fill('98765432101');await settings.getByRole('button',{name:'Read meeting for review',exact:true}).click();
 const review=settings.getByRole('region',{name:'Review Zoom attachment',exact:true});await expect(review).toContainText('Synthetic Zoom deal review');await expect(review).toContainText('Synthetic Zoom browser deal');await expect(review).toContainText('98765432101');await expect(review).toContainText('Recording permission not granted');
 const attachment=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/zoom/meetings/attach'&&response.request().method()==='POST');
 await review.getByRole('button',{name:'Confirm this meeting and deal',exact:true}).click();const attached=await(await attachment).json();
 await settings.getByRole('link',{name:'Open meeting preparation',exact:true}).click();
 await expect(page.getByRole('link',{name:'Join in Zoom',exact:true})).toHaveAttribute('href','https://zoom.us/j/98765432101');
 await expect(page.getByTestId('meeting-plan')).toContainText('Transcript missing');await expect(page.getByRole('link',{name:'Synthetic Zoom browser attendee',exact:true})).toBeVisible();
 await page.getByLabel('Agenda',{exact:true}).fill('Review the saved deal evidence');await page.getByLabel('Prep notes',{exact:true}).fill('Bring the saved checklist');await page.getByRole('button',{name:'Save plan as note',exact:true}).click();await expect(page.getByText('Plan saved as a note.',{exact:true})).toBeVisible();
 await screenshots(page.getByTestId('meeting-plan'),'zoom-scheduled-plan');
 const timestamp=String(Math.floor(Date.now()/1000)),body=JSON.stringify({event:'meeting.ended',event_ts:Date.now(),payload:{object:{id:98765432101,uuid:provider.meetings.get('98765432101').uuid,end_time:new Date().toISOString()}}}),{createHmac}=await import('node:crypto'),signature='v0='+createHmac('sha256',provider.credentials.webhookSecret).update(`v0:${timestamp}:${body}`).digest('hex');
 const completion=await workerFetch(origin+'/api/v1/signals/zoom',{method:'POST',headers:{'content-type':'application/json','x-zm-request-timestamp':timestamp,'x-zm-signature':signature},body});expect(completion.status,await completion.clone().text()).toBe(200);
 await page.reload();await expect(page.getByRole('heading',{name:'Record-backed recap',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Saved meeting plan',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Signed Zoom completion',exact:true})).toHaveAttribute('href',new RegExp('^/app/opportunities/'+deal.id+'#entry-'));await expect(page.getByTestId('meeting-plan')).toContainText('Exact contact match');
 await screenshots(page.getByTestId('meeting-plan'),'zoom-completed-plan');
 expect(attached.planHref).toMatch(/^\/app\/meetings\//);expect(provider.unexpected).toEqual([]);await page.close();
 async function screenshots(region,name){await expect(region).toBeVisible();expect(await overflow(page)).toEqual([]);expect(await serious(page)).toEqual([]);for(const width of [1440,390]){await page.setViewportSize({width,height:900});await region.screenshot({path:`${evidence}/${name}-${width}.png`});}await page.setViewportSize({width:1440,height:900});}
}
