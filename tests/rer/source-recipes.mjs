import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {expect} from '@playwright/test';
import {browserAPI} from './browser-api.mjs';

async function post(page,url,headers,body){
 return page.evaluate(async({url,headers,body})=>{const response=await fetch(url,{method:'POST',headers,body});return {status:response.status,body:await response.json()};},{url,headers,body});
}
async function copiedURL(page){
 await page.getByRole('button',{name:'Copy webhook url',exact:true}).click();
 return page.evaluate(()=>navigator.clipboard.readText());
}
export async function exerciseAutomationRecipe(page,secret,opportunityId,sourceId){
 await page.getByLabel('Recipe',{exact:true}).selectOption('automation');
 await page.getByLabel('Source secret',{exact:true}).fill(secret);
 const url=await copiedURL(page),testBody=await page.locator('[data-recipe="automation-test"]').innerText();
 await page.getByRole('button',{name:'Copy authorization header',exact:true}).click();
 assert.ok(await page.evaluate(()=>navigator.clipboard.readText())===`Authorization: Bearer ${secret}`,'Copy preserves the authorization header');
 const headers={Authorization:`Bearer ${secret}`,'Content-Type':'application/json'};
 assert.equal((await post(page,url,{},testBody)).status,401);
 assert.equal((await post(page,url,{...headers,Authorization:'Bearer '+'x'.repeat(64)},testBody)).status,401);
 assert.equal((await post(page,url,headers,'x'.repeat(262145))).status,413);
 assert.equal((await post(page,url,headers,JSON.stringify({type:'form.submitted'}))).status,400);
 const read=async()=>(await browserAPI(page,`/api/v1/opportunities/${opportunityId}`)).opportunity;
 const before=await read();assert.equal((await post(page,url,headers,testBody)).status,201);
 assert.deepEqual(await read(),before,'The displayed native connection test adds no customer evidence');
 const body=JSON.stringify({...JSON.parse(await page.locator('[data-recipe="automation-body"]').innerText()),eventId:crypto.randomUUID(),occurredAt:new Date().toISOString(),email:'maya@harbour.example'});
 const first=await post(page,url,headers,body);assert.equal(first.status,201);
 const replay=await post(page,url,headers,body);assert.equal(replay.status,201);assert.deepEqual(replay.body,{id:first.body.id,replayed:true});
 assert.equal((await post(page,url,headers,JSON.stringify({...JSON.parse(body),subject:'Changed original content'}))).status,409);
 await browserAPI(page,`/api/v1/sources/${sourceId}`,'PATCH',{enabled:false});
 try{assert.equal((await post(page,url,headers,body)).status,403);}finally{await browserAPI(page,`/api/v1/sources/${sourceId}`,'PATCH',{enabled:true});}
 const added=(await read()).signals.filter(signal=>!before.signals.some(old=>old.id===signal.id));assert.equal(added.length,1);assert.equal(added[0].type,'form.submitted');
 await page.getByLabel('Automation platform',{exact:true}).selectOption('make');await page.getByRole('link',{name:'Make’s HTTP setup help',exact:true}).waitFor();
 await page.getByRole('button',{name:'Copy authorization value',exact:true}).click();assert.ok(await page.evaluate(()=>navigator.clipboard.readText())===`Bearer ${secret}`,'Make credential copy preserves exact value');
 await page.getByRole('button',{name:'Check latest delivery',exact:true}).click();
 return body;
}
export async function exerciseBookingRecipes(page,secret,opportunityId){
 await page.getByLabel('Recipe',{exact:true}).selectOption('booking');
 const read=async()=>(await browserAPI(page,`/api/v1/opportunities/${opportunityId}`)).opportunity.signals;
 for(const vendor of ['calcom','calendly']){
  await page.getByLabel('Booking provider',{exact:true}).selectOption(vendor);
  const url=await copiedURL(page),before=await read(),occurredAt=new Date().toISOString();
  const payload=vendor==='calcom'?{triggerEvent:'BOOKING_CREATED',createdAt:occurredAt,payload:{uid:crypto.randomUUID(),attendees:[{email:'maya@harbour.example'}]}}:{event:'invitee.created',created_at:occurredAt,payload:{uri:'https://api.calendly.com/scheduled_events/event/invitees/'+crypto.randomUUID(),event:'https://api.calendly.com/scheduled_events/event',email:'maya@harbour.example'}};
  const body=JSON.stringify(payload),timestamp=String(Math.floor(Date.now()/1000)),signature=createHmac('sha256',secret).update(vendor==='calcom'?body:`${timestamp}.${body}`).digest('hex');
  const headers=vendor==='calcom'?{'X-Cal-Signature-256':signature}:{'Calendly-Webhook-Signature':`t=${timestamp},v1=${signature}`};
  assert.equal((await post(page,url,headers,body)).status,201);assert.equal((await post(page,url,headers,body)).status,409);
  const added=(await read()).filter(signal=>!before.some(old=>old.id===signal.id));assert.equal(added.length,1);assert.equal(added[0].type,'meeting.booked');
 }
 if(new URL(page.url()).protocol==='http:'){
  await expect(page.getByLabel('Calendly personal access token',{exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Connect Calendly',exact:true})).toBeDisabled();
  await expect(page.getByText('Your tools cannot reach this Orbit address.',{exact:true})).toBeVisible();
 }
}
