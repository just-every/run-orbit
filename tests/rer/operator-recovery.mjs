import {expect} from '@playwright/test';

async function expectHashTarget(page,id){
 const target=page.locator(`#${id}`);
 await expect(target).toBeFocused();
 await expect(target.getByRole('heading').first()).toBeInViewport();
}

export async function recoverOperatorRoutes(page,origin){
 for(const [path,destination] of [
  ['/app/opportunities','/app/records'],['/app/companies','/app/records?kind=company'],['/app/contacts','/app/records?kind=contact'],
  ...['now','today','meetings','drafts','assistance'].map(name=>[`/app/${name}`,'/app']),
 ]){
  const response=await page.request.get(origin+path);
  expect(response.status()).toBe(200);
  const url=new URL(response.url());expect(url.pathname+url.search).toBe(destination);
  await response.dispose();
 }
 for(const kind of ['opportunities','meetings','drafts','assistance']){
  for(const id of ['invalid.id','00000000000000000000000000']){
   const read=kind==='meetings'?`/api/v1/today/meetings/${id}`:kind==='drafts'?`/api/v1/drafts/${id}`:`/api/v1/opportunities/${id}`;
   const response=await page.request.get(origin+read);expect(response.status()).toBe(404);await response.dispose();
   if(kind==='opportunities'){
    const drafts=await page.request.get(origin+`/api/v1/drafts?opportunityId=${id}`);expect(drafts.status()).toBe(404);await drafts.dispose();
   }
   await page.goto(origin+`/app/${kind}/${id}`);
   await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
   await expect(page.getByRole('main').locator('form')).toHaveCount(0);
   const back=page.getByRole('main').locator('a[href="/app/records"]');await expect(back).toBeVisible();await back.click();
   await expect(page).toHaveURL(origin+'/app/records');
   const create=page.getByRole('link',{name:'Create opportunity',exact:true});
   await expect(create).toBeVisible();await expect(create).toHaveAttribute('href','/app/new');
  }
 }
 await page.goto(origin+'/app/settings#mail-sender');
 await page.getByRole('button',{name:'Save workspace',exact:true}).waitFor();
 await expectHashTarget(page,'mail-sender');
 await page.goto(origin+'/app/reports#forecast');
 await expectHashTarget(page,'forecast');
 await page.goto(origin+'/app');await page.getByTestId('now-queue').waitFor();
}
