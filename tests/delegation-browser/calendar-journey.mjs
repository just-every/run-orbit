import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function calendarJourney(page,data){
 const evidence=resolve(process.env.ORBIT_CALENDAR_EVIDENCE??'.orbit-viewport-evidence/calendar-writeback');await mkdir(evidence,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 let authorization;
 // Playwright routing skips redirected requests. CDP intercepts only the provider edge.
 const edge=await page.context().newCDPSession(page);
 edge.on('Fetch.requestPaused',async event=>{
  authorization=new URL(event.request.url);
  await edge.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'}],body:Buffer.from('<!doctype html><html lang="en"><title>Provider edge</title><h1>Provider authorization received</h1></html>').toString('base64')});
 });
 await edge.send('Fetch.enable',{patterns:[{urlPattern:'https://accounts.google.com/o/oauth2/v2/auth*',requestStage:'Request'},{urlPattern:'https://login.microsoftonline.com/*/oauth2/v2.0/authorize*',requestStage:'Request'}]});
 try{
 for(const provider of ['google','microsoft']){
  const google=provider==='google',name=google?'Google':'Microsoft',writeScope=google?'calendar.events':'Calendars.ReadWrite';
  const readScopes=google?['gmail.readonly','calendar.readonly']:['Mail.Read','Calendars.Read'];
  for(const writeback of [false,true]){
   await page.goto(`/app/capture/connect/${provider}?step=5`);
   const form=page.getByRole('form',{name:`Connect ${name}`,exact:true});
   await form.getByLabel('Client ID',{exact:true}).fill('synthetic-orbit-client');
   await form.getByLabel('Client secret',{exact:true}).fill('synthetic-orbit-secret');
   await form.getByLabel('Name this connection').fill(`Sales ${name} calendar`);
   const consent=form.getByRole('checkbox',{name:`Allow reviewed calendar writeback (${writeScope})`,exact:true});await expect(consent).not.toBeChecked();
   if(writeback)await consent.check();
   const permissions=form.getByRole('list',{name:'Requested permissions',exact:true});
   await expect(permissions.locator('code')).toHaveText([...readScopes,...(writeback?[writeScope]:[])]);
   for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof(`${provider}-consent-${writeback?'writeback':'read-only'}`,width,form,'.capture-key-form');}
   authorization=undefined;
   const starting=page.waitForResponse(response=>new URL(response.url()).pathname===`/api/v1/capture/oauth/${provider}/start`&&response.request().method()==='POST');
   await form.getByRole('button',{name:`Connect ${name}`,exact:true}).click();
   const started=await starting;expect(started.status()).toBe(303);const target=new URL(started.headers().location,started.url());
   expect(target.origin,target.searchParams.get('error')??'the form must reach its provider').toBe(google?'https://accounts.google.com':'https://login.microsoftonline.com');
   await expect(page.getByRole('heading',{name:'Provider authorization received',exact:true})).toBeVisible();
   expect(authorization.origin).toBe(google?'https://accounts.google.com':'https://login.microsoftonline.com');
   const scopes=[...readScopes,...(writeback?[writeScope]:[])].map(scope=>google?'https://www.googleapis.com/auth/'+scope:scope);
   expect(authorization.searchParams.get('scope').split(/\s+/).sort()).toEqual([...scopes,...(google?[]:['offline_access'])].sort());
  }
 }
 await page.goto(`/app/records?kind=contact&record=${data.contact}`);const panel=page.getByRole('region',{name:'Calendar writeback',exact:true});await expect(panel).toContainText('Provider edited the meeting.');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('provider-conflict',width,panel);}
 await panel.getByText('Plan calendar meeting',{exact:true}).click();await panel.getByLabel('Calendar connection',{exact:true}).selectOption(data.source);await panel.getByLabel('Calendar',{exact:true}).selectOption('calendar');await panel.getByLabel('Meeting title',{exact:true}).fill('Synthetic invitation review');await panel.getByLabel('Invitation message',{exact:true}).fill('Review the exact rollout invitation.');await panel.getByLabel('Exact attendee emails',{exact:true}).fill('synthetic-orbit-calendar@example.test');await panel.getByLabel(/^Start \(/).fill('2026-11-02T15:00');await panel.getByLabel(/^End \(/).fill('2026-11-02T15:30');await panel.getByRole('button',{name:'Review invitation',exact:true}).click();
 const review=panel.getByRole('region',{name:'Invitation review',exact:true});await expect(review).toContainText('synthetic-orbit-calendar@example.test');await expect(review).toContainText('Review the exact rollout invitation.');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('invitation-review',width,panel);}
 await review.getByRole('button',{name:'Cancel review',exact:true}).click();await expect(review).toHaveCount(0);expect(errors).toEqual([]);
 }finally{await edge.send('Fetch.disable');await edge.detach();}
 async function proof(name,width,region,selector='[aria-labelledby^="meeting-writeback-"]'){await expect(region).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const axe=await new AxeBuilder({page}).include(selector).analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);if(selector==='.capture-key-form')await page.screenshot({path:`${evidence}/${name}-${width}.png`,fullPage:true});else await region.screenshot({path:`${evidence}/${name}-${width}.png`});}
}
