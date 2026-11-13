import {expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

/** A chosen deal value keeps the same monetary meaning after saving and reopening. */
export async function savedDealValueJourney(page){
 const origin=new URL(page.url()).origin;
 const settings=await (await page.request.get('/api/v1/settings')).json();
 const deals=[['Bluebird Analytics data platform',18000000],['Harbor Logistics fleet tracking',4500000],['Discovery pilot',0],['Implementation workshop',123456]];
 for(const [title,value_cents] of deals){
  const response=await page.request.post('/api/v1/records/opportunity',{headers:{Origin:origin},data:{title,stage_id:settings.stages[0].id,value_cents,contact_ids:[]}});
  expect(response.status(),await response.text()).toBe(201);
 }
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/app/opportunities');
 const rows=deals.map(([title])=>page.locator('.records-list>li').filter({has:page.getByRole('heading',{name:title,exact:true})}));
 const amounts=[];
 for(const row of rows){await expect(row).toBeVisible();amounts.push((await row.locator('p').innerText()).split(' · ').at(-1));}
 // The default list is already the product's workspace-currency presentation.
 for(const [index,amount] of amounts.entries()){expect(amount).toMatch(/[A-Z$€£¥]/);expect(amount).not.toBe(String(deals[index][1]));}
 const views=page.getByRole('region',{name:'Saved record views',exact:true});
 await views.locator('summary').click();
 await views.getByRole('checkbox',{name:'Value',exact:true}).check();
 const value=row=>row.locator('dt').filter({hasText:/^Value$/}).locator('..').locator('dd');
 for(const [index,row] of rows.entries())await expect(value(row)).toHaveText(amounts[index]);
 await views.getByLabel('View name',{exact:true}).fill('Deal amounts');
 await views.getByRole('button',{name:'Save new view',exact:true}).click();
 await expect(views.getByRole('status')).toHaveText('View saved.');
 const id=await views.getByLabel('Saved view',{exact:true}).inputValue();expect(id).toBeTruthy();
 await page.goto('/app/contacts');await page.goto('/app/opportunities');
 await views.getByLabel('Saved view',{exact:true}).selectOption(id);
 const evidence='.orbit-viewport-evidence/saved-deal-value';await mkdir(evidence,{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  for(const [index,row] of rows.entries())await expect(value(row)).toHaveText(amounts[index]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:`${evidence}/saved-value-${width}.png`,fullPage:true});
 }
}
