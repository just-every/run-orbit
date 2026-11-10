import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,expect,type Page,type Browser} from '@playwright/test';
import {isolateBrowserTemp} from '../../tests/support/browser-temp.mjs';
import {teamOperatorFixture,teamRecords,accessPath,sharedPath,nativePath,type TeamRecord} from './team-operator-fixture';
import {emittedWorker} from './emitted-fixture';
import {accessible,watchBrowser,closeTracedBrowser} from './browser-observations';
const plural={company:'companies',contact:'contacts',opportunity:'opportunities'};
const titleLabel={company:'Company name',contact:'Contact name',opportunity:'Opportunity title'};

/** Built pages, live sessions and persisted D1: full peers use the same doors, a Guest cannot bypass a share. */
export async function equalOperatorBrowser(){
 isolateBrowserTemp();
 const t=await teamOperatorFixture(),directory=process.env.ORBIT_FOLD_BROWSER_EVIDENCE;
 let worker:Awaited<ReturnType<typeof emittedWorker>>|undefined,browser:Browser|undefined;
 try{
  if(!directory)throw Error('Private browser evidence directory is required.');
  await mkdir(directory,{recursive:true,mode:0o700});
  const records=await teamRecords(t),unshared:TeamRecord[]=[];
  for(const record of records){
   const saved=await t.call(t.f.cookie,`${nativePath}/${record.kind}`,'POST',record.kind==='opportunity'?{title:'Confidential expansion',stage_id:t.f.stage,value_cents:940000}:{name:`Confidential ${record.kind}`},201);
   unshared.push({...record,id:saved.id,name:record.kind==='opportunity'?'Confidential expansion':`Confidential ${record.kind}`});
  }
  await t.call(t.guest.cookie,'/api/v2/access/invitations/accept','POST',{token:t.invitation.token});
  worker=await emittedWorker(t.f.target);
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic','--disable-gpu',...worker.browserArgs]});
  for(const width of [1440,390]){
   const options={baseURL:worker.origin,viewport:{width,height:1000},ignoreHTTPSErrors:true};
   const signedContext=async(cookie:string)=>{const context=await browser!.newContext(options),separator=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,separator),value:cookie.slice(separator+1),url:worker!.origin,httpOnly:true,secure:true,sameSite:'Lax'}]);return context;};
   const owner=await signedContext(t.f.cookie),peer=await signedContext(t.peer.cookie),guest=await signedContext(t.guest.cookie);
   const nativeErrors=watchBrowser(owner),peerErrors=watchBrowser(peer),guestErrors=watchBrowser(guest);
   // Existing owner-only sign-in administration is an explicit remaining TEAM-001 boundary.
   peerErrors.allowDeniedResource('/api/v1/settings/sign-in-policy',403);
   try{
    const page=await owner.newPage(),other=await peer.newPage(),shared=await guest.newPage();
    assert.equal((await page.request.get('/api/v1/settings/sign-in-policy')).status(),200);
    assert.equal((await other.request.get('/api/v1/settings/sign-in-policy')).status(),403);
    for(const [operator,screen] of [['Alex',page],['Jordan',other]] as const){
     for(const record of records){
      await screen.goto(`/app/${plural[record.kind]}`);
      await screen.locator(`a[href="/app/${plural[record.kind]}/${record.id}"]`).first().click();
      await expect(screen.getByLabel(titleLabel[record.kind],{exact:true})).toHaveValue(record.name);
      if(record.kind==='company')await expect(screen.getByLabel('Website',{exact:true})).toHaveValue(record.secret);
      if(record.kind==='contact')await expect(screen.getByLabel('Email',{exact:true})).toHaveValue(record.secret);
      if(record.kind==='opportunity')assert.equal(Number((await screen.getByLabel('Value',{exact:true}).inputValue()).replace(/[^0-9.]/g,'')),1250);
      await rename(screen,record,`${record.name} · ${operator} ${width}`);
      await screen.reload();await expect(screen.getByLabel(titleLabel[record.kind],{exact:true})).toHaveValue(`${record.name} · ${operator} ${width}`);
      await rename(screen,record,record.name);
      await note(screen,record,`${operator} reviewed ${record.kind} at ${width}`);
      await accessible(screen,`team-${operator.toLowerCase()}-${record.kind}-${width}`,directory);
      await createAndDelete(screen,record.kind,`${operator} temporary ${record.kind} ${width}`);
     }
    }
    await createBeforeHydration(page,`Early company ${width}`);
    for(const record of records){
     await other.goto('/app/settings/team');
     await expect(other.locator('section[aria-labelledby="sign-in-policy"]').getByRole('alert')).toBeVisible();
     await other.getByRole('combobox',{name:'Collaborator',exact:true}).selectOption(t.guest.operator.operatorId);
     await other.getByRole('combobox',{name:'Record type',exact:true}).selectOption(record.kind);
     await other.getByLabel('Find by name',{exact:true}).fill(record.name);
     await other.getByRole('combobox',{name:'Record',exact:true}).selectOption(record.id);
     await other.getByRole('checkbox',{name:record.kind==='opportunity'?'Title':'Name',exact:true}).check();
     await other.getByRole('combobox',{name:'They may',exact:true}).selectOption(record.kind==='contact'?'edit':'see');
     await other.getByLabel('Why (kept with the grant)',{exact:true}).fill('Review only the agreed customer field');
     await other.getByRole('button',{name:'Share these fields',exact:true}).click();
     await expect(other.getByRole('status').filter({hasText:`Shared ${record.name}`})).toBeVisible();
     await shared.goto(`/app/shared-records?kind=${record.kind}&id=${record.id}`);
     const details=shared.getByRole('region',{name:'Shared record details',exact:true});
     await expect(details.getByRole('heading',{name:record.name,exact:true})).toBeVisible();
     assert.equal(await details.getByText(record.secret,{exact:true}).count(),0);
     await expect(details.locator(`[data-field="${record.secretField}"]`)).toHaveCount(0);
     if(record.kind==='contact'){
      await shared.getByLabel('Name',{exact:true}).fill('Morgan shared review');
      await shared.getByRole('button',{name:'Save name',exact:true}).click();
      await expect(shared.getByRole('status')).toContainText('Field saved');
      const forbidden=await shared.request.put(`${sharedPath}/contact/${record.id}`,{headers:{Origin:worker.origin},data:{email:['forbidden','people.test'].join('@')}});assert.equal(forbidden.status(),403);
      const unchanged=await other.request.get(`${nativePath}/contact/${record.id}`);assert.equal((await unchanged.json()).record.email,record.secret);
      await shared.getByLabel('Name',{exact:true}).fill(record.name);await shared.getByRole('button',{name:'Save name',exact:true}).click();await expect(shared.getByRole('status')).toContainText('Field saved');
     }else{
      await expect(details.getByRole('button',{name:/^Save /})).toHaveCount(0);
      assert.equal((await shared.request.put(`${sharedPath}/${record.kind}/${record.id}`,{headers:{Origin:worker.origin},data:{[record.kind==='opportunity'?'title':'name']:'Forbidden edit'}})).status(),403);
      const unchanged=await other.request.get(`${nativePath}/${record.kind}/${record.id}`);assert.equal((await unchanged.json()).record[record.kind==='opportunity'?'title':'name'],record.name);
     }
     await accessible(shared,`team-shared-${record.kind}-${width}`,directory);
     const blocked=unshared.find(item=>item.kind===record.kind)!;
     guestErrors.allowDeniedResource(`${sharedPath}/${record.kind}/${blocked.id}`,403);
     await unavailableSurvivesLateList(shared,record,blocked.id);
     await shared.goto(`/app/shared-records?kind=${record.kind}&id=${blocked.id}`);
     await expect(shared.getByRole('alert')).toContainText('Record is unavailable');
     await expect(shared.getByRole('region',{name:'Shared record details',exact:true})).toHaveCount(0);
     assert.equal((await shared.request.get(`${sharedPath}/${record.kind}/${blocked.id}`)).status(),403);
     assert.equal((await shared.request.delete(`${nativePath}/${record.kind}/${blocked.id}`,{headers:{Origin:worker.origin},data:{confirmed:true}})).status(),403);
     await accessible(shared,`team-denied-${record.kind}-${width}`,directory);
     await shared.goto(`/app/${plural[record.kind]}/${blocked.id}`);await expect(shared).toHaveURL(/\/app\/shared-records$/);
     await expect(shared.getByRole('heading',{name:blocked.name,exact:true})).toHaveCount(0);
     const row=other.locator('.fold-row').filter({has:other.getByRole('button',{name:'Revoke grant',exact:true})}).filter({hasText:record.name});
     await row.getByRole('button',{name:'Revoke grant',exact:true}).click();await expect(other.getByRole('status').filter({hasText:'Grant revoked'})).toBeVisible();
     guestErrors.allowDeniedResource(`${sharedPath}/${record.kind}/${record.id}`,403);
     await shared.goto(`/app/shared-records?kind=${record.kind}&id=${record.id}`);await expect(shared.getByRole('alert')).toContainText('Record is unavailable');
     assert.equal((await shared.request.put(`${sharedPath}/${record.kind}/${record.id}`,{headers:{Origin:worker.origin},data:{[record.kind==='opportunity'?'title':'name']:'Replayed old share'}})).status(),403);
     const after=await other.request.get(`${nativePath}/${record.kind}/${record.id}`);assert.equal((await after.json()).record[record.kind==='opportunity'?'title':'name'],record.name);
    }
    await shared.goto('/app/settings/team');await expect(shared).toHaveURL(/\/app\/shared-records$/);
    assert.equal((await shared.request.get(`${accessPath}/administration`)).status(),403);
    await nativeErrors.check(directory,`team-owner-${width}`);await peerErrors.check(directory,`team-peer-${width}`);await guestErrors.check(directory,`team-guest-${width}`);
   }finally{await guest.close();await peer.close();await owner.close();}
  }
  console.log('PROBE TEAM-001 UI: built CRM pages at 1440 and 390 let both full operators read, edit, create and delete; Guest sees only shared fields, forbidden record URLs show refusal, native URLs redirect and revoked-share replay returns 403.');
 }finally{try{await closeTracedBrowser(browser);}finally{await worker?.dispose();await t.close();}}
}
async function rename(page:Page,record:TeamRecord,name:string){
 const saved=page.waitForResponse(response=>new URL(response.url()).pathname===`${nativePath}/${record.kind}/${record.id}`&&response.request().method()==='PATCH'&&response.status()===200);
 await page.getByLabel(titleLabel[record.kind],{exact:true}).fill(name);await page.getByLabel(titleLabel[record.kind],{exact:true}).press('Tab');await saved;
}
async function note(page:Page,record:TeamRecord,text:string){
 await page.getByRole('button',{name:'Add a note',exact:true}).click();await page.locator('form.manual-entry').getByLabel('Text',{exact:true}).fill(text);await page.getByRole('button',{name:'Add note',exact:true}).click();
 const row=page.locator('li[id^="entry-"]').filter({hasText:text});await expect(row).toBeVisible();
 await row.getByText('Edit entry',{exact:true}).click();const changed=text+' and confirmed';
 const saved=page.waitForResponse(response=>new URL(response.url()).pathname.startsWith(`${nativePath}/${record.kind}/${record.id}/entries/`)&&response.request().method()==='PUT'&&response.status()===200);
 await row.getByLabel('Text',{exact:true}).fill(changed);await row.getByLabel('Text',{exact:true}).press('Tab');await saved;await expect(row.locator('.r-entry-title')).toHaveText(changed);
 await row.getByRole('button',{name:'Delete entry',exact:true}).click();await row.getByRole('button',{name:'Delete entry',exact:true}).click();await expect(page.locator('.r-entry-title').filter({hasText:changed})).toHaveCount(0);
}
async function createAndDelete(page:Page,kind:TeamRecord['kind'],name:string){
 await page.goto(`/app/${plural[kind]}`);await page.getByRole('link',{name:`New ${kind}`,exact:true}).click();
 if(kind==='opportunity'){
  await page.getByLabel('Company name',{exact:true}).fill('Harbour Studio');await page.getByRole('list',{name:'Company search results',exact:true}).getByRole('button').filter({hasText:'Harbour Studio'}).click();
  await page.getByLabel('Contact name',{exact:true}).fill('Taylor Quinn');await page.getByLabel('Contact email',{exact:true}).fill([`synthetic-orbit-${name.replace(/ /g,'-').toLowerCase()}`,'people.test'].join('@'));
  await page.getByLabel('Opportunity title',{exact:true}).fill(name);await page.getByRole('button',{name:'Save opportunity',exact:true}).click();
 }else{await page.getByLabel('Name',{exact:true}).fill(name);await page.getByRole('button',{name:`Create ${kind}`,exact:true}).click();}
 await expect(page).toHaveURL(new RegExp(`/app/${plural[kind]}/[0-9A-HJKMNP-TV-Z]{26}$`));
 await expect(page.getByLabel(titleLabel[kind],{exact:true})).toHaveValue(name);
 await page.getByRole('button',{name:`Delete ${kind}`,exact:true}).click();await page.getByRole('button',{name:'Delete',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/app/${plural[kind]}$`));
 await expect(page.getByRole('link',{name,exact:true})).toHaveCount(0);
}
/** A click on a form the page's script has not reached yet must not submit it natively: while the client bundle is held
 * back the fields stay read-only and Create stays disabled; once it runs, the typed name creates the company once. */
async function createBeforeHydration(page:Page,name:string){
 const isScript=(url:URL)=>/\.m?js$/.test(url.pathname);let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route(isScript,async route=>{await held;await route.continue();});
 try{
  await page.goto('/app/companies/new',{waitUntil:'domcontentloaded'});
  const create=page.getByRole('button',{name:'Create company',exact:true});
  await expect(create).toBeDisabled();await expect(page.getByLabel('Name',{exact:true})).not.toBeEditable();
  const typed=page.getByLabel('Name',{exact:true}).fill(name);
  release();await typed;await expect(create).toBeEnabled();await create.click();
 }finally{release();await page.unroute(isScript);}
 await expect(page).toHaveURL(/\/app\/companies\/[0-9A-HJKMNP-TV-Z]{26}$/);
 await expect(page.getByLabel(titleLabel.company,{exact:true})).toHaveValue(name);
 await page.getByRole('button',{name:'Delete company',exact:true}).click();await page.getByRole('button',{name:'Delete',exact:true}).click();await expect(page).toHaveURL(/\/app\/companies$/);
}
/** The list read lands after the open read's 403: the refusal must still be on screen once the list has rendered. */
async function unavailableSurvivesLateList(page:Page,record:TeamRecord,blockedId:string){
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
 const isList=(url:URL)=>url.pathname===sharedPath&&url.searchParams.get('kind')===record.kind;
 await page.route(isList,async route=>{await held;await route.continue();});
 try{
  const refused=page.waitForResponse(response=>new URL(response.url()).pathname===`${sharedPath}/${record.kind}/${blockedId}`&&response.status()===403);
  await page.goto(`/app/shared-records?kind=${record.kind}&id=${blockedId}`);await refused;
  await expect(page.getByRole('alert')).toContainText('Record is unavailable');
  const listed=page.waitForResponse(response=>isList(new URL(response.url())));
  release();await listed;
  await expect(page.getByRole('button',{name:record.name,exact:true})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Record is unavailable');
  await expect(page.getByRole('region',{name:'Shared record details',exact:true})).toHaveCount(0);
 }finally{release();await page.unroute(isList);}
}
