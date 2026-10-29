import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {request,requestStatus} from './operator-fixture.mjs';
import {observeOperator} from './operator-observations.mjs';
import {exerciseDuplicateMerge} from './operator-merge.mjs';

export async function operatorActionsJourney({page,fixture,origin,directory,observations}){
 const widths=[1440,390,320];
for(const width of [390,320]){
 await page.setViewportSize({width,height:900});await page.goto(origin+'/app');const menu=page.getByRole('button',{name:'Menu',exact:true}),nav=page.getByRole('navigation',{name:'Main menu'});
 await expect(nav).toBeHidden();await menu.focus();await page.keyboard.press('Enter');await expect(menu).toHaveAttribute('aria-expanded','true');await expect(nav).toBeVisible();await expect(nav.getByRole('link',{name:'NOW',exact:true})).toBeFocused();await expect(nav.getByRole('link',{name:'Collaborators',exact:true})).toHaveCount(0);await expect(nav.getByRole('link',{name:'Shared records',exact:true})).toHaveCount(0);
 await nav.getByRole('link',{name:'Settings',exact:true}).focus();await page.keyboard.press('Escape');await expect(menu).toBeFocused();await expect(nav).toBeHidden();await page.keyboard.press('Enter');await nav.getByRole('link',{name:'Settings',exact:true}).click();
 const settings=page.getByRole('navigation',{name:'Settings menu'});await expect(page).toHaveURL(/\/app\/settings\/workspace$/);await expect(page.getByRole('heading',{name:'Workspace',level:1})).toBeVisible();await menu.click();await expect(settings.getByRole('link',{name:'Workspace',exact:true})).toHaveAttribute('aria-current','page');await settings.getByRole('link',{name:'Team',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Collaborators',exact:true})).toBeVisible();await page.getByRole('link',{name:'Open shared records',exact:true}).click();await expect(page.getByRole('heading',{name:'Shared records',exact:true})).toBeVisible();
}
const nativeDialogs=[];page.on('dialog',dialog=>{nativeDialogs.push(dialog.type());void dialog.dismiss();});
for(const width of widths){
 await page.setViewportSize({width,height:900});await page.goto(origin+'/app/opportunities/new');await expect(page.getByRole('button',{name:'Save opportunity'})).toBeEnabled();await page.getByRole('button',{name:'Save opportunity'}).click();await expect(page.getByLabel('Company name',{exact:true})).toBeFocused();
 // OR3: closing asks once in place, under the foot: the reason takes the caret, Escape keeps the deal open and returns focus.
 await page.goto(origin+`/app/opportunities/${fixture.opportunityId}`);const trigger=page.getByRole('button',{name:'Close as won',exact:true});await trigger.click();const confirm=page.getByRole('group',{name:'Confirm change'});
 await expect(confirm.getByLabel('Why it closed')).toBeFocused();await expect(page.getByRole('dialog')).toHaveCount(0);await page.keyboard.press('Escape');await expect(confirm).toHaveCount(0);await expect(trigger).toBeFocused();
 await trigger.click();await confirm.getByLabel('Why it closed').fill('   ');await confirm.getByRole('button',{name:'Close as won',exact:true}).click();await expect(confirm.getByRole('alert')).toBeVisible();await expect(confirm).toBeVisible();
 await confirm.getByLabel('Why it closed').fill(`Customer confirmed at ${width}px`);await observeOperator(page,'lifecycle-confirm',width,directory,observations);await confirm.getByRole('button',{name:'Close as won',exact:true}).click();await expect(confirm).toHaveCount(0);await expect.poll(async()=>{const detail=await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET');return detail.record.lifecycle;}).toBe('won');await page.getByRole('button',{name:'Reopen',exact:true}).click();
 await expect.poll(async()=>(await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET')).record.lifecycle).toBe('open');
}
// A manual entry's text and time save in place; Delete entry asks once in place.
await page.goto(origin+`/app/opportunities/${fixture.opportunityId}`);const activity=page.getByTestId('record-activity');const entry=activity.locator(`#entry-${fixture.timelineEntryId}`);
await entry.getByText('Edit entry',{exact:true}).click();await expect(entry.getByLabel('Text',{exact:true})).toBeFocused();await entry.getByText('Edit entry',{exact:true}).click();
await entry.getByRole('button',{name:'Delete entry',exact:true}).click();await entry.getByRole('group',{name:'Confirm change'}).getByRole('button',{name:'Keep it',exact:true}).click();await expect(entry.getByRole('button',{name:'Delete entry',exact:true})).toBeFocused();assert.ok((await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET')).timeline.some(item=>item.id===fixture.timelineEntryId));
await entry.getByRole('button',{name:'Delete entry',exact:true}).click();await entry.getByRole('group',{name:'Confirm change'}).getByRole('button',{name:'Delete entry',exact:true}).click();await expect(activity.locator(`#entry-${fixture.timelineEntryId}`)).toHaveCount(0);assert.equal((await request(page,`/api/v1/records/opportunity/${fixture.opportunityId}`,undefined,'GET')).timeline.some(item=>item.id===fixture.timelineEntryId),false);
const disposable=await request(page,'/api/v1/records/contact',{name:'Delete only after confirmation',email:'delete-review@example.test',contactability:'do_not_contact'});
// Email permission: going back to Contactable is the reviewed clear, asking once under the field.
await page.goto(origin+`/app/contacts/${disposable.id}`);const permission=page.getByLabel('Email permission',{exact:true});await permission.selectOption('contactable');await page.getByRole('group',{name:'Confirm change'}).getByRole('button',{name:'Keep do not contact',exact:true}).click();assert.equal((await request(page,`/api/v1/records/contact/${disposable.id}`,undefined,'GET')).record.contactability,'do_not_contact');await expect(permission).toHaveValue('do_not_contact');
await permission.selectOption('contactable');await page.getByRole('group',{name:'Confirm change'}).getByRole('button',{name:'Clear do-not-contact',exact:true}).click();await expect.poll(async()=>(await request(page,`/api/v1/records/contact/${disposable.id}`,undefined,'GET')).record.contactability).toBe('contactable');await expect(permission).toHaveValue('contactable');
await page.getByRole('button',{name:'Delete contact',exact:true}).click();await page.getByRole('group',{name:'Confirm change'}).getByRole('button',{name:'Keep it',exact:true}).click();assert.equal((await request(page,`/api/v1/records/contact/${disposable.id}`,undefined,'GET')).record.id,disposable.id);
await page.getByRole('button',{name:'Delete contact',exact:true}).click();await page.getByRole('group',{name:'Confirm change'}).getByRole('button',{name:'Delete',exact:true}).click();await expect(page).toHaveURL(origin+'/app/contacts');await expect(page.getByRole('heading',{name:'Records',exact:true})).toBeVisible();assert.equal(await requestStatus(page,`/api/v1/records/contact/${disposable.id}`),404);await page.reload();await expect(page.getByRole('heading',{name:'Records',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Edit details',exact:true})).toHaveCount(0);
await exerciseDuplicateMerge(page,origin,fixture,(name,width)=>observeOperator(page,name,width,directory,observations));
assert.deepEqual(nativeDialogs,[]);
}
