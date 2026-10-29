import {expect} from '@playwright/test';
import {expectProvenance} from './operator-provenance.mjs';
import {exerciseSourceRemoval} from './source-recipes.mjs';

async function expectRouteRecovery(page){
 const origin=new URL(page.url()).origin;
 for(const [path,destination] of [
  ['/app/opportunities','/app/records'],['/app/companies','/app/records?kind=company'],['/app/contacts','/app/records?kind=contact'],
  ...['now','today','meetings','drafts','assistance'].map(name=>[`/app/${name}`,'/app']),
 ]){
  const response=await page.request.get(origin+path);
  expect(response.status()).toBe(200);
  const url=new URL(response.url());expect(url.pathname+url.search).toBe(destination);
  await response.dispose();
 }
 for(const kind of ['opportunities','meetings','drafts','assistance']){
  for(const id of ['invalid.id','00000000000000000000000000']){
   const read=kind==='meetings'?`/api/v1/today/meetings/${id}`:kind==='drafts'?`/api/v1/drafts/${id}`:`/api/v1/opportunities/${id}`;
   const response=await page.request.get(origin+read);expect(response.status()).toBe(404);await response.dispose();
   if(kind==='opportunities'){
    const drafts=await page.request.get(origin+`/api/v1/drafts?opportunityId=${id}`);expect(drafts.status()).toBe(404);await drafts.dispose();
   }
   await page.goto(origin+`/app/${kind}/${id}`);
   await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
   await expect(page.getByRole('main').locator('form')).toHaveCount(0);
   const back=page.getByRole('main').locator('a[href="/app/records"]');await expect(back).toBeVisible();await back.click();
   await expect(page).toHaveURL(origin+'/app/records');
   const create=page.getByRole('link',{name:'Create opportunity',exact:true});
   await expect(create).toBeVisible();await expect(create).toHaveAttribute('href','/app/new');
  }
 }
 // OR1/OR2: every moved address answers one 308 straight to its new page, the query string kept as it came.
 for(const [path,destination] of [
  ['/app/now?x=1','/app?x=1'],['/app/settings?a=1&b=two','/app/settings/workspace?a=1&b=two'],['/app/sources','/app/settings/capture'],
  ['/app/capture?connected=abc&result=%7B%22a%22%3A1%7D','/app/settings/capture?connected=abc&result=%7B%22a%22%3A1%7D'],
  ['/app/capture/connect/google?step=5','/app/settings/capture/connect/google?step=5'],['/app/capture/review','/app/review'],
  ['/app/forms','/app/settings/forms'],['/app/imports','/app/settings/data/import'],['/app/library','/app/settings/mail/library'],['/app/access','/app/settings/team'],
 ]){
  const moved=await page.request.get(origin+path,{maxRedirects:0});
  expect(moved.status(),path).toBe(308);expect(moved.headers().location,path).toBe(destination);await moved.dispose();
  const landed=await page.request.get(origin+destination,{maxRedirects:0});expect(landed.status(),destination).toBe(200);await landed.dispose();
 }
 await page.goto(origin+'/app');await page.getByTestId('now-queue').waitFor();
}

async function expectHashTarget(page,id){
 const target=page.locator(`#${id}`);
 await expect(target).toBeFocused();
 await expect(target.getByRole('heading').first()).toBeInViewport();
}

export function operatorRoutes(f){return [
 {name:'now',path:'/app',ready:async page=>{await page.getByTestId('now-queue').waitFor();await expectRouteRecovery(page);}},
 {name:'brief',path:'/app/brief',ready:page=>page.getByTestId('today-brief').waitFor()},
 {name:'tasks',path:'/app/tasks',ready:page=>page.getByTestId('sales-tasks').waitFor()},
 {name:'review',path:'/app/review',ready:page=>page.getByRole('heading',{name:'Review',exact:true,level:1}).waitFor()},
 {name:'imports',path:'/app/settings/data/import',ready:page=>page.getByRole('heading',{name:'Move in',exact:true,level:1}).waitFor()},
 {name:'records',path:'/app/records',ready:page=>page.locator('.operator-queue-card').first().waitFor()},
 {name:'contacts',path:'/app/records?kind=contact',ready:page=>page.getByRole('button',{name:'Create contact',exact:true}).waitFor()},
 {name:'companies',path:'/app/records?kind=company',ready:page=>page.getByRole('button',{name:'Create company',exact:true}).waitFor()},
 {name:'new',path:'/app/new',ready:page=>expect(page.getByRole('button',{name:'Save opportunity'})).toBeEnabled()},
 {name:'contact',path:`/app/records?kind=contact&record=${f.contactId}`,ready:async page=>{await page.getByRole('heading',{name:'Record details'}).waitFor();await expectProvenance(page,f.provenance);}},
 {name:'company',path:`/app/records?kind=company&record=${f.companyId}`,ready:page=>page.getByRole('heading',{name:'Record details'}).waitFor()},
 {name:'contact-create',path:'/app/records?kind=contact',ready:async page=>{await page.getByRole('button',{name:'Create contact',exact:true}).click();await page.getByLabel('Full name',{exact:true}).waitFor();}},
 {name:'company-create',path:'/app/records?kind=company',ready:async page=>{await page.getByRole('button',{name:'Create company',exact:true}).click();await page.getByLabel('Company name',{exact:true}).waitFor();}},
 {name:'opportunity-create-existing',path:'/app/records',ready:async page=>{await page.getByRole('link',{name:'Create opportunity',exact:true}).click();await page.getByLabel('Opportunity title',{exact:true}).waitFor();await page.getByLabel('Company name',{exact:true}).fill('Operator');await page.getByRole('list',{name:'Company search results'}).getByRole('button').first().waitFor();}},
 {name:'record-edit',path:`/app/records?kind=contact&record=${f.contactId}`,ready:async page=>{await page.getByRole('button',{name:'Edit details',exact:true}).click();await page.getByLabel('Full name',{exact:true}).waitFor();await expectProvenance(page,f.provenance);}},
 {name:'settings-data',path:'/app/settings/data',ready:async page=>{await page.getByRole('heading',{name:'Duplicates',exact:true}).waitFor();await page.getByRole('heading',{name:'Export and restore',exact:true}).waitFor();}},
 {name:'opportunity',path:`/app/opportunities/${f.opportunityId}`,ready:page=>page.getByTestId('next-action').waitFor()},
 {name:'opportunity-audit',path:`/app/opportunities/${f.opportunityId}`,ready:async page=>{await page.getByTestId('next-action').waitFor();await page.getByText('Audit details',{exact:true}).click();await page.getByText('Log activity',{exact:true}).click();await page.getByRole('button',{name:'Write follow-up',exact:true}).click();await page.getByText('Complete or skip this action',{exact:true}).click();for(const details of await page.getByTestId('opportunity-timeline').getByText('Recorded details',{exact:true}).all())await details.click();}},
 {name:'timeline-edit',path:`/app/opportunities/${f.opportunityId}`,ready:async page=>{await page.getByTestId('opportunity-timeline').getByRole('button',{name:'Edit entry',exact:true}).click();await expect(page.getByRole('heading',{name:'Edit entry',exact:true}).locator('..').getByLabel('Text',{exact:true})).toBeFocused();}},
 {name:'draft',path:`/app/drafts/${f.draftId}`,ready:page=>page.getByTestId('draft-subject').waitFor()},
 {name:'draft-audit',path:`/app/drafts/${f.draftId}`,ready:async page=>{await page.getByTestId('draft-subject').waitFor();await page.getByText('Audit details',{exact:true}).click();}},
 {name:'assistance',path:`/app/assistance/${f.opportunityId}`,ready:page=>expect(page.getByRole('button',{name:'Preview request',exact:true})).toBeEnabled()},
 {name:'assistance-preview',path:`/app/assistance/${f.opportunityId}`,ready:async page=>{await page.getByRole('button',{name:'Preview request',exact:true}).click();await page.getByText('View complete request',{exact:true}).click();await expectProvenance(page,f.provenance);}},
 {name:'sources',path:'/app/settings/capture',ready:page=>page.getByRole('heading',{name:'Operator review source'}).waitFor()},
 ...['website','calcom','calendly','automation'].map(recipe=>({name:`sources-${recipe}`,path:'/app/settings/capture',ready:async page=>{
  await page.getByRole('button',{name:'Open recipes',exact:true}).click();await page.getByLabel('Recipe',{exact:true}).selectOption(['calcom','calendly'].includes(recipe)?'booking':recipe);
  if(recipe==='website'){await page.getByText('Create or publish a form',{exact:true}).click();await page.getByText('Run a form submission in Node',{exact:true}).click();}
  else if(recipe==='automation')await page.getByLabel('Automation platform',{exact:true}).selectOption('make');
  else await page.getByLabel('Booking provider',{exact:true}).selectOption(recipe);
 }})),
 {name:'sources-disabled',path:'/app/settings/capture',ready:async page=>{await page.getByText('Advanced',{exact:true}).click();await page.getByRole('button',{name:'Disable source',exact:true}).click();await page.getByRole('button',{name:'Enable source',exact:true}).waitFor();await page.getByRole('button',{name:'Open recipes',exact:true}).click();await expect(page.getByRole('button',{name:'Send test event',exact:true})).toBeDisabled();},after:async page=>{await page.getByRole('button',{name:'Enable source',exact:true}).click();await page.getByRole('button',{name:'Disable source',exact:true}).waitFor();await exerciseSourceRemoval(page,f);}},
 {name:'settings',path:'/app/settings/workspace',ready:page=>page.getByRole('button',{name:'Save workspace',exact:true}).waitFor()},
 {name:'settings-mail',path:'/app/settings#mail-sender',ready:async page=>{await expect(page).toHaveURL(/\/app\/settings\/mail$/);await page.getByRole('heading',{name:'Sender',exact:true}).waitFor();}},
 ...['team','pipeline','integrations'].map(area=>({name:`settings-${area}`,path:`/app/settings/${area}`,ready:page=>page.getByRole('heading',{name:area[0].toUpperCase()+area.slice(1),exact:true,level:1}).waitFor()})),
 {name:'notifications',path:'/app/notifications',ready:page=>page.getByRole('link',{name:'Operator review opportunity',exact:true}).first().waitFor()},
 {name:'notification-target',path:'/app/notifications',ready:async page=>{
  const before=await(await page.request.get('/api/v1/notifications')).json(),notification=before.notifications.find(item=>item.opportunityId===f.opportunityId);
  await page.getByRole('link',{name:'Operator review opportunity',exact:true}).first().click();await page.getByTestId('next-action').waitFor();
  await expect(page).toHaveURL(new RegExp(`/app/opportunities/${f.opportunityId}$`));
  await expect.poll(async()=>(await(await page.request.get('/api/v1/notifications')).json()).notifications.find(item=>item.id===notification.id).readAt).toBeTruthy();
 }},
 {name:'reports',path:'/app/reports#forecast',ready:async page=>{await expectHashTarget(page,'forecast');await page.getByRole('button',{name:'Reopen saved report'}).first().click();await page.getByText('How this report is calculated',{exact:true}).click();await page.getByText('Create or edit a report from your records',{exact:true}).click();}},
 {name:'forms',path:'/app/settings/forms',ready:async page=>{await page.getByRole('button',{name:'Reopen latest publication'}).first().click();await page.frameLocator('iframe[title="Compiled landing page preview"]').getByRole('heading',{name:'Tell us about your team',exact:true}).waitFor();await page.getByRole('button',{name:'Read submissions'}).first().click();await page.getByText('A form submission shown as labelled values.',{exact:true}).waitFor();}},
 {name:'access',path:'/app/settings/team',ready:page=>page.getByRole('button',{name:'Revoke grant',exact:true}).waitFor()},
 {name:'shared',path:`/app/shared-records?kind=contact&id=${f.contactId}`,ready:async page=>{await page.getByRole('region',{name:'Shared record details'}).waitFor();await expectProvenance(page,f.provenance);}},
 {name:'delegation-settings',path:'/delegation/settings',ready:page=>page.getByRole('heading',{name:'Delegations',exact:true}).waitFor()},
 {name:'delegation-authorize',path:f.authorize,ready:page=>page.getByRole('button',{name:'Allow selected access',exact:true}).waitFor()},
 ];}
