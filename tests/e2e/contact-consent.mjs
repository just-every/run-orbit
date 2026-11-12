import {expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
const proofDir=process.env.CONTACT_CONSENT_SCREENSHOTS;
async function proof(page,name){
 if(!proofDir)return;
 mkdirSync(proofDir,{recursive:true});
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:join(proofDir,`${name}-${width}.png`),fullPage:true});}
 await page.setViewportSize({width:1440,height:900});
}
async function detail(page,id){const response=await page.request.get(`/api/v1/records/contact/${id}`);expect(response.ok()).toBe(true);return response.json();}
export async function capturedContactConsent(page,{expected='do_not_contact'}={}){
 const unique=Date.now(),email=`synthetic-orbit-capture-${unique}@example.test`,subject=`Synthetic capture consent ${unique}`;
 const mail=[`From: Synthetic newcomer <${email}>`,'To: seller@orbit.test',`Subject: ${subject}`,`Date: ${new Date(Date.now()-60000).toUTCString()}`,`Message-ID: <synthetic-orbit-${unique}@example.test>`,'','Please tell me about your service.'].join('\r\n');
 await page.setViewportSize({width:1440,height:900});await page.goto('/app/settings/capture/connect/files');
 await page.getByLabel('Mail (.eml or mbox) and calendar (.ics) files').setInputFiles({name:'synthetic-orbit.eml',mimeType:'message/rfc822',buffer:Buffer.from(mail)});
 await page.getByRole('checkbox',{name:/Also keep messages with no known contact/}).check();
 await page.getByRole('button',{name:'Add files',exact:true}).click();
 await expect(page.getByRole('region',{name:'Import result'}).getByRole('row',{name:/^Kept in the unlinked queue 1$/})).toBeVisible();
 await page.goto('/app');await page.getByRole('link',{name:/Review/}).first().click();
 const event=page.locator('article').filter({has:page.getByRole('heading',{name:subject,exact:true})});
 await expect(event).toBeVisible();await proof(page,'capture-create-review');
 await event.getByRole('button',{name:'Create a contact from this',exact:true}).click();
 await expect(event).toHaveCount(0);
 const response=await page.request.get(`/api/v1/records/contact?q=${encodeURIComponent(email)}`);expect(response.ok()).toBe(true);const records=(await response.json()).records;expect(records).toHaveLength(1);
 const id=records[0].id;await page.goto(`/app/contacts/${id}`);
 await expect(page.getByLabel('Email permission',{exact:true})).toHaveValue(expected);
 const saved=await detail(page,id);expect(saved.record.contactability).toBe(expected);
 if(expected==='do_not_contact')expect(saved.timeline.some(entry=>JSON.parse(entry.payload_json).contactability==='do_not_contact')).toBe(true);
 await proof(page,'capture-created');return {id,email,contactability:saved.record.contactability};
}
export async function erasedContactConsent(page,{expected='do_not_contact'}={}){
 const unique=Date.now(),email=`synthetic-orbit-erasure-${unique}@example.test`,oldName=`Synthetic erased person ${unique}`,newName=`Synthetic recreated person ${unique}`;
 const create=async(name)=>{await page.goto('/app/contacts/new');await page.getByLabel('Name',{exact:true}).fill(name);await page.getByLabel('Email',{exact:true}).fill(email);await page.getByRole('button',{name:'Create contact',exact:true}).click();await expect(page).toHaveURL(/\/app\/contacts\/[0-9A-HJKMNP-TV-Z]{26}$/);return new URL(page.url()).pathname.split('/').pop();};
 await page.setViewportSize({width:1440,height:900});const old=await create(oldName);
 await expect(page.getByLabel('Email permission',{exact:true})).toHaveValue('contactable');
 await page.getByRole('button',{name:'Delete contact',exact:true}).click();await page.getByRole('group',{name:'Confirm change'}).getByRole('button',{name:'Delete',exact:true}).click();
 await expect(page).toHaveURL(/\/app\/contacts$/);expect((await page.request.get(`/api/v1/records/contact/${old}`)).status()).toBe(404);
 const id=await create(newName);await expect(page.getByLabel('Email permission',{exact:true})).toHaveValue(expected);
 const before=await detail(page,id);expect(before.record.contactability).toBe(expected);
 if(expected==='do_not_contact'){
  expect(before.record.contactability_reason).toBe('erased_address');await expect(page.getByTestId('record-details')).not.toContainText(oldName);
  await proof(page,'erased-address-recreated');
  await page.getByLabel('Email permission',{exact:true}).selectOption('contactable');
  await page.getByRole('group',{name:'Confirm change'}).getByRole('button',{name:'Keep do not contact',exact:true}).click();expect((await detail(page,id)).record.contactability).toBe('do_not_contact');
  await page.getByLabel('Email permission',{exact:true}).selectOption('contactable');await page.getByRole('group',{name:'Confirm change'}).getByRole('button',{name:'Clear do-not-contact',exact:true}).click();
  await expect(page.getByLabel('Email permission',{exact:true})).toHaveValue('contactable');
  const cleared=await detail(page,id);expect(cleared.record.contactability).toBe('contactable');expect(cleared.timeline.some(entry=>entry.kind==='contactability.cleared')).toBe(true);
 }else await proof(page,'erased-address-recreated');
 return {id,email,contactability:before.record.contactability};
}
