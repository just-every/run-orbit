import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {expect,type Browser} from '@playwright/test';
import {accessible,watchBrowser} from './browser-observations';
/** Public HTTP creates the fixture; each view is the real emitted record/settings screen. */
export async function bookingBrowserJourney(browser:Browser,origin:string,directory:string,cookie:string){
 for(const width of [1440,390]){
  const context=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:cookie}}),errors=watchBrowser(context),page=await context.newPage();
  try{
   const call=async(path:string,method='GET',body?:unknown)=>{const response=await context.request.fetch('/api/v1/'+path,{method,headers:{Origin:origin},data:body});assert.ok(response.ok(),`${path}: ${response.status()} ${await response.text()}`);return response.json() as Promise<any>;};
   const settings=await call('settings'),stage=settings.stages[0].id;
   const deal=await call('workbench/opportunities','POST',{title:`Booking lifecycle ${width}`,companyName:`Synthetic Orbit ${width}`,contactName:'Booking guest',email:`synthetic-orbit-${width}@booking.test`,stageId:stage,valueCents:10000});
   const source=`synthetic-orbit-booking-${width}`,{secret}=await call('sources/'+source,'PUT',{name:'Booking lifecycle proof',enabled:true});
   const base=Date.now()-120000,at=(n:number)=>new Date(base+n*1000).toISOString(),start=at(3600),end=at(5400),newStart=at(7200),newEnd=at(9000);
   let entryId:string|undefined;
   for(const [triggerEvent,uid,n,extra,state] of [
    ['BOOKING_CREATED','synthetic-orbit-1',0,{},'booked'],
    ['BOOKING_RESCHEDULED','synthetic-orbit-2',30,{rescheduleUid:'synthetic-orbit-1',startTime:newStart,endTime:newEnd,rescheduleStartTime:start,rescheduleEndTime:end},'rescheduled'],
    ['BOOKING_CANCELLED','synthetic-orbit-2',60,{startTime:newStart,endTime:newEnd},'cancelled'],
   ] as const){
    const raw=JSON.stringify({triggerEvent,createdAt:at(n),payload:{uid,attendees:[{email:`synthetic-orbit-${width}@booking.test`,name:'Booking guest'}],title:'Customer planning',startTime:start,endTime:end,...extra}}),response=await context.request.post(`/api/v1/signals/${source}/calcom`,{headers:{'X-Cal-Signature-256':createHmac('sha256',secret).update(raw).digest('hex')},data:raw});assert.equal(response.status(),201,await response.text());
    await page.goto(`/app/opportunities/${deal.id}`);const timeline=page.getByTestId('opportunity-timeline'),entry=timeline.locator('li').filter({hasText:'Provider ID:'});await expect(entry).toHaveCount(1);await expect(entry).toContainText(`Cal.com · ${state}`);await expect(entry).toContainText(`synthetic-orbit-${width}@booking.test`);const id=await entry.getAttribute('id');if(entryId)assert.equal(id,entryId);else entryId=id!;
    await entry.scrollIntoViewIfNeeded();await accessible(page,`booking-${state}-${width}`,directory);
   }
   await page.goto('/app/settings');const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Connected products',exact:true})});await expect(section.getByRole('heading',{name:'Cal.com · Booking',exact:true})).toBeVisible();await expect(section.locator('li').filter({hasText:'Dial · Booking'})).toContainText('Not available in Orbit');await section.scrollIntoViewIfNeeded();await accessible(page,`booking-settings-${width}`,directory);await section.screenshot({path:`${directory}/booking-settings-${width}.png`});
   await errors.check(directory,`booking-${width}`);
  }finally{await context.close();}
 }
}
