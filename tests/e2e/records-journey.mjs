import {expect} from '@playwright/test';
import { authenticateOperator } from './operator-session.mjs';

async function settledContactDetails(page){
 const relationships=page.getByRole('region',{name:'Company relationships',exact:true});
 await expect(relationships.getByRole('button',{name:'Save relationships & context',exact:true})).toBeVisible();
 await expect(relationships.getByRole('list',{name:'Available companies',exact:true})).toBeVisible();
 await page.waitForLoadState('networkidle');
}

export const recordsJourney1 = async({page,context})=>{
 await authenticateOperator(context);await page.waitForLoadState('networkidle');const errors=[];page.on('pageerror',e=>errors.push(e.message));const unique=Date.now();
 await page.goto('/app/records',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Companies',exact:true}).click();await page.getByRole('button',{name:'Create company',exact:true}).click();await page.getByLabel('Company name',{exact:true}).fill(`Browser account ${unique}`);await page.getByLabel('Primary domain',{exact:true}).fill(`browser-${unique}.example`);await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByRole('heading',{name:`Browser account ${unique}`,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Contacts',exact:true}).click();await page.getByRole('button',{name:'Create contact',exact:true}).click();await page.getByLabel('Full name',{exact:true}).fill(`Browser contact ${unique}`);await page.getByLabel('Email',{exact:true}).fill(`browser-${unique}@example.test`);await page.getByRole('combobox',{name:'Linked company',exact:true}).selectOption({label:`Browser account ${unique}`});await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByRole('heading',{name:`Browser contact ${unique}`,exact:true})).toBeVisible();
 await settledContactDetails(page);await page.getByRole('button',{name:'Edit details',exact:true}).click();await page.getByLabel('Phone',{exact:true}).fill('+61 400 123 456');await page.getByLabel('New custom field name',{exact:true}).fill('Owner segment');await page.getByRole('button',{name:'Add custom field',exact:true}).click();await page.getByLabel('Owner segment',{exact:true}).fill('Independent studio');
 const segment=page.locator('.record-custom-fields__row').filter({has:page.getByLabel('Owner segment',{exact:true})});
 await segment.getByRole('combobox',{name:'Value type',exact:true}).selectOption('number');
 await expect(segment.getByRole('alert')).toBeVisible();await expect(page.getByLabel('Owner segment',{exact:true})).toHaveValue('Independent studio');
 await segment.getByRole('button',{name:'Keep current value',exact:true}).click();
 await page.getByLabel('New custom field name',{exact:true}).fill('Seats');await page.getByRole('button',{name:'Add custom field',exact:true}).click();await page.getByLabel('Seats',{exact:true}).fill('25');
 const seats=page.locator('.record-custom-fields__row').filter({has:page.getByLabel('Seats',{exact:true})});await seats.getByRole('combobox',{name:'Value type',exact:true}).selectOption('number');await expect(page.getByLabel('Seats',{exact:true})).toHaveValue('25');
 await page.getByRole('combobox',{name:'Contactability',exact:true}).selectOption('do_not_contact');await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByText('+61 400 123 456',{exact:true})).toBeVisible();await expect(page.getByText('Independent studio',{exact:true})).toBeVisible();
 const noteStarted=await page.evaluate(()=>Date.now());await page.getByLabel('Text',{exact:true}).fill('Browser manual note');
 const noteSaved=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname.endsWith('/entries'));
 await page.getByRole('button',{name:'Save entry',exact:true}).click();const noteResponse=await noteSaved;expect(noteResponse.ok()).toBe(true);
 const contactPath=new URL(noteResponse.url()).pathname.replace(/\/entries$/,''),readNote=async()=>{const response=await page.request.get(contactPath);expect(response.ok()).toBe(true);return(await response.json()).timeline.find(entry=>JSON.parse(entry.payload_json).text==='Browser manual note');};
 const savedNote=await readNote();expect(Math.abs(Date.parse(savedNote.occurred_at)-noteStarted)).toBeLessThan(60000);
 await settledContactDetails(page);await page.goto(`/app/records?kind=contact&record=${contactPath.split('/').pop()}`,{waitUntil:'networkidle'});const note=page.locator('article[id^="entry-"]').filter({hasText:'Browser manual note'});await expect(note).toBeVisible();await expect(note).toHaveCount(1);
 await note.getByRole('button',{name:'Edit entry',exact:true}).click();const edited=page.waitForResponse(response=>response.request().method()==='PUT'&&new URL(response.url()).pathname.includes('/entries/'));
 await page.getByRole('button',{name:'Save entry',exact:true}).click();expect((await edited).ok()).toBe(true);expect((await readNote()).occurred_at).toBe(savedNote.occurred_at);
 await settledContactDetails(page);await page.getByRole('button',{name:'Edit details',exact:true}).click();await expect(page.getByRole('combobox',{name:'Contactability',exact:true})).toHaveValue('do_not_contact');await expect(page.getByLabel('Seats',{exact:true})).toHaveValue('25');await expect(page.getByLabel('Seats',{exact:true})).toHaveAttribute('type','number');if(process.env.RECORDS_SCREENSHOT)await page.screenshot({path:process.env.RECORDS_SCREENSHOT,fullPage:true});
 await page.waitForLoadState('networkidle');await page.goto('/app/settings',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{name:'Workspace settings',exact:true})).toBeVisible();const settings=await(await page.request.get('/api/v1/settings')).json();if(!settings.owner?.editable){await expect(page.getByRole('region',{name:'Calling',exact:true})).toHaveCount(0);await expect(page.getByRole('region',{name:'Sign-in policy',exact:true})).toHaveCount(0);}await page.getByLabel('Name',{exact:true}).fill(`Invited ${unique}`);await page.getByLabel('Email',{exact:true}).fill(`operator-${unique}@example.test`);await page.getByRole('button',{name:'Invite operator',exact:true}).click();const operator=page.locator('article').filter({has:page.getByRole('heading',{name:`Invited ${unique}`,exact:true})});await expect(operator).toContainText('active');await operator.getByRole('button',{name:'Remove operator',exact:true}).click();const review=page.getByRole('region',{name:'Operator removal review',exact:true});await expect(review).toBeVisible();await expect(review.getByRole('button',{name:'Confirm handover and remove',exact:true})).toBeEnabled();await review.getByRole('button',{name:'Confirm handover and remove',exact:true}).click();await page.getByText(/^Removed operators \(\d+\)$/).click();await expect(operator).toContainText('removed');await operator.getByRole('button',{name:'Erase personal details',exact:true}).click();await page.getByRole('dialog',{name:'Erase personal details',exact:true}).getByRole('button',{name:'Erase personal details',exact:true}).click();await expect(page.getByRole('heading',{name:`Invited ${unique}`,exact:true})).toHaveCount(0);await expect(page.getByText(`operator-${unique}@example.test`,{exact:false})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Erased operator',exact:true}).first()).toBeVisible();await page.waitForLoadState('networkidle');expect(errors).toEqual([]);
};

export const recordsJourney3 = async({page,context})=>{
 await authenticateOperator(context);await page.goto('/app/records',{waitUntil:'networkidle'});const unique=Date.now(),origin=new URL(page.url()).origin;
 async function create(kind,body){
  const response=await page.request.post(`/api/v1/records/${kind}`,{headers:{Origin:origin},data:body});expect(response.status()).toBe(201);
  const {id}=await response.json(),read=await page.request.get(`/api/v1/records/${kind}/${id}`);expect(read.ok()).toBe(true);return(await read.json()).record;
 }
 const noDomain=await create('company',{name:`No domain ${unique}`}),withDomain=await create('company',{name:`With domain ${unique}`,primary_domain:`summary-${unique}.example`});
 const blocked=await create('contact',{name:`Do not contact ${unique}`,email:`summary-${unique}@example.test`,contactability:'do_not_contact'}),contactable=await create('contact',{name:`Contact ${unique}`,email:`summary-contactable-${unique}@example.test`,contactability:'contactable'});
 const settingsResponse=await page.request.get('/api/v1/settings');expect(settingsResponse.ok()).toBe(true);const settings=await settingsResponse.json(),stage=settings.stages[0];
 const opportunity=await create('opportunity',{title:`Summary opportunity ${unique}`,company_id:withDomain.id,contact_ids:[contactable.id],primary_contact_id:contactable.id,stage_id:stage.id,value_cents:123400});
 expect(noDomain.primary_domain).toBeNull();expect(withDomain.primary_domain).toBe(`summary-${unique}.example`);expect(blocked.contactability).toBe('do_not_contact');expect(contactable.contactability).toBe('contactable');
 expect(opportunity.company_id).toBe(withDomain.id);expect(opportunity.stage_id).toBe(stage.id);expect(opportunity.value_cents).toBe(123400);
 await page.getByRole('button',{name:'Companies',exact:true}).click();
 const card=name=>page.locator('.operator-queue-card').filter({has:page.getByRole('heading',{name,exact:true})});
 await expect(card(noDomain.name)).toBeVisible();await expect(card(noDomain.name).locator('p')).toBeEmpty();await expect(card(withDomain.name).locator('p')).toHaveText(withDomain.primary_domain);if(process.env.RECORD_SUMMARY_SCREENSHOT)await page.screenshot({path:process.env.RECORD_SUMMARY_SCREENSHOT,fullPage:true});
 await expect(page.locator('.operator-queue__list')).not.toContainText(/undefined|null/);
 await page.getByRole('button',{name:'Contacts',exact:true}).click();
 const blockedMeta=card(blocked.name).locator('p');await expect(blockedMeta).toContainText(blocked.email);await expect(card(contactable.name).locator('p')).toHaveText(contactable.email);
 const blockedParts=(await blockedMeta.innerText()).split(' · ');expect(blockedParts[0]).toBe(blocked.email);expect(blockedParts).toHaveLength(2);expect(blockedParts[1].toLowerCase().replaceAll(' ','_')).toBe(blocked.contactability);
 await expect(page.locator('.operator-queue__list')).not.toContainText(/undefined|null|do_not_contact/);
 await page.getByRole('button',{name:'Opportunities',exact:true}).click();const opportunityMeta=card(opportunity.title).locator('p');
 await expect(opportunityMeta).toContainText(withDomain.name);await expect(opportunityMeta).toContainText(stage.name);await expect(opportunityMeta).toContainText(new Intl.NumberFormat('en-AU',{maximumFractionDigits:0}).format(opportunity.value_cents/100));
 for(const state of [opportunity.lifecycle,opportunity.band,opportunity.queue_state])await expect(opportunityMeta).not.toContainText(new RegExp(`\\b${state}\\b`));
 await expect(page.locator('.operator-queue__list')).not.toContainText(/undefined|null/);
 await page.waitForLoadState('networkidle');
};

