import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {request} from './operator-fixture.mjs';

export async function expectProvenance(page,provenance){
 for(const value of [`${provenance.account} (${{csv:'spreadsheet',hubspot:'HubSpot export',pipedrive:'Pipedrive export'}[provenance.vendor]})`,provenance.sourceId,provenance.owner,provenance.stage,provenance.description,provenance.additional.region])await expect(page.getByText(value,{exact:true}).first()).toBeVisible();
 await expect(page.getByText(JSON.stringify(provenance),{exact:true})).toHaveCount(0);
}

export async function exerciseProvenanceEditing(page,origin,fixture){
 const path=`/app/contacts/${fixture.contactId}`,details=page.getByTestId('record-details');
 const saved=async()=>expect(details.getByRole('status').filter({hasText:'Saved'})).toBeVisible();
 await page.goto(origin+path);await details.waitFor();
 await expectProvenance(page,fixture.provenance);const phone=page.getByLabel('Phone',{exact:true});await phone.fill('+61 7 5550 1042');await phone.press('Enter');await saved();
 const detail=await request(page,`/api/v1/records/contact/${fixture.contactId}`,undefined,'GET');
 assert.equal(detail.record.phone,'+61 7 5550 1042');assert.equal(JSON.parse(detail.record.custom_fields_json).import_source,JSON.stringify(fixture.provenance));
 // Owner-authored JSON-looking text remains exact text; only the typed provenance format is decoded.
 const literal='{"owner_note":"Keep this JSON-looking customer text literally"}';
 await page.getByRole('button',{name:'Replace Import source with text',exact:true}).click();
 const source=page.getByLabel('Import source',{exact:true});await source.waitFor();await source.fill(literal);await source.press('Enter');await saved();
 const campaign=page.getByLabel('Campaign json',{exact:true});await campaign.fill(literal);await campaign.press('Enter');
 await expect.poll(async()=>JSON.parse((await request(page,`/api/v1/records/contact/${fixture.contactId}`,undefined,'GET')).record.custom_fields_json).campaign_json).toBe(literal);
 const stored=JSON.parse((await request(page,`/api/v1/records/contact/${fixture.contactId}`,undefined,'GET')).record.custom_fields_json);assert.equal(stored.import_source,literal,'Record edit stores the literal import-source text');assert.equal(stored.campaign_json,literal,'Record edit stores the literal campaign text');
 await expect(source).toHaveValue(literal);await expect(campaign).toHaveValue(literal);
 await page.reload();await expect(page.getByLabel('Import source',{exact:true})).toHaveValue(literal);await expect(page.getByLabel('Campaign json',{exact:true})).toHaveValue(literal);
 await fixture.collaborator.goto(origin+`/app/shared-records?kind=contact&id=${fixture.contactId}`);await expect(fixture.collaborator.getByText(literal,{exact:true})).toHaveCount(2);
 await page.goto(origin+`/app/assistance/${fixture.opportunityId}`);await page.getByRole('button',{name:'Preview request',exact:true}).click();await page.getByText('View complete request',{exact:true}).click();await expect(page.getByText(literal,{exact:true})).toHaveCount(2);
 assert.equal(JSON.parse((await request(page,`/api/v1/records/contact/${fixture.contactId}`,undefined,'GET')).record.custom_fields_json).import_source,literal);
}
