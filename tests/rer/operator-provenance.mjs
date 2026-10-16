import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {request} from './operator-fixture.mjs';

export async function expectProvenance(page,provenance){
 for(const value of [provenance.vendor,provenance.account,provenance.sourceId,provenance.owner,provenance.stage,provenance.description,provenance.additional.region])await expect(page.getByText(value,{exact:true}).first()).toBeVisible();
 await expect(page.getByText(JSON.stringify(provenance),{exact:true})).toHaveCount(0);
}

export async function exerciseProvenanceEditing(page,origin,fixture){
 const path=`/app/records?kind=contact&record=${fixture.contactId}`;
 await page.goto(origin+path);await page.getByRole('button',{name:'Edit details',exact:true}).click();
 await expectProvenance(page,fixture.provenance);await page.getByLabel('Phone',{exact:true}).fill('+61 7 5550 1042');await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await page.getByRole('heading',{name:'Record details',exact:true}).waitFor();
 const detail=await request(page,`/api/v1/records/contact/${fixture.contactId}`,undefined,'GET');
 assert.equal(detail.record.phone,'+61 7 5550 1042');assert.equal(JSON.parse(detail.record.custom_fields_json).import_source,JSON.stringify(fixture.provenance));
 // Owner-authored JSON-looking text remains exact text; only the typed provenance format is decoded.
 const literal='{"owner_note":"Keep this JSON-looking customer text literally"}';
 await page.getByRole('button',{name:'Edit details',exact:true}).click();await page.getByRole('button',{name:'Replace Import source with text',exact:true}).click();await page.getByLabel('Import source',{exact:true}).fill(literal);await page.getByLabel('Campaign json',{exact:true}).fill(literal);await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await page.getByRole('heading',{name:'Record details',exact:true}).waitFor();await expect(page.getByText(literal,{exact:true})).toHaveCount(2);
 await page.reload();await expect(page.getByText(literal,{exact:true})).toHaveCount(2);
 await page.getByRole('button',{name:'Edit details',exact:true}).click();await expect(page.getByLabel('Import source',{exact:true})).toHaveValue(literal);await expect(page.getByLabel('Campaign json',{exact:true})).toHaveValue(literal);
 await fixture.collaborator.goto(origin+`/app/shared-records?kind=contact&id=${fixture.contactId}`);await expect(fixture.collaborator.getByText(literal,{exact:true})).toHaveCount(2);
 await page.goto(origin+`/app/assistance/${fixture.opportunityId}`);await page.getByRole('button',{name:'Preview request',exact:true}).click();await page.getByText('View complete request',{exact:true}).click();await expect(page.getByText(literal,{exact:true})).toHaveCount(2);
 assert.equal(JSON.parse((await request(page,`/api/v1/records/contact/${fixture.contactId}`,undefined,'GET')).record.custom_fields_json).import_source,literal);
}
