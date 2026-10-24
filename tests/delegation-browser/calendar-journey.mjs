import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function calendarJourney(page,data){
 const evidence=resolve(process.env.ORBIT_CALENDAR_EVIDENCE??'.orbit-viewport-evidence/calendar-writeback');await mkdir(evidence,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/app/capture/connect/google?step=5');
 const consent=page.getByRole('checkbox',{name:'Allow reviewed calendar writeback (calendar.events)',exact:true});await expect(consent).not.toBeChecked();await consent.check();
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('writeback-opt-in',width,page.locator('.capture-key-form'));}
 await page.goto(`/app/records?kind=contact&record=${data.contact}`);const panel=page.getByRole('region',{name:'Calendar writeback',exact:true});await expect(panel).toContainText('Provider edited the meeting.');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('provider-conflict',width,panel);}
 await panel.getByText('Plan calendar meeting',{exact:true}).click();await panel.getByLabel('Calendar connection',{exact:true}).selectOption(data.source);await panel.getByLabel('Calendar',{exact:true}).selectOption('calendar');await panel.getByLabel('Meeting title',{exact:true}).fill('Synthetic invitation review');await panel.getByLabel('Invitation message',{exact:true}).fill('Review the exact rollout invitation.');await panel.getByLabel('Exact attendee emails',{exact:true}).fill('synthetic-orbit-calendar@example.test');await panel.getByLabel(/^Start \(/).fill('2026-11-02T15:00');await panel.getByLabel(/^End \(/).fill('2026-11-02T15:30');await panel.getByRole('button',{name:'Review invitation',exact:true}).click();
 const review=panel.getByRole('region',{name:'Invitation review',exact:true});await expect(review).toContainText('synthetic-orbit-calendar@example.test');await expect(review).toContainText('Review the exact rollout invitation.');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('invitation-review',width,panel);}
 await review.getByRole('button',{name:'Cancel review',exact:true}).click();await expect(review).toHaveCount(0);expect(errors).toEqual([]);
 async function proof(name,width,region){await expect(region).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const selector=name==='writeback-opt-in'?'.capture-key-form':'[aria-labelledby^="meeting-writeback-"]';const axe=await new AxeBuilder({page}).include(selector).analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await region.screenshot({path:`${evidence}/${name}-${width}.png`});}
}
