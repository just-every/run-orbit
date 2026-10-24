import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function callingJourney(page){
 const evidence=resolve(process.env.ORBIT_CALL_EVIDENCE??'.orbit-viewport-evidence/calling');await mkdir(evidence,{recursive:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/app/settings');
 const settings=page.getByRole('region',{name:'Calling',exact:true});
 await expect(settings.getByRole('status')).toHaveText('Unresolved setup · Twilio not connected');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('calling-unconnected',width,settings);}
 await settings.getByLabel('Account SID',{exact:true}).fill('AC'+'1'.repeat(32));
 await settings.getByLabel('Auth token',{exact:true}).fill('synthetic-orbit-twilio-token');
 await settings.getByLabel('Twilio phone',{exact:true}).fill('+12025550101');
 await settings.getByLabel('Your phone',{exact:true}).fill('+12025550102');
 await settings.getByRole('button',{name:'Connect Twilio',exact:true}).click();
 await expect(settings.getByRole('status').filter({hasText:'Twilio connected'})).toBeVisible();
 await expect(settings.getByLabel('Auth token',{exact:true})).toHaveValue('');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('calling-connected',width,settings);}
 const origin=new URL(page.url()).origin;
 const response=await page.request.post('/api/v1/records/contact',{headers:{Origin:origin},data:{name:'Synthetic Orbit Caller',email:'synthetic-orbit-caller@example.test',phone:'+12025550103'}});
 expect(response.status(),await response.text()).toBe(201);const contact=await response.json();
 await page.goto(`/app/records?kind=contact&record=${contact.id}`);
 const call=page.getByRole('region',{name:'Call contact',exact:true});
 await call.getByRole('button',{name:'Review call',exact:true}).click();
 await expect(call.getByRole('heading',{name:'Review exact call'})).toBeVisible();
 await expect(call).toContainText('+12025550103');await expect(call).toContainText('+12025550101');await expect(call).toContainText('+12025550102');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('contact-call-review',width,call);}
 await call.getByRole('button',{name:'Cancel call',exact:true}).click();
 await expect(call.getByRole('button',{name:'Confirm and call once'})).toHaveCount(0);
 await page.goto('/app/settings');await expect(settings.getByRole('button',{name:'Disconnect Twilio',exact:true})).toBeVisible();
 await settings.getByRole('button',{name:'Disconnect Twilio',exact:true}).click();
 await expect(settings.getByRole('status').filter({hasText:'Unresolved setup'})).toBeVisible();
 expect(errors).toEqual([]);
 async function proof(name,width,region){await expect(region).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const result=await new AxeBuilder({page}).include(name.startsWith('contact')?'[aria-label="Call contact"]':'[aria-labelledby="calling-settings"]').analyze();expect(result.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await region.screenshot({path:`${evidence}/${name}-${width}.png`});}
}
