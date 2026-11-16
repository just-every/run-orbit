import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {request,requestStatus} from './operator-fixture.mjs';
import {observeOperator} from './operator-observations.mjs';
import {exerciseDuplicateMerge} from './operator-merge.mjs';
import {exerciseManualMeeting} from './operator-manual-meeting.mjs';

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
await exerciseManualMeeting({page,fixture,origin,directory,observations});
 { // Deal details exposes the existing explicit, guarded cross-pipeline move.
 await page.setViewportSize({width:1440,height:900});
 const settings=await request(page,'/api/v1/settings',undefined,'GET'),actor=settings.operators.find(item=>item.setup_owner===1)??settings.operators[0];
 const destination=await request(page,'/api/v1/settings/pipelines',{name:'Clinic expansion',stages:[{name:'Discovery',probability:30,requiredFields:[],staleIntervalDays:14},{name:'Commercial review',probability:60,requiredFields:[],staleIntervalDays:14}]});
 const refreshed=await request(page,'/api/v1/settings',undefined,'GET'),destinationStage=refreshed.stages.find(item=>item.pipeline_id===destination.id&&item.name==='Discovery');
 const deal=await request(page,'/api/v1/records/opportunity',{title:'Clinic analytics rollout',stage_id:settings.stages[0].id,owner_id:null,value_cents:1000000});
 const detail=()=>request(page,`/api/v1/records/opportunity/${deal.id}`,undefined,'GET');
 await page.goto(origin+`/app/opportunities/${deal.id}`);
 await page.getByRole('combobox',{name:'Owner',exact:true}).selectOption(actor.id);
 await expect.poll(async()=>(await detail()).record.owner_id).toBe(actor.id);
 await page.reload();
 const owned=await detail(),ownerEvents=owned.timeline.filter(item=>item.kind==='owner.changed');
 assert.equal(ownerEvents.length,1);assert.equal(ownerEvents[0].actor_id,actor.id);
 assert.ok(!owned.timeline.some(item=>item.kind==='record.updated'&&JSON.parse(item.payload_json).text==='Changed Owner'),'one owner edit has one history entry');
 const activity=page.getByTestId('record-activity');await expect(activity).toContainText(actor.display_name);
 await page.getByRole('combobox',{name:'Pipeline',exact:true}).selectOption(destination.id);
 const mapping=page.getByRole('group',{name:'Move between pipelines'});
 await expect(mapping.getByRole('button',{name:'Move deal',exact:true})).toBeDisabled();
 assert.equal((await detail()).record.stage_id,settings.stages[0].id,'choosing a pipeline alone never moves the deal');
 await mapping.getByLabel('Destination stage',{exact:true}).selectOption(destinationStage.id);
 await mapping.getByRole('button',{name:'Move deal',exact:true}).click();
 await expect.poll(async()=>(await detail()).record.stage_id).toBe(destinationStage.id);
 await expect(page.getByRole('combobox',{name:'Pipeline',exact:true})).toHaveValue(destination.id);
 await page.reload();const moved=await detail();
 assert.equal(moved.record.lifecycle,owned.record.lifecycle);assert.equal(moved.record.score,owned.record.score);assert.equal(moved.record.owner_id,owned.record.owner_id);
 assert.equal(moved.movementHistory.length,1);const move=moved.movementHistory[0];
 assert.equal(move.previous,owned.record.stage_id);assert.equal(move.current,destinationStage.id);assert.equal(move.actor_id,actor.id);assert.ok(Number.isFinite(Date.parse(move.occurred_at)));
 const removal=await page.evaluate(async id=>(await fetch('/api/v1/settings/pipelines/'+id,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmed:true})})).status,destination.id);assert.equal(removal,409,'occupied destination cannot be deleted');
 await expect(page.getByRole('combobox',{name:'Stage',exact:true})).toHaveValue(destinationStage.id);
 await expect(activity).toContainText('Discovery');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:directory+`/clinic-move-owner-${width}.png`,fullPage:true});}

 }
for(const width of widths){
 await page.setViewportSize({width,height:900});await page.goto(origin+'/app/opportunities/new');await expect(page.getByRole('button',{name:'Save opportunity'})).toBeEnabled();await page.getByRole('button',{name:'Save opportunity'}).click();await expect(page.getByLabel('Contact name',{exact:true})).toBeFocused();
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
