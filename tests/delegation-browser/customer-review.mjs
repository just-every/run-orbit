import {expect} from '@playwright/test';

/** The imported book remains ordinary editable customer data, including exact customer prose. */
export async function reviewImportedData(page,collaborator,customer,viewerId) {
 const origin=new URL(page.url()).origin,path=`/api/v1/records/contact/${customer.bob}`;
 const read=async()=>(await(await page.request.get(path)).json()).record;
 const before=await read(),values=JSON.parse(before.custom_fields_json),provenance=JSON.parse(values.import_source);
 const granted=await page.request.post('/api/v2/access/workspaces/workspace/grants',{headers:{Origin:origin},data:{subjectKind:'operator',subjectId:viewerId,resourceType:'contact',resourceId:customer.bob,actions:['graph.read'],fields:['name','email','custom_fields_json'],purpose:'Review imported customer context',expiresAt:null}});expect(granted.status()).toBe(200);
 const update=await page.request.put(path,{headers:{Origin:origin},data:{...before,custom_fields:{...values,campaign_json:'Ordinary campaign text'}}});expect(update.status()).toBe(200);
 await page.goto(`/app/records?kind=contact&record=${customer.bob}`);
 await expect(page.getByText(`${provenance.account} (spreadsheet)`,{exact:true})).toBeVisible();
 await expect(page.getByText(values.import_source,{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Edit details',exact:true}).click();
 await page.getByLabel('Phone',{exact:true}).fill('+1 202 555 0103');await page.getByRole('button',{name:'Save changes',exact:true}).click();
 expect(JSON.parse((await read()).custom_fields_json).import_source).toBe(values.import_source);
 const literal='{"owner_note":"Keep this JSON-looking customer text literally"}';
 await page.getByRole('button',{name:'Edit details',exact:true}).click();await page.getByRole('button',{name:'Replace Import source with text',exact:true}).click();
 await page.getByLabel('Import source',{exact:true}).fill(literal);await page.getByLabel('Campaign json',{exact:true}).fill(literal);await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.getByText(literal,{exact:true})).toHaveCount(2);await page.reload();await expect(page.getByText(literal,{exact:true})).toHaveCount(2);
 await page.getByRole('button',{name:'Edit details',exact:true}).click();await expect(page.getByLabel('Import source',{exact:true})).toHaveValue(literal);await expect(page.getByLabel('Campaign json',{exact:true})).toHaveValue(literal);
 await collaborator.goto(`/app/shared-records?kind=contact&id=${customer.bob}`);await expect(collaborator.getByText(literal,{exact:true})).toHaveCount(2);
 // The new deal needs observed evidence before it has a recommendation to
 // explain. Recording a completed customer meeting evaluates it synchronously.
 const meeting=await page.request.post(`/api/v1/workbench/opportunities/${customer.deal}/events`,{
  headers:{Origin:origin},
  data:{type:'meeting.completed',subject:'Reviewed the imported customer history with Bob',contactId:customer.bob,occurredAt:new Date(Date.now()-60000).toISOString(),eventId:`import-review-${customer.deal}`}
 });
 expect(meeting.status(),await meeting.text()).toBe(201);
 const evidence=await meeting.json();
 await page.goto(`/app/assistance/${customer.deal}`);
 // Imported Bob remains do-not-contact. Inspect his data in an explanation;
 // an email draft must first be refused, not silently made contactable.
 expect((await read()).contactability).toBe('do_not_contact');
 const previewRequest=async()=>{
  const pending=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/api/v1/assistance/preview');
  await page.getByRole('button',{name:'Preview request',exact:true}).click();
  return pending;
 };
 const refused=await previewRequest();expect(refused.status(),await refused.text()).toBe(409);
 const refusal=await refused.json();await expect(page.getByRole('alert')).toContainText(refusal.error);
 await page.getByRole('combobox',{name:'Request',exact:true}).selectOption('explanation');
 const prepared=await previewRequest();expect(prepared.status(),await prepared.text()).toBe(200);
 const preview=await prepared.json();expect(preview.preview.contact.id).toBe(customer.bob);
 expect(preview.preview.evidence.map(item=>item.id)).toContain(evidence.id);
 expect(preview.preview.contact.contactability).toBe('do_not_contact');
 expect(JSON.parse(preview.preview.contact.custom_fields_json)).toMatchObject({import_source:literal,campaign_json:literal});
 await page.getByText('View complete request',{exact:true}).click();await expect(page.getByText(literal,{exact:true})).toHaveCount(2);
 expect(JSON.parse((await read()).custom_fields_json).import_source).toBe(literal);
}

/** Review changes to that book: dialog cancellation, lifecycle, duplicates and final removal. */
export async function reviewCustomerChanges(page,customer) {
 const origin=new URL(page.url()).origin,get=async(path)=>(await(await page.request.get('/api/v1/'+path)).json());
 await page.goto(`/app/records?record=${customer.deal}`);
 const close=page.getByRole('button',{name:'Close won',exact:true});await close.click();const dialog=page.getByRole('dialog',{name:'Close won',exact:true});
 await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await page.keyboard.press('Tab');await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement?.closest('dialog')!==null)).toBe(true);
 await dialog.getByRole('button',{name:'Cancel',exact:true}).focus();await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>document.activeElement?.closest('dialog')!==null)).toBe(true);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(close).toBeFocused();
 await close.click();await dialog.getByRole('button',{name:'Close won',exact:true}).click();await expect(dialog.getByLabel('Reason for closing this opportunity')).toBeFocused();
 await dialog.getByLabel('Reason for closing this opportunity').fill('   ');await dialog.getByRole('button',{name:'Close won',exact:true}).click();await expect(dialog).toBeVisible();
 await dialog.getByLabel('Reason for closing this opportunity').fill('The imported customer confirmed the purchase.');await dialog.getByRole('button',{name:'Close won',exact:true}).click();await expect(dialog).toHaveCount(0);
 await expect.poll(async()=>(await get(`records/opportunity/${customer.deal}`)).record.lifecycle).toBe('won');await page.getByRole('button',{name:'Reopen',exact:true}).click();
 const existing=(await get(`records/company/${customer.company}`)).record;
 const duplicate=await page.request.post('/api/v1/records/company',{headers:{Origin:origin},data:{name:existing.name,primary_domain:`duplicate-${Date.now()}.example`}});expect(duplicate.status()).toBe(201);const retired=await duplicate.json();
 const select=async()=>{await page.getByRole('button',{name:'Find matching names',exact:true}).click();for(const id of [customer.company,retired.id]){const {record}=await get(`records/company/${id}`);await page.getByRole('button',{name:`${record.name} · ${record.primary_domain}`,exact:true}).click();}};
 await page.goto('/app/records?kind=company');await page.getByText('Import, duplicate review and data export',{exact:true}).click();await select();
 await page.getByRole('button',{name:'Confirm merge',exact:true}).click();await expect(page.getByLabel('Primary domain',{exact:true})).toBeFocused();await page.getByLabel('Primary domain',{exact:true}).selectOption('survivor');if(await page.getByLabel('Custom fields',{exact:true}).count())await page.getByLabel('Custom fields',{exact:true}).selectOption('survivor');
 await page.getByRole('button',{name:'Confirm merge',exact:true}).click();const merge=page.getByRole('dialog',{name:'Merge records',exact:true});await merge.getByRole('button',{name:'Cancel',exact:true}).click();expect((await get(`records/company/${retired.id}`)).record.id).toBe(retired.id);
 await page.getByRole('button',{name:'Confirm merge',exact:true}).click();await merge.getByRole('button',{name:'Merge records',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Records merged.'})).toBeVisible();
 expect((await page.request.get(`/api/v1/records/company/${retired.id}`)).status()).toBe(404);expect((await get(`records/company/${customer.company}`)).record.primary_domain).toBe(existing.primary_domain);
 await page.goto(`/app/records?kind=contact&record=${customer.ana}`);
 await page.getByRole('button',{name:'Clear do-not-contact',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();expect((await get(`records/contact/${customer.ana}`)).record.contactability).toBe('do_not_contact');
 await page.getByRole('button',{name:'Delete record',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();expect((await get(`records/contact/${customer.ana}`)).record.id).toBe(customer.ana);
 await page.getByRole('button',{name:'Delete record',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete record',exact:true}).click();await expect(page.getByRole('heading',{name:'Records',exact:true})).toBeVisible();
 expect((await page.request.get(`/api/v1/records/contact/${customer.ana}`)).status()).toBe(404);expect(new URL(page.url()).searchParams.has('record')).toBe(false);
 await page.reload();await expect(page.getByRole('heading',{name:'Records',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Edit details',exact:true})).toHaveCount(0);
}
