import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function callingJourney(page,calling){
 const evidence=resolve(process.env.ORBIT_CALL_EVIDENCE??'.orbit-viewport-evidence/calling');await mkdir(evidence,{recursive:true});
 page.on('requestfailed',request=>console.error('Calling browser request failed',new URL(request.url()).pathname,request.failure()?.errorText));
 const errors=[],expectedConsoleErrors=[];page.on('pageerror',e=>errors.push({text:e.message,url:'pageerror'}));page.on('console',m=>{if(m.type()==='error')errors.push({text:m.text(),url:m.location().url});});
 await page.goto('/app/settings');
 const settings=page.getByRole('region',{name:'Calling',exact:true});
 await expect(settings.getByRole('status').filter({hasText:'Twilio connected'})).toBeVisible();
 await expect(settings.getByLabel('Auth token',{exact:true})).toHaveValue('');
 for(const width of [1440]){await page.setViewportSize({width,height:900});await proof('calling-connected',width,settings);}
 const origin=new URL(page.url()).origin;
 const response=await page.request.post('/api/v1/records/contact',{headers:{Origin:origin},data:{name:'Synthetic Orbit Caller',email:['synthetic-orbit-302','example.test'].join(String.fromCharCode(64)),phone:'+12025550103'}});
 expect(response.status(),await response.text()).toBe(201);const contact=await response.json();
 await settings.getByRole('searchbox',{name:'Find a contact',exact:true}).fill('Synthetic Orbit Caller');
 await expect(settings.getByRole('option',{name:'Synthetic Orbit Caller',exact:true})).toHaveCount(1);await settings.getByLabel('Match held call',{exact:true}).selectOption(contact.id);await settings.getByRole('button',{name:'Confirm call match',exact:true}).click();await expect(settings).toContainText('No calls awaiting a contact match.');
 await page.goto(`/app/records?kind=contact&record=${contact.id}`);
 const call=page.getByRole('region',{name:'Call contact',exact:true});
 await call.getByRole('button',{name:'Review call',exact:true}).click();
 await expect(call.getByRole('heading',{name:'Review exact call'})).toBeVisible();
 await expect(call).toContainText('+12025550103');await expect(call).toContainText('+12025550101');await expect(call).toContainText('+12025550102');
 for(const width of [1440]){await page.setViewportSize({width,height:900});await proof('contact-call-review',width,call);}
 await call.getByText('Call log',{exact:true}).click();await expect(call).toContainText('Twilio inbound call: completed');
 for(const width of [1440]){await page.setViewportSize({width,height:900});await proof('contact-call-log',width,call);}
 await call.getByRole('button',{name:'Cancel call',exact:true}).click();
 await expect(call.getByRole('button',{name:'Confirm and call once'})).toHaveCount(0);
 const dialPath=`/api/v1/calls/contacts/${contact.id}/dial`,attempts=call.getByRole('list',{name:'Call attempts',exact:true});
 await call.getByRole('button',{name:'Review call',exact:true}).click();
 let refusalConsole=page.waitForEvent('console',{predicate:message=>message.type()==='error'&&message.location().url===origin+dialPath&&/^Failed to load resource:.*\b502\b/.test(message.text())});
 let dialResponse=page.waitForResponse(response=>new URL(response.url()).pathname===dialPath&&response.request().method()==='POST');
 await call.getByRole('button',{name:'Confirm and call once',exact:true}).click();
 const failed=await dialResponse;expect(failed.status()).toBe(502);expect(await failed.json()).toMatchObject({status:'failed',providerErrorCode:21217});{const message=await refusalConsole;expectedConsoleErrors.push({text:message.text(),url:message.location().url});}
 await expect(call.getByRole('alert')).toContainText(/Twilio refused the call.*21217/);await expect(call.getByRole('alert')).toContainText('No call was created');
 await expect(call.getByRole('button',{name:'Confirm and call once',exact:true})).toHaveCount(0);
 await expect(attempts.getByRole('listitem')).toHaveCount(1);await expect(attempts.getByRole('listitem')).toContainText(/Call failed.*Twilio code 21217/);
 expect(calling.provider.submissions).toBe(1);
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('contact-call-refused',width,call);}
 calling.provider.status=503;calling.provider.code=21217;
 await call.getByRole('button',{name:'Review call',exact:true}).click();
 refusalConsole=page.waitForEvent('console',{predicate:message=>message.type()==='error'&&message.location().url===origin+dialPath&&/^Failed to load resource:.*\b502\b/.test(message.text())});
 dialResponse=page.waitForResponse(response=>new URL(response.url()).pathname===dialPath&&response.request().method()==='POST');
 await call.getByRole('button',{name:'Confirm and call once',exact:true}).click();
 const uncertain=await dialResponse;expect(uncertain.status()).toBe(502);expect(await uncertain.json()).toMatchObject({status:'uncertain'});{const message=await refusalConsole;expectedConsoleErrors.push({text:message.text(),url:message.location().url});}
 await expect(call.getByRole('alert')).toContainText(/Check Twilio before placing another call/);
 await expect(call.getByRole('button',{name:'Confirm and call once',exact:true})).toHaveCount(0);
 await expect(attempts.getByRole('listitem')).toHaveCount(2);await expect(attempts.getByRole('listitem').filter({hasText:/outcome unknown/})).toContainText(/Check Twilio/);
 expect(calling.provider.submissions).toBe(2);
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('contact-call-uncertain',width,call);}
 const outcomes=['no-answer','busy','canceled','failed'];
 for(const outcome of outcomes){const sid='CA'+crypto.randomUUID().replaceAll('-','');expect(await callback(sid,2,outcome)).toEqual({replay:false,held:false});expect(await callback(sid,2,outcome)).toEqual({replay:true});expect(await callback(sid,1,'ringing')).toEqual({replay:false,held:false});}
 await page.reload();await call.getByText('Call log',{exact:true}).click();
 const log=call.locator('details');
 for(const outcome of outcomes)await expect(log.getByRole('listitem').filter({hasText:`Twilio outbound-dial call: ${outcome}`})).toHaveCount(1);
 await expect(log.getByRole('listitem').filter({hasText:/Twilio .* call:/})).toHaveCount(5);await expect(log.getByRole('listitem').filter({hasText:'Twilio outbound-dial call: ringing'})).toHaveCount(0);
 await expect(attempts.getByRole('listitem')).toHaveCount(2);await expect(attempts.getByRole('listitem').filter({hasText:/Call failed/})).toContainText('21217');await expect(attempts.getByRole('listitem').filter({hasText:/outcome unknown/})).toBeVisible();
 await expect(call.getByRole('button',{name:'Confirm and call once',exact:true})).toHaveCount(0);expect(calling.provider.submissions).toBe(2);
 const loggedResponse=await page.evaluate(async path=>{const response=await fetch(path);return {status:response.status,body:await response.json()};},`/api/v1/calls/contacts/${contact.id}/log`);expect(loggedResponse.status).toBe(200);const logged=loggedResponse.body;expect(logged.calls).toHaveLength(5);expect(logged.attempts.map(({state,provider_error_code})=>({state,provider_error_code}))).toEqual(expect.arrayContaining([{state:'failed',provider_error_code:21217},{state:'uncertain',provider_error_code:null}]));expect(logged.attempts).toHaveLength(2);
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('contact-call-terminal-log',width,call);}
 const workspace=await (await page.request.get('/api/v1/settings')).json(),dealResponse=await page.request.post('/api/v1/records/opportunity',{headers:{Origin:origin},data:{title:'Synthetic reviewed calling deal',stage_id:workspace.stages[0].id,value_cents:0,contact_ids:[contact.id],primary_contact_id:contact.id}});expect(dealResponse.status(),await dealResponse.text()).toBe(201);const deal=await dealResponse.json();
 await page.goto(`/app/opportunities/${deal.id}`);await call.getByRole('button',{name:'Review call',exact:true}).click();await expect(call.getByRole('heading',{name:'Review exact call'})).toBeVisible();await call.getByText('Call log',{exact:true}).click();await expect(call).toContainText('Twilio inbound call: completed');
 for(const outcome of outcomes)await expect(call.locator('details').getByRole('listitem').filter({hasText:`Twilio outbound-dial call: ${outcome}`})).toHaveCount(1);await expect(attempts.getByRole('listitem')).toHaveCount(2);expect(calling.provider.submissions).toBe(2);
 for(const width of [1440]){await page.setViewportSize({width,height:900});await proof('deal-call-review',width,call);}
 await page.goto('/app/settings');await expect(settings.getByRole('button',{name:'Disconnect Twilio',exact:true})).toBeVisible();
 await settings.getByRole('button',{name:'Disconnect Twilio',exact:true}).click();
 await expect(settings.getByRole('status').filter({hasText:'Unresolved setup'})).toBeVisible();
 for(const width of [1440]){await page.setViewportSize({width,height:900});await proof('calling-unconnected',width,settings);}
 const policy=page.getByRole('region',{name:'Sign-in policy',exact:true});await expect(policy.getByRole('option',{name:/auth · https/})).toHaveCount(1);
 await policy.getByLabel('Email domain',{exact:true}).fill('example.com');await policy.getByLabel('Required provider',{exact:true}).selectOption('auth');await policy.getByRole('button',{name:'Save domain requirement',exact:true}).click();await expect(policy).toContainText('example.com → auth');
 for(const width of [1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const axe=await new AxeBuilder({page}).include('[aria-labelledby="sign-in-policy"]').analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await policy.screenshot({path:`${evidence}/sign-in-policy-${width}.png`});}
 await page.goto('/signin?notice=oidc_admission_denied');await expect(page.getByRole('alert')).toContainText('Provider sign-in was refused.');
 for(const width of [1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const axe=await new AxeBuilder({page}).analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await page.screenshot({path:`${evidence}/refused-sign-in-${width}.png`,fullPage:true});}
 expect(calling.provider.submissions).toBe(2);expect(errors).toEqual(expectedConsoleErrors);
 async function callback(sid,sequence,status){const url=calling.origin+'/api/v1/calls/twilio/events',form=new URLSearchParams({AccountSid:calling.accountSid,CallSid:sid,SequenceNumber:String(sequence),Direction:'outbound-dial',From:'+12025550101',To:'+12025550103',CallStatus:status,CallDuration:'0'}),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(calling.token),{name:'HMAC',hash:'SHA-1'},false,['sign']),raw=url+[...form.keys()].sort().map(name=>name+form.get(name)).join(''),signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw))).toString('base64'),response=await calling.fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Twilio-Signature':signature},body:form});expect(response.status,await response.clone().text()).toBe(200);return response.json();}
 async function proof(name,width,region){await expect(region).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const result=await new AxeBuilder({page}).include((name.startsWith('contact')||name.startsWith('deal'))?'[aria-label="Call contact"]':'[aria-labelledby="calling-settings"]').analyze();expect(result.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await region.screenshot({path:`${evidence}/${name}-${width}.png`});}
}
