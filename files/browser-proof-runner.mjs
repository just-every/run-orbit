import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),req=createRequire(root+'/package.json');
const {chromium,expect:baseExpect}=req('@playwright/test');
const expect=baseExpect.configure({timeout:60000});
const {freshCheckout,freePort}=await import(pathToFileURL(root+'/tests/rer/checkout.mjs'));
const {openLink}=await import(pathToFileURL(root+'/tests/rer/sign-in.mjs'));
const checkout=await freshCheckout(),port=await freePort(),origin=`http://127.0.0.1:${port}`;
const packet=new URL('./packet/',import.meta.url).pathname;
let browser,dev;
const receipts=[];
try {
 const setup=await checkout.rer(['setup','--owner-email','fleet@runeditrun.com','--port',String(port),'--non-interactive']);
 assert.equal(setup.code,0,'Proof setup failed; private output withheld');
 dev=await checkout.serve(['dev']);const open=openLink(await dev.ready);
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
 const context=await browser.newContext({baseURL:origin,viewport:{width:1440,height:900}}),page=await context.newPage();
 page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const go=async path=>{await page.goto(origin+path,{waitUntil:'networkidle'});};
 const api=async path=>{const response=await context.request.get(origin+'/api/v1/'+path);assert.ok(response.ok());return response.json();};
 await page.goto(open,{waitUntil:'networkidle'});
 await page.getByLabel('Your name').fill('Fleet Builder');await page.getByLabel('Business name').fill('Synthetic Orbit Defaults');
 await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.waitForURL(origin+'/app');
 await mkdir(packet+'/screens',{recursive:true});
 const shot=async(name,width)=>page.screenshot({path:`${packet}/screens/${name}-${width}.png`,fullPage:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await go('/app');
  if(width===1440){await page.getByRole('link',{name:'Add your first customer',exact:true}).first().click();await page.waitForLoadState('networkidle');}
  else await go('/app/opportunities/new');
  const title=`Synthetic company-free deal ${width}`,email=`synthetic-orbit-${width}@example.test`;
  await page.getByLabel('Contact name',{exact:true}).fill(`Synthetic buyer ${width}`);
  await page.getByLabel('Contact email',{exact:true}).fill(email);
  await page.getByLabel('Opportunity title',{exact:true}).fill(title);
  await page.getByLabel('Estimated value in workspace currency',{exact:true}).fill('10000');
  await expect(page.getByLabel('Owner',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('Company name',{exact:true})).not.toHaveAttribute('required','');
  await shot('new-contact-form',width);
  await page.getByRole('button',{name:'Save opportunity',exact:true}).click();
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  const id=new URL(page.url()).pathname.split('/').pop(),detail=await api('records/opportunity/'+id);
  assert.equal(detail.record.company_id,null);assert.equal(detail.record.owner_id,null);assert.equal(detail.record.value_cents,1000000);assert.equal(detail.contacts.length,1);
  const contact=detail.contacts[0];
  await shot('deal-record',width);
  await go('/app/opportunities');
  const row=page.locator('.records-list').getByRole('link').filter({hasText:title});
  await expect(row).toContainText('No company');await expect(row).toContainText('Unassigned');await shot('deal-list',width);
  await page.getByRole('link',{name:'Board',exact:true}).click();
  const card=page.locator('.pipeline-deal').filter({hasText:title});await expect(card).toContainText('No company');await expect(card).toContainText('Unassigned');await shot('pipeline',width);
  await card.click();await page.reload({waitUntil:'networkidle'});
  await expect(page.getByTestId('record-details').getByLabel('Owner',{exact:true})).toHaveValue('');
  await expect(page.getByTestId('record-details').getByLabel('Company',{exact:true})).toHaveValue('');
  await go('/app/opportunities/new');
  await page.getByRole('searchbox',{name:'Find contacts',exact:true}).fill(email);
  await page.getByRole('list',{name:'Contact search results',exact:true}).getByRole('button').filter({hasText:email}).click();
  await page.getByLabel('Opportunity title',{exact:true}).fill(title+' assigned');
  const owner=page.getByLabel('Owner',{exact:true});const ownerId=await owner.locator('option').nth(1).getAttribute('value');await owner.selectOption(ownerId);
  await shot('existing-contact-form',width);
  await page.getByRole('button',{name:'Save opportunity',exact:true}).click();await expect(page.getByRole('heading',{name:title+' assigned',exact:true})).toBeVisible();
  const assignedId=new URL(page.url()).pathname.split('/').pop(),assigned=await api('records/opportunity/'+assignedId);
  assert.equal(assigned.record.owner_id,ownerId);assert.equal(assigned.record.company_id,null);assert.deepEqual(assigned.contacts.map(c=>c.id),[contact.id]);await shot('assigned-record',width);
  const final=await api('records/opportunity/'+id);assert.equal(final.record.owner_id,null);assert.equal(final.record.company_id,null);
  receipts.push({width,unassignedDeal:id,assignedDeal:assignedId,contact:contact.id,newContactCompany:null,existingContactCompany:null,defaultOwner:null,chosenOwner:ownerId,reloadPreserves:true,listLabels:['No company','Unassigned'],pipelineLabels:['No company','Unassigned']});
 }
 assert.deepEqual(errors,[]);
 await writeFile(packet+'/browser-proof.json',JSON.stringify({status:'passed',screens:12,viewports:[1440,390],receipts,pageErrors:errors},null,2)+'\n');
 console.log('Browser proof passed at 1440 and 390; 12 screens saved.');
} finally {
 await browser?.close();
 if(dev){dev.child.kill('SIGTERM');await dev.exited;}
 await checkout.stop('dev');await checkout.close();
}
