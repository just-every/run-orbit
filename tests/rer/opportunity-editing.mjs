import {expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
/** Exercise the existing editable history through its single opportunity home. */
export async function editOpportunityHistory(page){
 try{
 // OR3: the next action's Mark done records the outcome; Add a note ends in Add note; an entry's text saves in place.
 const activity=page.getByTestId('record-activity'),feed=activity.locator('.r-feed');
 await page.getByTestId('next-action').getByRole('button',{name:'Mark done',exact:true}).click();
 await expect(feed).toContainText('Marked the next action done');
 await page.getByRole('button',{name:'Add a note',exact:true}).click();
 const add=activity.locator('form.manual-entry');
 for(const text of ['First meeting note','Second meeting note']){
  await add.getByLabel('Text',{exact:true}).fill(text);
  await add.getByRole('button',{name:'Add note',exact:true}).click();
  await expect(feed).toContainText(text);
 }
 const first=feed.locator('li').filter({hasText:'First meeting note'});
 await first.getByText('Edit entry',{exact:true}).click();
 await expect(first.getByLabel('Text',{exact:true})).toHaveValue('First meeting note');
 await first.getByText('Edit entry',{exact:true}).click();
 const second=feed.locator('li').filter({hasText:'Second meeting note'});
 await second.getByText('Edit entry',{exact:true}).click();
 const text=second.getByLabel('Text',{exact:true});
 await expect(text).toHaveValue('Second meeting note');
 await text.fill('Second meeting note revised');await text.blur();
 await expect(second.getByRole('status').filter({hasText:'Saved'})).toBeVisible();
 await expect(feed).toContainText('Second meeting note revised');
 await expect(feed).toContainText('First meeting note');
 await page.getByRole('button',{name:'Add a note',exact:true}).click();
 }catch(error){
  const directory=process.env.ORBIT_EVIDENCE_DIR;
  if(directory){await mkdir(directory,{recursive:true});const name=join(directory,`opportunity-editing-${page.viewportSize().width}`);await writeFile(name+'.html',await page.locator('body').innerHTML());await writeFile(name+'.json',JSON.stringify(await page.evaluate(()=>({path:location.pathname,forms:[...document.querySelectorAll('form')].map(form=>({className:form.className,parent:form.parentElement?.tagName,text:form.textContent,fields:[...form.elements].map(field=>({tag:field.tagName,type:field.type,label:field.labels?.[0]?.textContent,value:field.value}))})),timeline:document.querySelector('[data-testid=record-activity]')?.outerHTML})),null,2));await page.screenshot({path:name+'.png',fullPage:true});}
  throw error;
 }
}
