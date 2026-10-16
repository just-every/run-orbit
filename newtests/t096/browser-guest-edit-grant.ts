import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
import {accessible} from './browser-observations';
/** A Guest has no profile access: only the owner's field grants reach them, and "See and edit" must let them see, find and change exactly those fields. */
export async function guestEditGrantJourney(page:Page,owner:Page,operatorId:string,contactId:string,width:number,directory:string){
 const label=`Collaborator edited contact ${width} · shared@browser.test`,name=`Collaborator edited contact ${width}`,record=`/api/v2/workspaces/workspace/records/contact/${contactId}`;
 await Promise.all([owner.waitForResponse(response=>new URL(response.url()).pathname.endsWith(`/members/${operatorId}`)&&response.request().method()==='PUT'&&response.status()===200),owner.getByRole('combobox',{name:'Profile for invited@browser.test',exact:true}).selectOption('guest')]);
 await page.goto('/app/shared-records');await expect(page.getByText('No records match your current access.',{exact:true})).toBeVisible();
 // Each owner change moves the authority epoch; let the grant list finish reading record names before the next one.
 const settled=()=>expect(owner.locator('.fold-row h3',{hasText:'…'})).toHaveCount(0);
 const share=async(fields:string[],action:string,why:string)=>{await owner.getByRole('combobox',{name:'Collaborator',exact:true}).selectOption(operatorId);await owner.getByRole('combobox',{name:'Record type',exact:true}).selectOption('contact');await owner.getByLabel('Find by name',{exact:true}).fill(name);await owner.getByRole('combobox',{name:'Record',exact:true}).selectOption({label});for(const field of fields)await owner.getByRole('checkbox',{name:field,exact:true}).check();await owner.getByRole('combobox',{name:'They may',exact:true}).selectOption({label:action});await owner.getByLabel('Why (kept with the grant)',{exact:true}).fill(why);await owner.getByRole('button',{name:'Share these fields',exact:true}).click();await expect(owner.getByRole('status').filter({hasText:`Shared ${label}`})).toBeVisible();await settled();};
 await share(['Name','Phone'],'See and edit these fields',`Guest phone update ${width}`);await expect(owner.getByText('invited@browser.test may see and edit: Name, Phone',{exact:true})).toBeVisible();
 await share(['Email'],'See these fields',`Guest email check ${width}`);
 // The edit grant alone makes the record listed and searchable.
 await page.reload();await expect(page.getByRole('button',{name,exact:true})).toBeVisible();await page.getByLabel('Search permitted fields',{exact:true}).fill('Collaborator edited');await expect(page.getByRole('button',{name,exact:true})).toBeVisible();await page.getByRole('button',{name,exact:true}).click();
 const detail=page.getByRole('region',{name:'Shared record details',exact:true});await expect(detail.getByText('You may change: Name, Phone. The other fields here are read-only.',{exact:true})).toBeVisible();
 await expect(detail.getByLabel('Name',{exact:true})).toHaveValue(name);await expect(detail.getByLabel('Phone',{exact:true})).toBeVisible();await expect(detail.locator('.fold-row[data-field="email"]')).toContainText('Email: shared@browser.test');assert.equal(await detail.getByLabel('Email',{exact:true}).count(),0);assert.equal(await page.getByText('Private browser marker',{exact:false}).count(),0);assert.equal(await detail.locator('.fold-row[data-field="custom_fields_json"]').count(),0);
 await detail.getByLabel('Phone',{exact:true}).fill(`+61 7 3000 0${width}`);await detail.getByRole('button',{name:'Save phone',exact:true}).click();await expect(page.getByRole('status')).toContainText('Field saved');await expect(detail.getByLabel('Phone',{exact:true})).toHaveValue(`+61 7 3000 0${width}`);await accessible(page,`guest-edit-grant-${width}`,directory);
 // The API holds the same line: the granted fields change, the see-only and never-granted ones do not.
 const current=await (await page.request.get(record)).json();assert.deepEqual(current.editableFields.sort(),['name','phone']);assert.deepEqual(Object.keys(current.fields).sort(),['email','name','phone']);
 for(const data of [{email:'guest-changed@browser.test'},{job_title:'Guest title'},{custom_fields:{private_note:'Guest note'}}])assert.equal((await page.request.put(record,{headers:{Origin:new URL(page.url()).origin},data})).status(),403);
 // The owner reads the change and who made it.
 await owner.goto(`/app/records?kind=contact`);await owner.getByRole('button',{name:new RegExp(`^${name}`)}).first().click();await expect(owner.getByText(`+61 7 3000 0${width}`,{exact:true}).first()).toBeVisible();await expect(owner.getByText('Changed Phone',{exact:true}).first()).toBeVisible();await expect(owner.getByText(/invited@browser\.test/).first()).toBeVisible();
 await owner.goto('/app/access');const revoke=owner.getByRole('button',{name:'Revoke grant',exact:true});await expect(revoke).toHaveCount(2);await settled();for(let open=2;open>0;open--){await revoke.first().click();await expect(revoke).toHaveCount(open-1);await settled();}
 await page.reload();await expect(page.getByText('No records match your current access.',{exact:true})).toBeVisible();
}
