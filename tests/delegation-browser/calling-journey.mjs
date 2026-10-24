import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function callingJourney(page){
 const evidence=resolve(process.env.ORBIT_CALL_EVIDENCE??'.orbit-viewport-evidence/calling');await mkdir(evidence,{recursive:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/app/settings');
 const settings=page.getByRole('region',{name:'Calling',exact:true});
 await expect(settings.getByRole('status').filter({hasText:'Twilio connected'})).toBeVisible();
 await expect(settings.getByLabel('Auth token',{exact:true})).toHaveValue('');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('calling-connected',width,settings);}
 const origin=new URL(page.url()).origin;
 const response=await page.request.post('/api/v1/records/contact',{headers:{Origin:origin},data:{name:'Synthetic Orbit Caller',email:'synthetic-orbit-caller@example.test',phone:'+12025550103'}});
 expect(response.status(),await response.text()).toBe(201);const contact=await response.json();
 await settings.getByRole('searchbox',{name:'Find a contact',exact:true}).fill('Synthetic Orbit Caller');
 await expect(settings.getByRole('option',{name:'Synthetic Orbit Caller',exact:true})).toHaveCount(1);await settings.getByLabel('Match held call',{exact:true}).selectOption(contact.id);await settings.getByRole('button',{name:'Confirm call match',exact:true}).click();await expect(settings).toContainText('No calls awaiting a contact match.');
 await page.goto(`/app/records?kind=contact&record=${contact.id}`);
 const call=page.getByRole('region',{name:'Call contact',exact:true});
 await call.getByRole('button',{name:'Review call',exact:true}).click();
 await expect(call.getByRole('heading',{name:'Review exact call'})).toBeVisible();
 await expect(call).toContainText('+12025550103');await expect(call).toContainText('+12025550101');await expect(call).toContainText('+12025550102');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('contact-call-review',width,call);}
 await call.getByText('Call log',{exact:true}).click();await expect(call).toContainText('Twilio inbound call: completed');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('contact-call-log',width,call);}
 await call.getByRole('button',{name:'Cancel call',exact:true}).click();
 await expect(call.getByRole('button',{name:'Confirm and call once'})).toHaveCount(0);
 const workspace=await (await page.request.get('/api/v1/settings')).json(),dealResponse=await page.request.post('/api/v1/records/opportunity',{headers:{Origin:origin},data:{title:'Synthetic reviewed calling deal',stage_id:workspace.stages[0].id,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id}});expect(dealResponse.status(),await dealResponse.text()).toBe(201);const deal=await dealResponse.json();
 await page.goto(`/app/opportunities/${deal.id}`);await call.getByRole('button',{name:'Review call',exact:true}).click();await expect(call.getByRole('heading',{name:'Review exact call'})).toBeVisible();await call.getByText('Call log',{exact:true}).click();await expect(call).toContainText('Twilio inbound call: completed');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('deal-call-review',width,call);}
 await page.goto('/app/settings');await expect(settings.getByRole('button',{name:'Disconnect Twilio',exact:true})).toBeVisible();
 await settings.getByRole('button',{name:'Disconnect Twilio',exact:true}).click();
 await expect(settings.getByRole('status').filter({hasText:'Unresolved setup'})).toBeVisible();
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('calling-unconnected',width,settings);}
 const policy=page.getByRole('region',{name:'Sign-in policy',exact:true});await expect(policy.getByRole('option',{name:/auth · https/})).toHaveCount(1);
 await policy.getByLabel('Email domain',{exact:true}).fill('example.com');await policy.getByLabel('Required provider',{exact:true}).selectOption('auth');await policy.getByRole('button',{name:'Save domain requirement',exact:true}).click();await expect(policy).toContainText('example.com → auth');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const axe=await new AxeBuilder({page}).include('[aria-labelledby="sign-in-policy"]').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await policy.screenshot({path:`${evidence}/sign-in-policy-${width}.png`});}
 await page.goto('/signin?notice=oidc_admission_denied');await expect(page.getByRole('alert')).toContainText('Provider sign-in was refused.');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const axe=await new AxeBuilder({page}).analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await page.screenshot({path:`${evidence}/refused-sign-in-${width}.png`,fullPage:true});}
 expect(errors).toEqual([]);
 async function proof(name,width,region){await expect(region).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const result=await new AxeBuilder({page}).include((name.startsWith('contact')||name.startsWith('deal'))?'[aria-label="Call contact"]':'[aria-labelledby="calling-settings"]').analyze();expect(result.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await region.screenshot({path:`${evidence}/${name}-${width}.png`});}
}
