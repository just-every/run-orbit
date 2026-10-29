import {expect} from '@playwright/test';

/** The seller narrows a phone board and uses the touch help in its sharing controls. */
export async function phoneDashboard(page) {
 const month=new Date().toISOString().slice(0,7),origin=new URL(page.url()).origin;
 const created=await page.request.put('/api/v2/workspaces/workspace/dashboards/phone-smoke',{headers:{Origin:origin},data:{version:0,definition:{name:'Phone review',filters:{ownerIds:[],pipelineIds:[],from:month,through:month,field:null},tiles:[]}}});
 expect(created.ok(),await created.text()).toBe(true);
 await page.goto('/app/dashboards/phone-smoke');
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
