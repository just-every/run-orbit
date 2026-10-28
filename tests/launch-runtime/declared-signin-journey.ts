import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {expect,type Browser} from '@playwright/test';
export async function declaredSignInJourney(browser:Browser,origin:string){
 const ownerEmail = process.env.ORBIT_SIGNIN_EMAIL ?? 'owner@example.test';
 const spec = JSON.parse(await readFile('management/integration/deployment-spec.json', 'utf8'));
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:900}}),page=await context.newPage();
 try{
  const signIn = new URL(spec.surfaces.app.signIn.path, origin);
  assert.equal(spec.surfaces.app.signIn.loginHint, true);
  signIn.searchParams.set('login_hint', ownerEmail);
  for (const width of [1440]) {
   await page.setViewportSize({width, height: 900});
   const response = await page.goto(signIn.href);
   assert.equal(response?.status(), 200);
   const email = page.getByRole('textbox', {name: 'Email', exact: true});
   await expect(email).toHaveValue(ownerEmail);
   await expect(page.getByRole('button', {name: 'Email a sign-in link', exact: true})).toBeEnabled();
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   if (process.env.ORBIT_SIGNIN_SHOTS) {
    await mkdir(process.env.ORBIT_SIGNIN_SHOTS, {recursive: true});
    await page.screenshot({path: join(process.env.ORBIT_SIGNIN_SHOTS, `signin-${width}.png`), fullPage: true});
   }
   await email.fill('another-owner@example.test');
   await expect(email).toHaveValue('another-owner@example.test');
  }
  await page.goto(new URL(spec.surfaces.app.signIn.path, origin).href);
  await expect(page.getByRole('textbox', {name: 'Email', exact: true})).toHaveValue('');
 }finally{await context.close();}
}
