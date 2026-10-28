import {workflowValuesBrowserJourney} from './workflow-values-journey.mjs';
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
 await settings.locator('.workflows-editor').getByLabel('Field',{exact:true}).fill('title');
 await settings.getByLabel('Value',{exact:true}).fill('Account review ready');
 await settings.getByLabel('Trigger',{exact:true}).selectOption('activity_logged');
 await settings.getByLabel('Activity type',{exact:true}).selectOption('meeting');
 await expect(settings.getByLabel('Activity type',{exact:true})).toHaveValue('meeting');
 await settings.getByRole('heading',{name:'Sales workflows',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:join(directory,`workflow-activity-editor-${width}.png`)});
 await settings.getByLabel('Trigger',{exact:true}).selectOption('record_changed');
 await settings.getByRole('heading',{name:'Sales workflows',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:join(directory,`workflow-editor-${width}.png`)});
 await settings.getByRole('button',{name:'Preview changes',exact:true}).click();
 await expect(settings.getByRole('region',{name:'Workflow activation preview'})).toBeVisible();
 await expect(settings.getByRole('region',{name:'Workflow activation preview'})).toContainText('Operator review opportunity');
 await expect(settings.getByRole('region',{name:'Workflow activation preview'})).toContainText('Account review ready');
 await settings.getByRole('button',{name:'Activate reviewed version',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:join(directory,`workflow-preview-${width}.png`),fullPage:false});
 await settings.getByRole('button',{name:'Activate reviewed version',exact:true}).click();
 await expect(settings.getByRole('status').filter({hasText:'Workflow activated'})).toBeVisible();
 const current=await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET');
 await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,{...current.record,title:'Account review candidate',custom_fields:JSON.parse(current.record.custom_fields_json)},'PUT');
 await settings.getByRole('button',{name:'Execution history',exact:true}).click();
 await settings.getByRole('button',{name:'Process due runs',exact:true}).click();
 await expect(settings.getByText('Completed',{exact:false}).first()).toBeVisible();
 const record=await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET');assert.equal(record.record.title,'Account review ready');
 const run=settings.locator('details.workflows-card').first();await run.locator('summary').first().click();await expect(run.getByText('Trigger and source evidence',{exact:true})).toBeVisible();
 await page.screenshot({path:join(directory,`workflow-execution-${width}.png`),fullPage:false});
 await settings.getByRole('button',{name:'Undo applied changes',exact:true}).first().click();
 await expect(settings.getByText('Undo inspected every recorded write',{exact:false})).toBeVisible();
 await settings.getByRole('button',{name:'Approvals',exact:true}).click();await expect(settings.getByText('No changes are waiting for approval.',{exact:true})).toBeVisible();await page.screenshot({path:join(directory,`workflow-approvals-${width}.png`),fullPage:false});
 const workflows=await request(page,'/api/workflows',undefined,'GET');for(const workflow of workflows.workflows)await request(page,`/api/workflows/${workflow.id}/pause`,{});
 const material=await request(page,'/api/workflows',{name:'Review the account budget',definition:{trigger:{kind:'record_changed',recordType:'opportunity'},conditions:[{field:'title',operator:'equals',value:'Budget request'}],actions:[{kind:'set',field:'value_cents',value:625000}],delayMinutes:0,order:0}});
 const review=await request(page,`/api/workflows/${material.workflow.id}/preview`,{});await request(page,`/api/workflows/${material.workflow.id}/activate`,{previewId:review.previewId});const budget=await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET');await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,{...budget.record,title:'Budget request',custom_fields:JSON.parse(budget.record.custom_fields_json)},'PUT');await request(page,'/api/workflows/process',{});
 await page.goto(origin+`/app/records?record=${fixture.opportunityId}`);const approval=page.getByRole('region',{name:'Workflow changes needing your approval'});await expect(approval).toBeVisible();await expect(approval).toContainText('Review the account budget');await approval.scrollIntoViewIfNeeded();await page.screenshot({path:join(directory,`workflow-record-approval-${width}.png`)});await approval.getByRole('button',{name:'Accept change',exact:true}).click();await expect(approval.getByRole('status')).toContainText('Accepted');assert.equal((await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET')).record.value_cents,625000);await request(page,'/api/workflows/process',{});await request(page,`/api/workflows/${material.workflow.id}/pause`,{});
 await page.goto(origin+'/app/settings');
 const presentation=await settings.evaluate(root=>{const visible=Array.from(root.querySelectorAll('*')).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');return {small:visible.filter(el=>Array.from(el.childNodes).some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<13).map(el=>el.tagName),icons:visible.filter(el=>['BUTTON','A'].includes(el.tagName)&&!el.textContent.trim()&&!el.getAttribute('title')&&!el.getAttribute('aria-describedby')).map(el=>el.tagName)};});
 await workflowValuesBrowserJourney({page,fixture,origin,directory},width);
 assert.deepEqual(presentation.small,[]);assert.deepEqual(presentation.icons,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'workflow view fits viewport');
}
