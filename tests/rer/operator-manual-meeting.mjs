import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {request} from './operator-fixture.mjs';
import {observeOperator} from './operator-observations.mjs';

/** Native manual creation, then another full operator edits and deletes that exact meeting. */
export async function exerciseManualMeeting({page,fixture,origin,directory,observations}){
 const path=`/api/v1/records/opportunity/${fixture.opportunityId}`,read=operator=>request(operator,path,undefined,'GET');
 const extra=await request(page,'/api/v1/records/contact',{name:'synthetic-orbit-97 attendee',company_id:fixture.companyId});
 const detail=await read(page),contactIds=[fixture.contactId,extra.id];
 await request(page,path,{...detail.record,contact_ids:contactIds,primary_contact_id:fixture.contactId},'PUT');
 const state=async operator=>{const {record}=await read(operator);return {score:record.score,band:record.band,drafts:(await request(operator,`/api/v1/drafts?opportunityId=${fixture.opportunityId}`,undefined,'GET')).drafts,messages:(await request(operator,`/api/v1/workbench/opportunities/${fixture.opportunityId}/messages`,undefined,'GET')).messages};};
 const before=await state(page);assert.ok(before.score>0);assert.ok(before.drafts.length>0,'An existing unsent draft makes mail independence observable');
 await page.setViewportSize({width:1440,height:900});await page.goto(origin+`/app/opportunities/${fixture.opportunityId}`);
 const activity=page.getByTestId('record-activity');await activity.getByRole('button',{name:'Add a note',exact:true}).click();
 const form=activity.locator('form.manual-entry');await form.getByRole('combobox',{name:/^Entry type/}).selectOption('meeting');
 await form.getByLabel('Text',{exact:true}).fill('synthetic-orbit-97 meeting with both buyers');
 await form.getByLabel('Occurred at',{exact:true}).fill('2026-01-12T14:07');await form.getByLabel('Duration (minutes)',{exact:true}).fill('37');
 await expect(form.getByRole('checkbox')).toHaveCount(2);for(const checkbox of await form.getByRole('checkbox').all())await checkbox.check();
 await form.getByRole('button',{name:'Add meeting',exact:true}).click();
 await expect.poll(async()=> (await read(page)).timeline.find(row=>row.kind==='manual.meeting'&&JSON.parse(row.payload_json).text==='synthetic-orbit-97 meeting with both buyers')?.id).not.toBeUndefined();
 const first=(await read(page)).timeline.find(row=>row.kind==='manual.meeting'&&JSON.parse(row.payload_json).text==='synthetic-orbit-97 meeting with both buyers');
 assert.deepEqual([first.occurred_at,JSON.parse(first.payload_json).durationMinutes,JSON.parse(first.payload_json).contactIds],['2026-01-12T14:07:00.000Z',37,contactIds]);
 const other=await fixture.openFullOperator();
 try{
  const editor=other.page;await editor.goto(origin+`/app/opportunities/${fixture.opportunityId}`);
  const entry=editor.locator(`#entry-${first.id}`);await entry.getByText('Edit entry',{exact:true}).click();
  const text=entry.getByLabel('Text',{exact:true});await expect(text).toBeFocused();await text.fill('synthetic-orbit-97 meeting confirmed with both buyers');await text.press('Control+Enter');
  await expect.poll(async()=>JSON.parse((await read(editor)).timeline.find(row=>row.id===first.id).payload_json).text).toBe('synthetic-orbit-97 meeting confirmed with both buyers');
  await entry.getByLabel(/^When \(/).fill('2026-01-12T15:23');await entry.getByLabel(/^When \(/).press('Enter');
  await expect.poll(async()=>(await read(editor)).timeline.find(row=>row.id===first.id).occurred_at).toBe('2026-01-12T15:23:00.000Z');
  await editor.reload();await entry.getByText('Edit entry',{exact:true}).click();await expect(entry.getByLabel('Text',{exact:true})).toHaveValue('synthetic-orbit-97 meeting confirmed with both buyers');await expect(entry.getByLabel(/^When \(/)).toHaveValue('2026-01-12T15:23');
  const edited=(await read(editor)).timeline.find(row=>row.id===first.id);
  assert.deepEqual([edited.actor_id,edited.actor_name,edited.recorded_at,JSON.parse(edited.payload_json).durationMinutes,JSON.parse(edited.payload_json).contactIds],[first.actor_id,first.actor_name,first.recorded_at,37,contactIds]);
  await expect(entry).toContainText('37 minutes');await expect(entry).toContainText('Operator review contact, synthetic-orbit-97 attendee');
  await entry.getByText('Recorded details',{exact:true}).click();await expect(entry).toContainText(first.actor_name);
  for(const width of [1440,390])await observeOperator(editor,'manual-meeting-edit',width,directory,observations);
  await editor.setViewportSize({width:1440,height:900});await entry.getByRole('button',{name:'Delete entry',exact:true}).click();
  const confirmation=entry.getByRole('group',{name:'Confirm change'});await expect(confirmation).toContainText('Delete this entry from every record it is on?');
  for(const width of [1440,390])await observeOperator(editor,'manual-meeting-delete',width,directory,observations);
  await editor.setViewportSize({width:1440,height:900});await confirmation.getByRole('button',{name:'Delete entry',exact:true}).click();await expect(entry).toHaveCount(0);await editor.reload();await expect(entry).toHaveCount(0);
  const after=await read(editor);assert.equal(after.timeline.some(row=>row.id===first.id),false);
  const traces=after.timeline.filter(row=>row.kind==='entry.deleted'&&JSON.parse(row.payload_json).entryId===first.id);assert.equal(traces.length,1);assert.notEqual(traces[0].actor_id,first.actor_id);assert.equal(JSON.parse(traces[0].payload_json).kind,'meeting');
  assert.deepEqual(await state(editor),before,'The complete manual meeting lifecycle changes no score, band, draft or outbound message');
 }finally{await other.context.close();}
}
