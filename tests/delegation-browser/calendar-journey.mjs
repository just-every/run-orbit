import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function calendarJourney(page,data){
 const evidence=resolve(process.env.ORBIT_CALENDAR_EVIDENCE??'.orbit-viewport-evidence/calendar-writeback');await mkdir(evidence,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 let authorization;
 const edge=await page.context().newCDPSession(page);
 edge.on('Fetch.requestPaused',async event=>{authorization=new URL(event.request.url);await edge.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'}],body:Buffer.from('<!doctype html><html lang="en"><title>Provider edge</title><h1>Provider authorization received</h1></html>').toString('base64')});});
 await edge.send('Fetch.enable',{patterns:[{urlPattern:'https://accounts.google.com/o/oauth2/v2/auth*',requestStage:'Request'},{urlPattern:'https://login.microsoftonline.com/*/oauth2/v2.0/authorize*',requestStage:'Request'}]});
 try{
  await page.setViewportSize({width:1440,height:1000});
  for(const provider of ['google','microsoft']){
   const google=provider==='google',name=google?'Google':'Microsoft',writeScope=google?'calendar.events':'Calendars.ReadWrite',readScopes=google?['gmail.readonly','calendar.readonly']:['Mail.Read','Calendars.Read'];
   for(const writeback of [false,true]){
    await page.goto(`/app/capture/connect/${provider}?step=5`);const form=page.getByRole('form',{name:`Connect ${name}`,exact:true});
    await form.getByLabel('Client ID',{exact:true}).fill('synthetic-orbit-client');await form.getByLabel('Client secret',{exact:true}).fill('synthetic-orbit-secret');await form.getByLabel('Name this connection').fill(`Sales ${name} calendar`);
    const consent=form.getByRole('checkbox',{name:`Allow reviewed calendar writeback (${writeScope})`,exact:true});await expect(consent).not.toBeChecked();if(writeback)await consent.check();
    await expect(form.getByRole('list',{name:'Requested permissions',exact:true}).locator('code')).toHaveText([...readScopes,...(writeback?[writeScope]:[])]);
    await authorize(form,`Connect ${name}`,google,readScopes,writeScope,writeback);
   }
  }
  for(const item of data.providers){
   const {provider,contact,source,network}=item,google=provider==='google';
   await openRecord(contact);let panel=region();await expect(panel).toContainText('Provider edited the meeting.');await panel.getByText('Plan calendar meeting',{exact:true}).click();await panel.getByLabel('Meeting',{exact:true}).selectOption(item.conflict);await panel.getByRole('button',{name:'Review invitation',exact:true}).click();await expect(review()).toContainText('Provider edits conflict with the last Orbit version.');await proof(`${provider}-conflict-review`,panel);await review().getByRole('button',{name:'Cancel review',exact:true}).click();
   await panel.getByLabel('Meeting',{exact:true}).selectOption(item.captured);
   const captured=network.state.calendarEvent;if(google)captured.organizer.self=false;else captured.isOrganizer=false;
   const before=network.state.writes.length;
   await panel.getByRole('button',{name:'Review invitation',exact:true}).click();await expect(panel).toContainText('Only the connected calendar organizer');expect(network.state.writes.length).toBe(before);await proof(`${provider}-organizer-refusal`,panel);
   if(google)captured.organizer.self=true;else captured.isOrganizer=true;
   await panel.getByRole('button',{name:'Review invitation',exact:true}).click();await expect(review()).toContainText(item.input.meeting.attendees[0]);await proof(`${provider}-captured-review`,panel);await dispatch();expect(network.state.writes.length).toBe(before+1);
   await panel.getByLabel('Meeting',{exact:true}).selectOption('');await panel.getByLabel('Meeting title',{exact:true}).fill('Synthetic series invitation');await panel.getByLabel('Invitation message',{exact:true}).fill('Review every exact occurrence and attendee.');await panel.getByLabel(/^Start \(/).fill('2026-10-25T14:00');await panel.getByLabel(/^End \(/).fill('2026-10-25T14:30');await panel.getByLabel('Repeat',{exact:true}).selectOption('weekly');await panel.getByLabel('Number of occurrences',{exact:true}).fill('3');await panel.getByLabel('Recurrence time zone',{exact:true}).fill('America/New_York');await panel.getByRole('button',{name:'Review invitation',exact:true}).click();
   await expect(review()).toContainText('America/New_York');await expect(review().getByRole('list',{name:'Exact occurrences'}).locator('li')).toHaveCount(3);await proof(`${provider}-series-review`,panel);await dispatch();expect(network.state.writes.length).toBe(before+2);
   await panel.getByLabel('Meeting',{exact:true}).selectOption(item.series);await panel.getByLabel('Exact occurrence',{exact:true}).selectOption(item.instances[0].originalStartTime?.dateTime??item.instances[0].originalStart);
   await panel.getByLabel(/^Start \(/).fill('2026-10-25T16:00');await panel.getByLabel(/^End \(/).fill('2026-10-25T16:30');await panel.getByRole('button',{name:'Review invitation',exact:true}).click();await expect(review()).toContainText('Only the occurrence originally at');await proof(`${provider}-occurrence-reschedule`,panel);await dispatch();expect(network.state.writes.length).toBe(before+3);expect(network.state.writes.at(-1).url).toContain(item.instances[0].id);
   await panel.getByLabel('Meeting',{exact:true}).selectOption(item.series);await panel.getByLabel('Exact occurrence',{exact:true}).selectOption(item.instances[1].originalStartTime?.dateTime??item.instances[1].originalStart);await panel.getByLabel('Change',{exact:true}).selectOption('cancel');await panel.getByRole('button',{name:'Review invitation',exact:true}).click();await expect(review()).toContainText('cancel');await proof(`${provider}-occurrence-cancel`,panel);await dispatch();expect(network.state.writes.length).toBe(before+4);expect(network.state.writeEvents.has(item.instances[2].id)).toBe(true);
   network.state.revoked=true;await panel.getByLabel('Meeting',{exact:true}).selectOption('');await panel.getByRole('button',{name:'Review invitation',exact:true}).click();await expect(panel).toContainText('access was revoked');expect(network.state.writes.length).toBe(before+4);await openRecord(contact);panel=region();await expect(panel).toContainText('unresolved setup');await proof(`${provider}-unresolved-setup`,panel);
   await panel.getByRole('link',{name:'Reconnect calendar',exact:true}).click();const name=google?'Google':'Microsoft',writeScope=google?'calendar.events':'Calendars.ReadWrite',readScopes=google?['gmail.readonly','calendar.readonly']:['Mail.Read','Calendars.Read'];
   const form=page.getByRole('form',{name:`Reconnect ${name}`,exact:true});await form.getByLabel('Client ID',{exact:true}).fill('synthetic-orbit-client');await form.getByLabel('Client secret',{exact:true}).fill('synthetic-orbit-secret');const consent=form.getByRole('checkbox',{name:`Allow reviewed calendar writeback (${writeScope})`,exact:true});await expect(consent).not.toBeChecked();await consent.check();await proof(`${provider}-reconnect-consent`,form,'.capture-key-form');
   network.state.revoked=false;await authorize(form,`Reconnect ${name}`,google,readScopes,writeScope,true);network.state.challenge=authorization.searchParams.get('code_challenge');
   await page.goto(`/api/v1/capture/oauth/${provider}/callback?`+new URLSearchParams({state:authorization.searchParams.get('state'),code:'synthetic-orbit-code'}));
   const scope=await page.request.post(`/api/v1/capture/sources/${source}/scope`,{headers:{origin:new URL(item.origin??data.origin).origin},data:{calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}}});expect(scope.status()).toBe(200);const sync=await page.request.post(`/api/v1/capture/sources/${source}/sync`,{headers:{origin:new URL(item.origin??data.origin).origin},data:{}});expect(sync.status()).toBe(200);expect(network.state.writes.length).toBe(before+4,'fresh consent and identity reconciliation send no invitations');
   await openRecord(contact);await expect(region()).not.toContainText('unresolved setup');
  }
  expect(errors).toEqual(Array(4).fill('Failed to load resource: the server responded with a status of 409 (Conflict)'));
 }finally{await edge.send('Fetch.disable');await edge.detach();}
 function region(){return page.getByRole('region',{name:'Calendar writeback',exact:true});}
 function review(){return region().getByRole('region',{name:'Invitation review',exact:true});}
 async function openRecord(contact){await page.goto(`/app/records?kind=contact&record=${contact}`);await expect(region()).toBeVisible();}
 async function dispatch(){const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/capture/writeback/confirm'&&r.request().method()==='POST');await review().getByRole('button',{name:'Confirm exact invitation once',exact:true}).click();const result=await response;expect(result.status(),await result.text()).toBe(201);await expect(region()).toContainText('Provider confirmed the calendar change.');}
 async function authorize(form,button,google,readScopes,writeScope,writeback){authorization=undefined;const starting=page.waitForResponse(r=>/\/oauth\/(google|microsoft)\/start$/.test(new URL(r.url()).pathname)&&r.request().method()==='POST');await form.getByRole('button',{name:button,exact:true}).click();const started=await starting;expect(started.status()).toBe(303);await expect(page.getByRole('heading',{name:'Provider authorization received',exact:true})).toBeVisible();expect(authorization.origin).toBe(google?'https://accounts.google.com':'https://login.microsoftonline.com');const scopes=[...readScopes,...(writeback?[writeScope]:[])].map(scope=>google?'https://www.googleapis.com/auth/'+scope:scope);expect(authorization.searchParams.get('scope').split(/\s+/).sort()).toEqual([...scopes,...(google?[]:['offline_access'])].sort());}
 async function proof(name,region,selector='[aria-labelledby^="meeting-writeback-"]'){
  await page.setViewportSize({width:1440,height:1000});await expect(region).toBeVisible();const axe=await new AxeBuilder({page}).include(selector).analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await region.screenshot({path:`${evidence}/${name}-${width}.png`});}await page.setViewportSize({width:1440,height:1000});
 }
}
