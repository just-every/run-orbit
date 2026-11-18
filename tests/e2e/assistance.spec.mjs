import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
import {assistanceApprovalScreens} from '../agent-door/native-journey.mjs';
import {requestOfflineFixture} from '../../scripts/browser-runtime.mjs';
import {authenticateOperator} from './operator-session.mjs';
test('AI-001 AI-003 exact provider request remains inspectable alongside readable evidence and recipient summaries; provider approval and an unsent agent draft remain inspectable',async({page,context})=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',error=>errors.push(error.message));await authenticateOperator(context);await page.goto('/app/assistance/01J0000000000000000000000F',{waitUntil:'networkidle'});await expect(page.getByRole('combobox',{name:'Recipient',exact:true})).toBeVisible();const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/assistance/preview'));await page.getByRole('button',{name:'Preview request',exact:true}).click();const preview=await(await response).json();
 await expect(page.getByRole('heading',{name:preview.preview.opportunity.title,exact:true})).toBeVisible();await expect(page.getByLabel('Recipient & goal').getByText(preview.preview.contact.email,{exact:true})).toBeVisible();for(const entry of preview.preview.evidence)await expect(page.locator('.assistance-evidence summary').filter({hasText:entry.subject??entry.type.replaceAll(/[._]/g,' ')})).toBeVisible();await expect(page.getByRole('button',{name:'Generate draft',exact:true})).toBeDisabled();await expect(page.getByText('AI is not configured. A request cannot generate content until the owner configures its provider.')).toBeVisible();
 mkdirSync('verification/ui',{recursive:true});for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`verification/ui/${width}-assistance-preview.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();expect(accessibility.violations,`${width}px preview accessibility`).toEqual([]);}
 await page.getByText('View complete request',{exact:true}).click();await expect(page.locator('.assistance-complete-fields')).toBeVisible();await expectRequestFields(page.locator('.assistance-complete-fields'),readableRequest({...preview.preview,contact:{...preview.preview.contact,custom_fields_json:JSON.parse(preview.preview.contact.custom_fields_json)}}));const expanded=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();expect(expanded.violations).toEqual([]);await page.screenshot({path:'verification/ui/390-assistance-exact-request.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.getByRole('button',{name:'Revise inputs',exact:false}).click();await expect(page.getByRole('combobox',{name:'Recipient',exact:true})).toBeVisible();expect(errors).toEqual([]);
 await requestOfflineFixture('tests/support/agent-door-ai-browser-source.ts');
 await assistanceApprovalScreens({page});
});

async function expectRequestFields(container,value){
 if(value===null){await expect(container).toHaveText('No value');return;}
 if(Array.isArray(value)){if(!value.length){await expect(container).toHaveText('No items');return;}const rows=container.locator(':scope > ol > li');await expect(rows).toHaveCount(value.length);for(let i=0;i<value.length;i++)await expectRequestFields(rows.nth(i),value[i]);return;}
 if(typeof value==='object'){const rows=container.locator(':scope > dl > div');await expect(rows).toHaveCount(Object.keys(value).length);for(const [key,item]of Object.entries(value)){const exact=container.locator(`:scope > dl > div[data-field="${key}"] > dd`);await expectRequestFields(exact,item);}return;}
 await expect(container).toHaveText(String(value));
}

// The complete request is read in a person's terms: internal identifiers, checksums and codes are left out and a stored JSON column is opened under its plain name.
const internal=/(^id$|_id$|Id$|Ids$|_ids$|_key$|Key$|Keys$|_hash$|[Hh]ash$|revision$|^feature$|^source_event_id$)/;
function readableRequest(value,inside=false){
 if(Array.isArray(value))return value.map(item=>readableRequest(item,inside));
 if(!value||typeof value!=='object')return value;
 const out={};
 for(const [key,item]of Object.entries(value)){
  if(internal.test(key))continue;
  let name=key,child=item,nested=inside;
  if(!inside&&key.endsWith('_json')){if(typeof item==='string'){try{child=JSON.parse(item);}catch{child=item;}}if(child&&typeof child==='object'){name=key.replace(/_json$/,'');nested=true;}}
  const shown=readableRequest(child,nested);
  if(shown&&typeof shown==='object'&&!Array.isArray(shown)&&!Object.keys(shown).length)continue;
  out[name]=shown;
 }
 return out;
}
