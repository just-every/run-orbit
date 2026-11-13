import {expect} from '@playwright/test';
import {authenticateOperator} from './operator-session.mjs';

/** Extend the retained timeline journey without another test registration. */
export async function taskActivityJourney(browser, info) {
 const context=await browser.newContext({baseURL:info.project.use.baseURL,viewport:{width:1440,height:1000}});
 try {
  await authenticateOperator(context,{owner:true});
  const page=await context.newPage();await page.goto('/app');
  const origin=new URL(page.url()).origin;
  async function call(path,body,method=body===undefined?'GET':'POST') {
   const response=await page.request.fetch(path,{method,headers:{Origin:origin},data:body});
   expect(response.ok(),await response.text()).toBe(true);return response.json();
  }
  const settings=await call('/api/v1/settings'),suffix=Date.now();
  const {id:deal}=await call('/api/v1/records/opportunity',{title:`Synthetic clinic ${suffix}`,stage_id:settings.stages[0].id,value_cents:100000});
  const title=`Call clinic about rollout ${suffix}`;
  const input={title,recordType:'opportunity',recordId:deal,ownerId:null,dueAt:'2027-03-07T14:00:00Z',priority:'normal',type:'call',notes:'',recurrence:'weekly',timezone:'America/New_York',reminderMinutes:null};
  const task=await call('/api/v1/tasks',input);
  await page.goto(`/app/tasks/${task.id}`);
  const completed=page.waitForResponse(response=>response.request().method()==='PUT'&&new URL(response.url()).pathname===`/api/v1/tasks/${task.id}`);
  await page.getByRole('button',{name:'Complete task',exact:true}).click();expect((await completed).ok()).toBe(true);
  const workflowTitle=`Prepare clinic follow-up ${suffix}`;
  const {workflow}=await call('/api/workflows',{name:`Synthetic clinic workflow ${suffix}`,definition:{trigger:{kind:'activity_logged',recordType:'opportunity',activityKind:'note'},conditions:[{field:'title',operator:'equals',value:`Synthetic clinic ${suffix}`}],actions:[{kind:'create_task',title:workflowTitle}]}});
  const preview=await call(`/api/workflows/${workflow.id}/preview`,{});await call(`/api/workflows/${workflow.id}/activate`,{previewId:preview.previewId});
  await call(`/api/v1/records/opportunity/${deal}/entries`,{kind:'note',text:'Synthetic clinic follow-up requested',occurredAt:new Date().toISOString()});await call('/api/workflows/process',{});
  const read=await call(`/api/v1/records/opportunity/${deal}`),events=read.timeline.filter(entry=>entry.kind.startsWith('task.'));
  expect(events).toHaveLength(4);
  const snapshots=events.map(entry=>({...entry}));
  await page.goto(`/app/opportunities/${deal}`);
  const activity=page.getByTestId('record-activity');
  // The public opportunity read supplies the same immutable events and metadata.
  const opportunity=(await call(`/api/v1/opportunities/${deal}`)).opportunity;
  const presentation=opportunity.timeline.filter(entry=>events.some(event=>event.id===entry.id));
  expect(presentation.map(entry=>({id:entry.id,occurredAt:entry.occurredAt,recordedAt:entry.recordedAt}))).toEqual(events.map(entry=>({id:entry.id,occurredAt:entry.occurred_at,recordedAt:entry.recorded_at})));
  for(const event of events){
   const payload=JSON.parse(event.payload_json),row=activity.locator(`#entry-${event.id}`);
   await expect(row.locator('.r-entry-title')).toHaveText(payload.title);
   const summary=row.locator('.r-entry-line');
   if(event.kind==='task.completed')await expect(summary).toContainText(/completed/i);
   else if(payload.occurrence>0){
    await expect(summary).toContainText(/next occurrence.*created/i);
    const dueText=await page.evaluate(({due,zone})=>new Intl.DateTimeFormat('en-US',{timeZone:zone,calendar:'gregory',year:'numeric',month:'2-digit',day:'2-digit',numberingSystem:'latn',hour:'numeric',minute:'2-digit'}).format(new Date(due)),{due:payload.dueAt,zone:settings.workspace.timezone});
    await expect(summary).toContainText(dueText);
   }else await expect(summary).toContainText(/created/i);
   const visible=await row.locator('.r-entry-title,.r-entry-line,.r-kind,.r-when').allTextContents();
   expect(visible.join(' ')).not.toMatch(/task\.(created|completed)|follow_up|[0-9A-HJKMNP-TV-Z]{26}/);
   const native=presentation.find(entry=>entry.id===event.id);
   await expect(summary).toContainText(native.actorName??native.sourceName);
   await row.getByText('Recorded details',{exact:true}).click();
   const metadata=row.locator('details > p').first();
   await expect(metadata).toContainText(/Occurred.*recorded/);
   await expect(metadata).toContainText(native.actorName??native.actorType);
   await expect(metadata).toContainText(native.sourceName);
   await row.getByText('Recorded details',{exact:true}).click();
  }
  const expected=events.map(event=>`entry-${event.id}`);
  const actual=await activity.locator('.r-feed > li').evaluateAll((rows,ids)=>rows.map(row=>row.id).filter(id=>ids.includes(id)),expected);
  expect(actual).toEqual(expected);
  expect((await call(`/api/v1/records/opportunity/${deal}`)).timeline.filter(entry=>entry.kind.startsWith('task.'))).toEqual(snapshots);
  await activity.screenshot({path:info.outputPath('task-activity-1440.png')});
  // Browser proof only at the second width; assertions above run at 1440.
  await page.setViewportSize({width:390,height:1000});await activity.screenshot({path:info.outputPath('task-activity-390.png')});
  await info.attach('task-activity.json',{contentType:'application/json',body:JSON.stringify({events,presentation,expected,actual},null,2)});
 }finally{await context.close();}
}
