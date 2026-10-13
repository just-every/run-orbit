import {expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
/** Exercise the existing editable history through its single opportunity home. */
export async function editOpportunityHistory(page){
 try{
 await page.getByText('Complete or skip this action',{exact:true}).click();
 await page.getByLabel('Action outcome note (optional)',{exact:true}).fill('Walkthrough arranged with the customer.');
 await page.getByRole('button',{name:'Mark action complete',exact:true}).click();
 const timeline=page.getByTestId('opportunity-timeline');
 await expect(timeline).toContainText('Outcome: Completed');
 await expect(timeline).toContainText('Walkthrough arranged with the customer.');
 await page.getByText('Log activity',{exact:true}).click();
 const add=page.locator('form.manual-entry').filter({has:page.getByRole('heading',{name:'Add to timeline',exact:true})});
 for(const text of ['First meeting note','Second meeting note']){
  await add.getByLabel('Text',{exact:true}).fill(text);
  await add.getByRole('button',{name:'Save entry',exact:true}).click();
  await expect(timeline).toContainText(text);
 }
 await timeline.locator('li').filter({hasText:'First meeting note'}).getByRole('button',{name:'Edit entry',exact:true}).click();
 const edit=timeline.locator('form.manual-entry');
 await expect(edit.getByLabel('Text',{exact:true})).toHaveValue('First meeting note');
 await timeline.locator('li').filter({hasText:'Second meeting note'}).getByRole('button',{name:'Edit entry',exact:true}).click();
 await expect(edit.getByLabel('Text',{exact:true})).toHaveValue('Second meeting note');
 await edit.getByLabel('Text',{exact:true}).fill('Second meeting note revised');
 await edit.getByRole('button',{name:'Save entry',exact:true}).click();
 await expect(timeline).toContainText('Second meeting note revised');
 await expect(timeline).toContainText('First meeting note');
 await page.getByText('Log activity',{exact:true}).click();
 }catch(error){
  const directory=process.env.ORBIT_EVIDENCE_DIR;
  if(directory){await mkdir(directory,{recursive:true});const name=join(directory,`opportunity-editing-${page.viewportSize().width}`);await writeFile(name+'.html',await page.locator('body').innerHTML());await writeFile(name+'.json',JSON.stringify(await page.evaluate(()=>({path:location.pathname,forms:[...document.querySelectorAll('form')].map(form=>({className:form.className,parent:form.parentElement?.tagName,text:form.textContent,fields:[...form.elements].map(field=>({tag:field.tagName,type:field.type,label:field.labels?.[0]?.textContent,value:field.value}))})),timeline:document.querySelector('[data-testid=opportunity-timeline]')?.outerHTML})),null,2));await page.screenshot({path:name+'.png',fullPage:true});}
  throw error;
 }
}
