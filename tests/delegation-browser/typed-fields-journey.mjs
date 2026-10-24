import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function typedFieldsJourney(page,contact){const evidence=resolve('.orbit-viewport-evidence/typed-fields');await mkdir(evidence,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/app/settings');const fields=page.getByRole('region',{name:'Custom field definitions',exact:true});await expect(fields.getByRole('combobox',{name:'Field record type'})).toBeVisible();await fields.getByText('Define or change a field',{exact:true}).click();await fields.getByLabel('Field key',{exact:true}).fill('synthetic_required');await fields.getByLabel('Field name',{exact:true}).fill('Synthetic required field');await fields.getByRole('checkbox',{name:'Required',exact:true}).check();
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('field-settings',width,fields,'[aria-labelledby="typed-fields"]');}
 await fields.getByRole('button',{name:'Preview affected records',exact:true}).click();const preview=fields.getByRole('region',{name:'Affected field records',exact:true});await expect(preview).toContainText('Synthetic Calendar Contact: a value is required');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('affected-record-preview',width,fields,'[aria-labelledby="typed-fields"]');}
 await preview.getByRole('button',{name:'Apply reviewed definition',exact:true}).click();await expect(fields).toContainText('Field definition saved. Existing records were not rewritten.');
 await page.goto(`/app/records?kind=contact&record=${contact}`);await page.getByRole('button',{name:'Edit details',exact:true}).click();await expect(page.getByLabel('Synthetic required field',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Synthetic required field: a value is required.');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await proof('refused-save',width,page.locator('.record-editor'),'.record-editor');}expect(errors).toEqual([]);
 async function proof(name,width,region,selector){expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const axe=await new AxeBuilder({page}).include(selector).analyze();expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);await region.screenshot({path:`${evidence}/${name}-${width}.png`});}
}
