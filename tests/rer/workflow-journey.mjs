import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {join} from 'node:path';
import {request} from './operator-fixture.mjs';

/** Configure and inspect the real owner workflow surface using the native installation. */
export async function workflowBrowserJourney({page,fixture,origin,directory},width){
 await page.setViewportSize({width,height:900});await page.goto(origin+'/app/settings');
 const settings=page.locator('.workflows-settings');await expect(settings.getByRole('heading',{name:'Sales workflows',exact:true})).toBeVisible();
 await settings.getByRole('button',{name:'New workflow',exact:true}).click();
 await settings.getByLabel('Workflow name',{exact:true}).fill('Prepare account review');
 await settings.getByLabel('Field',{exact:true}).fill('title');
 await settings.getByLabel('Value',{exact:true}).fill('Account review ready');
 await settings.getByRole('button',{name:'Preview changes',exact:true}).click();
 await expect(settings.getByRole('region',{name:'Workflow activation preview'})).toBeVisible();
 await expect(settings.getByRole('region',{name:'Workflow activation preview'})).toContainText('Operator review opportunity');
 await expect(settings.getByRole('region',{name:'Workflow activation preview'})).toContainText('Account review ready');
 await settings.scrollIntoViewIfNeeded();await page.screenshot({path:join(directory,`workflow-preview-${width}.png`),fullPage:true});
 await settings.getByRole('button',{name:'Activate reviewed version',exact:true}).click();
 await expect(settings.getByRole('status').filter({hasText:'Workflow activated'})).toBeVisible();
 const current=await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET');
 await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,{...current.record,title:'Account review candidate',custom_fields:JSON.parse(current.record.custom_fields_json)},'PUT');
 await settings.getByRole('button',{name:'Execution history',exact:true}).click();
 await settings.getByRole('button',{name:'Process due runs',exact:true}).click();
 await expect(settings.getByText('Completed',{exact:false}).first()).toBeVisible();
 const record=await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET');assert.equal(record.record.title,'Account review ready');
 const run=settings.locator('details.workflows-card').first();await run.locator('summary').first().click();await expect(run.getByText('Trigger and source evidence',{exact:true})).toBeVisible();
 await page.screenshot({path:join(directory,`workflow-execution-${width}.png`),fullPage:true});
 await settings.getByRole('button',{name:'Undo applied changes',exact:true}).first().click();
 await expect(settings.getByText('Undo inspected every recorded write',{exact:false})).toBeVisible();
 await settings.getByRole('button',{name:'Approvals',exact:true}).click();await expect(settings.getByText('No changes are waiting for approval.',{exact:true})).toBeVisible();await page.screenshot({path:join(directory,`workflow-approvals-${width}.png`),fullPage:true});
 const presentation=await settings.evaluate(root=>{const visible=Array.from(root.querySelectorAll('*')).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');return {small:visible.filter(el=>Array.from(el.childNodes).some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<13).map(el=>el.tagName),icons:visible.filter(el=>['BUTTON','A'].includes(el.tagName)&&!el.textContent.trim()&&!el.getAttribute('title')&&!el.getAttribute('aria-describedby')).map(el=>el.tagName)};});
 assert.deepEqual(presentation.small,[]);assert.deepEqual(presentation.icons,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'workflow view fits viewport');
}
