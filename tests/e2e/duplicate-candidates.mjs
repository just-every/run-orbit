import {expect} from '@playwright/test';
import {join} from 'node:path';

/** Use the native Settings review to merge only an explicitly selected keyless pair. */
export async function exerciseKeylessCandidates(page,screenshots){
 const origin=new URL(page.url()).origin;
 const create=async(kind,body)=>{
  const response=await page.request.post(`/api/v1/records/${kind}`,{headers:{Origin:origin},data:body});
  expect(response.status()).toBe(201);return (await response.json()).id;
 };
 const companies=[];
 for(const name of ['Harbour Works','Cedar Labs'])companies.push(await create('company',{name}));
 for(const kind of ['contact','company']){
  const ids=[];
  for(const [index,name] of ['Northstar Advisory','  NORTHSTAR   ADVISORY  ','Northstar Advisory'].entries()){
   ids.push(await create(kind,{name,...kind==='contact'?{company_id:companies[index]??null}:{}}));
  }
  const read=async(id)=>{const response=await page.request.get(`/api/v1/records/${kind}/${id}`);expect(response.status()).toBe(200);return response.json();};
  const before=await Promise.all(ids.map(read));
  for(const detail of before)expect(detail.record[kind==='contact'?'email':'primary_domain']).toBeNull();
  await page.goto('/app/settings/data');
  const review=page.getByRole('region',{name:kind==='contact'?'Duplicate contacts':'Duplicate companies',exact:true});
  await review.getByRole('button',{name:kind==='contact'?'Find matching contacts':'Find matching companies',exact:true}).click();
  const group=review.locator('.duplicate-group').filter({hasText:'Northstar Advisory'});
  await expect(group.getByRole('button')).toHaveCount(3);
  if(kind==='contact')for(const company of ['Harbour Works','Cedar Labs','No company'])await expect(group).toContainText(company);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});
   await expect(group).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:join(screenshots,`keyless-${kind}-candidates-${width}.png`),fullPage:true});
  }
  // API IDs bind the displayed choice to the exact rows, independent of their sort order.
  const response=await page.request.get(`/api/v1/records/${kind}/duplicates`);expect(response.ok()).toBe(true);
  const rows=(await response.json()).groups.find(rows=>rows.some(row=>row.id===ids[0]));
  expect(rows.map(row=>row.id).sort()).toEqual([...ids].sort());
  const buttons=group.getByRole('button');
  await buttons.nth(rows.findIndex(row=>row.id===ids[0])).click();
  await buttons.nth(rows.findIndex(row=>row.id===ids[1])).click();
  const choices=review.getByRole('combobox');
  for(let index=0;index<await choices.count();index++)await choices.nth(index).selectOption('survivor');
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});await expect(review.getByRole('button',{name:'Confirm merge',exact:true})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:join(screenshots,`keyless-${kind}-review-${width}.png`),fullPage:true});
  }
  expect(await Promise.all(ids.map(read))).toEqual(before);
  await review.getByRole('button',{name:'Confirm merge',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Merge records',exact:true});
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(await Promise.all(ids.map(read))).toEqual(before);
  await review.getByRole('button',{name:'Confirm merge',exact:true}).click();
  await dialog.getByRole('button',{name:'Merge records',exact:true}).click();
  await expect(review.getByRole('status')).toContainText('Records merged.');
  expect((await page.request.get(`/api/v1/records/${kind}/${ids[1]}`)).status()).toBe(404);
  expect(await read(ids[2])).toEqual(before[2]);
  const survivor=await read(ids[0]);expect(survivor.record.name).toBe(before[0].record.name);
  expect(survivor.timeline.filter(entry=>entry.kind==='record.merged')).toHaveLength(1);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});await page.goto('/app/settings/data');
   await review.getByRole('button',{name:kind==='contact'?'Find matching contacts':'Find matching companies',exact:true}).click();
   await expect(group.getByRole('button')).toHaveCount(2);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:join(screenshots,`keyless-${kind}-remaining-${width}.png`),fullPage:true});
  }
 }
}
