import {expect} from '@playwright/test';

/** The seller narrows a phone board and uses the touch help in its sharing controls. */
export async function phoneDashboard(page) {
 const month=new Date().toISOString().slice(0,7),origin=new URL(page.url()).origin;
 const headers={Origin:origin};
 const settings=await(await page.request.get('/api/v1/settings')).json(),workspace=settings.workspace;
 const configured=await page.request.put('/api/v1/settings',{headers,data:{name:workspace.name,timezone:workspace.timezone,currency:'USD',workingHours:JSON.parse(workspace.working_hours_json),staleIntervalDays:workspace.stale_interval_days,awaitingResponseWorkingDays:workspace.awaiting_response_working_days,freeMailDomains:JSON.parse(workspace.free_mail_domains_json)}});
 expect(configured.ok(),await configured.text()).toBe(true);
 const report=await page.request.post('/api/v2/workspaces/workspace/operations/metrics',{headers,data:{id:'phone-pipeline',version:1,definition:{kind:'sales',name:'Phone pipeline',description:'Current sales pipeline',measures:['pipeline'],pipelineIds:[],repIds:[],groupBy:'pipeline',bucket:'month'},sharing:{audience:'workspace',operatorIds:[]}}});
 expect(report.ok(),await report.text()).toBe(true);
 const created=await page.request.put('/api/v2/workspaces/workspace/dashboards/phone-smoke',{headers:{Origin:origin},data:{version:0,definition:{name:'Phone review',filters:{ownerIds:[],pipelineIds:[],from:month,through:month,field:null},tiles:[{id:'pipeline',source:'report',sourceId:'phone-pipeline',version:'live',snapshotId:null,measure:'pipeline',kind:'number',width:12,height:1,bindings:{}}]}}});
 expect(created.ok(),await created.text()).toBe(true);
 await page.goto('/app/dashboards/phone-smoke');
 await expect(page.getByRole('heading',{name:'Phone review',exact:true})).toBeVisible();
 const filters=page.locator('.dash-filters');await filters.locator('summary').click();
 const owner=filters.getByRole('combobox',{name:'Owner',exact:true});
 const chosen=await owner.locator('option').evaluateAll(options=>options.map(option=>option.value).find(Boolean));
 expect(chosen).toBeTruthy();await owner.selectOption(chosen);
 await page.getByRole('button',{name:'Remove owner filter',exact:true}).click();await expect(owner).toHaveValue('');
 await page.getByRole('button',{name:'Schedule email',exact:true}).click();
 const close=page.getByRole('dialog').getByRole('button',{name:'Close dialog',exact:true});
 await close.dispatchEvent('pointerdown',{pointerType:'touch'});await expect(page.getByRole('tooltip',{name:'Close dialog',exact:true})).toBeVisible();await close.dispatchEvent('pointerup',{pointerType:'touch'});
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Share',exact:true}).click();await page.getByRole('radio',{name:'Named people',exact:true}).check();
 const picker=page.getByLabel('Add a person',{exact:true}),person=await picker.locator('option').evaluateAll(options=>options.map(option=>option.value).find(Boolean));
 expect(person).toBeTruthy();await picker.selectOption(person);
 const remove=page.locator('.dash-grant button');
 await remove.dispatchEvent('pointerdown',{pointerType:'touch'});await expect(page.getByRole('tooltip')).toBeVisible();await remove.dispatchEvent('pointerup',{pointerType:'touch'});
 await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
}
