import {expect} from '@playwright/test';

/** One hand-made deal retains its contact while company and owner stay empty across the public views. */
export async function exerciseUnassignedOpportunity(page,contact,label){
 const title=label+' independent';
 await page.goto('/app/opportunities/new');
 await page.getByRole('searchbox',{name:'Find contacts',exact:true}).fill(contact.email);
 await page.getByRole('list',{name:'Contact search results',exact:true}).getByRole('button').filter({hasText:contact.email}).click();
 await page.getByLabel('Opportunity title',{exact:true}).fill(title);
 await page.getByLabel('Estimated value in workspace currency',{exact:true}).fill('7500');
 await expect(page.getByLabel('Owner',{exact:true})).toHaveValue('');
 await page.getByRole('button',{name:'Save opportunity',exact:true}).click();
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 const path=new URL(page.url()).pathname,id=path.split('/').pop();
 const read=async()=>{
  const response=await page.request.get(`/api/v1/records/opportunity/${id}`);expect(response.ok()).toBe(true);
  const detail=await response.json();
  expect(detail.record.owner_id).toBeNull();expect(detail.record.company_id).toBeNull();
  expect(detail.record.value_cents).toBe(750000);expect(detail.contacts.map(item=>item.id)).toEqual([contact.id]);
 };
 await read();
 await page.goto('/app/opportunities');
 const row=page.locator('.records-list').getByRole('link').filter({hasText:title});
 await expect(row).toBeVisible();await expect(row).toContainText('No company');await expect(row).toContainText('Unassigned');
 await page.getByRole('link',{name:'Board',exact:true}).click();
 const card=page.locator('.pipeline-deal').filter({hasText:title});
 await expect(card).toBeVisible();await expect(card).toContainText('No company');await expect(card).toContainText('Unassigned');
 await card.click();await page.reload();
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await expect(page.getByTestId('record-details').getByLabel('Owner',{exact:true})).toHaveValue('');
 await expect(page.getByTestId('record-details').getByLabel('Company',{exact:true})).toHaveValue('');
 await read();
}
