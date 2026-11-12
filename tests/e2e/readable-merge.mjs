import {expect} from '@playwright/test';
import {authenticateOperator} from './operator-session.mjs';

export async function readableMergeReview(browser,page,draft,info){
 const ownerContext=await browser.newContext({baseURL:new URL(page.url()).origin,viewport:{width:1440,height:900}});
 try{
  await authenticateOperator(ownerContext,{owner:true});
  const owner=await ownerContext.newPage();await owner.goto('/app/settings/mail/library',{waitUntil:'networkidle'});
  const name='Synthetic Orbit readable merge';
  await owner.getByLabel('Name',{exact:true}).fill(name);
  await owner.getByLabel('Visibility',{exact:true}).selectOption('shared');
  await owner.getByLabel('Subject',{exact:true}).fill('Plan for {{company.name}}');
  await owner.getByLabel('Body',{exact:true}).fill('Hi {{contact.name}}, discuss {{deal.title}}. {{contact.job_title}}');
  await owner.getByRole('button',{name:'Save entry',exact:true}).click();
  await expect(owner.getByRole('status')).toContainText('Saved '+name);
  await owner.getByText('Available merge fields',{exact:true}).click();
  await expect(owner.locator('.library-field-help')).toContainText('{{company.name}}');
  await owner.screenshot({path:info.outputPath('message-library-1440.png'),fullPage:true});await owner.setViewportSize({width:390,height:900});await owner.screenshot({path:info.outputPath('message-library-390.png'),fullPage:true});
  const result=await (await page.request.get('/api/v1/library')).json(),template=result.entries.find(entry=>entry.name===name);
  await page.goto('/app/drafts/'+draft.id,{waitUntil:'networkidle'});
  await page.getByText('Use a template, snippet or signature',{exact:true}).click();
  await page.getByRole('combobox',{name:'Library template',exact:true}).selectOption(template.id);
  await page.getByRole('button',{name:'Apply selected content',exact:true}).click();
  const review=page.locator('.rendered-merge-review');
  await expect(review.locator('dl')).toBeVisible();
  const render=await (await page.request.get('/api/v1/library/drafts/'+draft.id+'/render')).json();
  const terms=await review.locator('dt').allTextContents(),values=await review.locator('dd').allTextContents();
  expect(terms).toHaveLength(render.fields.length);
  for(const [i,field] of render.fields.entries()){
   expect(terms[i]).not.toContain('.');expect(terms[i]).not.toContain('_');expect(terms[i]).not.toBe(field.name);
   if(field.value?.trim())expect(values[i]).toBe(field.value);
  }
  expect(await review.innerText()).not.toMatch(/company\.name|contact\.(name|job_title)|deal\.title/);
  if(render.missing.length)await expect(review.getByRole('button',{name:'Confirm rendered merge values',exact:true})).toBeDisabled();
  await page.screenshot({path:info.outputPath('merge-values-1440.png'),fullPage:true});
  await page.setViewportSize({width:390,height:900});await page.screenshot({path:info.outputPath('merge-values-390.png'),fullPage:true});await page.setViewportSize({width:1440,height:900});
 }finally{await ownerContext.close();}
}
