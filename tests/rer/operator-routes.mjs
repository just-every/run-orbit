import {expect} from '@playwright/test';
import {expectProvenance} from './operator-provenance.mjs';
export function operatorRoutes(f){return [
 {name:'now',path:'/app',ready:page=>page.getByTestId('now-queue').waitFor()},
 {name:'imports',path:'/app/imports',ready:page=>page.getByRole('heading',{name:'Move in your customer records',exact:true}).waitFor()},
 {name:'records',path:'/app/records',ready:page=>page.getByRole('button',{name:'Create from existing records'}).waitFor()},
 {name:'contacts',path:'/app/records?kind=contact',ready:page=>page.getByRole('button',{name:'Create contact',exact:true}).waitFor()},
 {name:'companies',path:'/app/records?kind=company',ready:page=>page.getByRole('button',{name:'Create company',exact:true}).waitFor()},
 {name:'new',path:'/app/new',ready:page=>expect(page.getByRole('button',{name:'Save opportunity'})).toBeEnabled()},
 {name:'contact',path:`/app/records?kind=contact&record=${f.contactId}`,ready:async page=>{await page.getByRole('heading',{name:'Record details'}).waitFor();await expectProvenance(page,f.provenance);}},
 {name:'company',path:`/app/records?kind=company&record=${f.companyId}`,ready:page=>page.getByRole('heading',{name:'Record details'}).waitFor()},
 {name:'contact-create',path:'/app/records?kind=contact',ready:async page=>{await page.getByRole('button',{name:'Create contact',exact:true}).click();await page.getByLabel('Full name',{exact:true}).waitFor();}},
 {name:'company-create',path:'/app/records?kind=company',ready:async page=>{await page.getByRole('button',{name:'Create company',exact:true}).click();await page.getByLabel('Company name',{exact:true}).waitFor();}},
 {name:'opportunity-create-existing',path:'/app/records',ready:async page=>{await page.getByRole('button',{name:'Create from existing records',exact:true}).click();await page.getByLabel('Opportunity title',{exact:true}).waitFor();}},
 {name:'record-edit',path:`/app/records?kind=contact&record=${f.contactId}`,ready:async page=>{await page.getByRole('button',{name:'Edit details',exact:true}).click();await page.getByLabel('Full name',{exact:true}).waitFor();await expectProvenance(page,f.provenance);}},
 {name:'record-tools',path:'/app/records?kind=contact',ready:async page=>{await page.getByRole('button',{name:'Create contact',exact:true}).waitFor();await page.getByText('Import, duplicate review and data export',{exact:true}).click();}},
 {name:'opportunity',path:`/app/opportunities/${f.opportunityId}`,ready:page=>page.getByTestId('next-action').waitFor()},
 {name:'opportunity-audit',path:`/app/opportunities/${f.opportunityId}`,ready:async page=>{await page.getByTestId('next-action').waitFor();await page.getByText('Audit details',{exact:true}).click();await page.getByText('Log activity',{exact:true}).click();await page.getByRole('button',{name:'Write follow-up',exact:true}).click();await page.getByText('Complete or skip this action',{exact:true}).click();for(const details of await page.getByTestId('opportunity-timeline').getByText('Recorded details',{exact:true}).all())await details.click();}},
 {name:'timeline-edit',path:`/app/opportunities/${f.opportunityId}`,ready:async page=>{await page.getByTestId('opportunity-timeline').getByRole('button',{name:'Edit entry',exact:true}).click();await expect(page.getByRole('heading',{name:'Edit entry',exact:true}).locator('..').getByLabel('Text',{exact:true})).toBeFocused();}},
 {name:'draft',path:`/app/drafts/${f.draftId}`,ready:page=>page.getByTestId('draft-subject').waitFor()},
 {name:'draft-audit',path:`/app/drafts/${f.draftId}`,ready:async page=>{await page.getByTestId('draft-subject').waitFor();await page.getByText('Audit details',{exact:true}).click();}},
 {name:'assistance',path:`/app/assistance/${f.opportunityId}`,ready:page=>expect(page.getByRole('button',{name:'Preview request',exact:true})).toBeEnabled()},
 {name:'assistance-preview',path:`/app/assistance/${f.opportunityId}`,ready:async page=>{await page.getByRole('button',{name:'Preview request',exact:true}).click();await page.getByText('View complete request',{exact:true}).click();await expectProvenance(page,f.provenance);}},
 {name:'sources',path:'/app/sources',ready:page=>page.getByRole('heading',{name:'Operator review source'}).waitFor()},
 ...['website','calcom','calendly','automation'].map(recipe=>({name:`sources-${recipe}`,path:'/app/sources',ready:async page=>{
  await page.getByRole('button',{name:'Open recipes',exact:true}).click();await page.getByLabel('Recipe',{exact:true}).selectOption(['calcom','calendly'].includes(recipe)?'booking':recipe);
  if(recipe==='website'){await page.getByText('Create or publish a form',{exact:true}).click();await page.getByText('Run a form submission in Node',{exact:true}).click();}
  else if(recipe==='automation')await page.getByLabel('Automation platform',{exact:true}).selectOption('make');
  else await page.getByLabel('Booking provider',{exact:true}).selectOption(recipe);
 }})),
 {name:'sources-disabled',path:'/app/sources',ready:async page=>{await page.getByText('Advanced',{exact:true}).click();await page.getByRole('button',{name:'Disable source',exact:true}).click();await page.getByRole('button',{name:'Enable source',exact:true}).waitFor();await page.getByRole('button',{name:'Open recipes',exact:true}).click();await expect(page.getByRole('button',{name:'Send test event',exact:true})).toBeDisabled();},after:async page=>{await page.getByRole('button',{name:'Enable source',exact:true}).click();await page.getByRole('button',{name:'Disable source',exact:true}).waitFor();}},
 {name:'settings',path:'/app/settings',ready:page=>page.getByRole('button',{name:'Save workspace',exact:true}).waitFor()},
 {name:'notifications',path:'/app/notifications',ready:page=>page.getByRole('link',{name:'Operator review opportunity',exact:true}).first().waitFor()},
 {name:'notification-target',path:'/app/notifications',ready:async page=>{
  const before=await(await page.request.get('/api/v1/notifications')).json(),notification=before.notifications.find(item=>item.opportunityId===f.opportunityId);
  await page.getByRole('link',{name:'Operator review opportunity',exact:true}).first().click();await page.getByTestId('next-action').waitFor();
  await expect(page).toHaveURL(new RegExp(`/app/opportunities/${f.opportunityId}$`));
  await expect.poll(async()=>(await(await page.request.get('/api/v1/notifications')).json()).notifications.find(item=>item.id===notification.id).readAt).toBeTruthy();
 }},
 {name:'reports',path:'/app/reports',ready:async page=>{await page.getByRole('button',{name:'Reopen saved report'}).first().click();await page.getByText('How this report is calculated',{exact:true}).click();await page.getByText('Create or edit a report from your records',{exact:true}).click();}},
 {name:'forms',path:'/app/forms',ready:async page=>{await page.getByRole('button',{name:'Reopen latest publication'}).first().click();await page.frameLocator('iframe[title="Compiled landing page preview"]').getByRole('heading',{name:'Tell us about your team',exact:true}).waitFor();await page.getByRole('button',{name:'Read submissions'}).first().click();await page.getByText('A form submission shown as labelled values.',{exact:true}).waitFor();}},
 {name:'access',path:'/app/access',ready:page=>page.getByRole('button',{name:'Revoke grant',exact:true}).waitFor()},
 {name:'shared',path:`/app/shared-records?kind=contact&id=${f.contactId}`,ready:async page=>{await page.getByRole('region',{name:'Shared record details'}).waitFor();await expectProvenance(page,f.provenance);}},
 {name:'delegation-settings',path:'/delegation/settings',ready:page=>page.getByRole('heading',{name:'Delegations',exact:true}).waitFor()},
 {name:'delegation-authorize',path:f.authorize,ready:page=>page.getByRole('button',{name:'Allow selected access',exact:true}).waitFor()},
 ];}
