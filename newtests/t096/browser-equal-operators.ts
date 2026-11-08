import assert from 'node:assert/strict';
import {expect,type Browser,type Page} from '@playwright/test';
import {accessible} from './browser-observations';

/** TEAM-001 in the browser (the installation owner's own sign-in policy answers 403 to a second full operator, so console errors are not asserted here): a second full operator opens the same owner pages as the owner, and the
 * accepted collaborator who types those addresses lands on Shared records and sees nothing of them. */
export async function equalOperatorsBrowser(browser:Browser,origin:string,width:number,directory:string,peerCookie:string,collaboratorPage:Page,contactId:string){
 const context=await browser.newContext({baseURL:origin,viewport:{width,height:1000},ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:peerCookie}}),peer=await context.newPage();
 try{
  await peer.goto('/app/settings/team');await expect(peer.getByRole('heading',{name:'Collaborators',exact:true})).toBeVisible();await accessible(peer,`second-operator-team-${width}`,directory);
  await peer.goto(`/app/contacts/${contactId}`);assert.equal(new URL(peer.url()).pathname,`/app/contacts/${contactId}`);await expect(peer.getByRole('heading',{level:1})).toBeVisible();
  await peer.goto('/app/settings/data');assert.equal(new URL(peer.url()).pathname,'/app/settings/data');
  for(const path of ['/app/settings/team','/app/settings/data']){const refused=await collaboratorPage.request.get(path,{maxRedirects:0});assert.equal(refused.status(),302,`${path} is refused to a collaborator`);assert.equal(refused.headers().location,'/app/shared-records');}
  await collaboratorPage.goto('/app/shared-records');await expect(collaboratorPage.getByRole('heading',{name:'Collaborators',exact:true})).toHaveCount(0);
 }finally{await context.close();}
}
