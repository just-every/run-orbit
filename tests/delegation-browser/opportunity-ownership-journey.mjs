import {expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

/** The native autosaving Owner field, its reloaded history and the deal's independent score. */
export async function opportunityOwnershipJourney(page,dealId,actor){
 const evidence=resolve('.orbit-viewport-evidence/opportunity-ownership');await mkdir(evidence,{recursive:true});
 await page.goto(`/app/opportunities/${dealId}`);
 const origin=new URL(page.url()).origin,path=`/api/v1/records/opportunity/${dealId}`;
 const response=await page.request.post('/api/v1/settings/operators',{headers:{Origin:origin},data:{displayName:'Jordan Ellis',email:['synthetic-orbit-701','operator.test'].join('@')}});
 expect(response.status(),await response.text()).toBe(201);const receiver=await response.json();
 const read=async()=>{const response=await page.request.get(path);expect(response.ok(),await response.text()).toBe(true);return response.json();};
 const original=await read();expect(original.record.score).toBeGreaterThan(0);
 const names=new Map([[actor.id,actor.displayName],[receiver.id,'Jordan Ellis'],[null,'Unassigned']]);
 const owner=page.getByTestId('record-details').getByRole('combobox',{name:'Owner',exact:true});
 let previous=original.record.owner_id,changes=original.timeline.filter(entry=>entry.kind==='owner.changed').length;
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.reload();
  for(const [phase,next] of [['unassigned',null],['assigned',actor.id],['reassigned',receiver.id],['unassigned',null]]){
   if(previous===next)continue;
   await expect(owner).toHaveValue(previous??'');
   const saving=page.waitForResponse(response=>response.request().method()==='PATCH'&&new URL(response.url()).pathname===path);
   await owner.selectOption(next??'');const saved=await saving;expect(saved.ok(),await saved.text()).toBe(true);
   await expect.poll(async()=>(await read()).record.owner_id).toBe(next);
   await page.reload();await expect(owner).toHaveValue(next??'');
   const fresh=await read(),history=fresh.timeline.filter(entry=>entry.kind==='owner.changed');
   expect(history).toHaveLength(++changes);expect(fresh.record.score).toBe(original.record.score);
   const entry=history.find(entry=>{const payload=JSON.parse(entry.payload_json);return payload.previous===previous&&payload.current===next;});
   expect(entry.actor_id).toBe(actor.id);expect(entry.actor_name).toBe(actor.displayName);
   const title=`Owner: ${names.get(previous)} → ${names.get(next)}`;
   const line=page.getByTestId('record-activity').getByRole('listitem').filter({has:page.getByText(title,{exact:true})}).first();
   await expect(line).toBeVisible();await expect(line).toContainText(`Recorded by ${actor.displayName}`);
   const recorded=page.getByTestId('recorded-details');await recorded.locator('summary').click();
   await expect(recorded.locator('li').first()).toContainText(`score ${original.record.score},`);await recorded.locator('summary').click();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
   await page.screenshot({path:`${evidence}/${phase}-${width}.png`,fullPage:true});
   previous=next;
  }
  const tooltip=`More for ${original.contacts[0].name}`;
  const control=page.getByRole('button',{name:tooltip,exact:true});
  await control.scrollIntoViewIfNeeded();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await control.focus();
  await expect(page.getByRole('tooltip',{name:tooltip,exact:true})).toBeVisible();
  await page.screenshot({path:`${evidence}/tooltip-${width}.png`});
 }
 await page.close();
}
