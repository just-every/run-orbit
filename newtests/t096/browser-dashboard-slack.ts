import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {expect,type Browser} from '@playwright/test';
import {accessible} from './browser-observations';
/** Actual emitted UI over the genuine attempts prepared through public HTTP and the Slack edge stand-in. */
export async function dashboardSlackScreens(browser:Browser,worker:{origin:string},cookie:string,directory:string){
 const evidence=join(directory,'REPORT-002');await mkdir(evidence,{recursive:true});
 for(const width of [1440,390]){
  const anonymous=await browser.newContext({baseURL:worker.origin,viewport:{width,height:1000},ignoreHTTPSErrors:true});try{const signIn=await anonymous.newPage(),response=await signIn.goto('/app/dashboards/synthetic-orbit-notice');assert.equal(response?.status(),401);await accessible(signIn,`dashboard-sign-in-${width}`,evidence);}finally{await anonymous.close();}
  const context=await browser.newContext({baseURL:worker.origin,viewport:{width,height:1000},hasTouch:width===390,ignoreHTTPSErrors:true,extraHTTPHeaders:{Cookie:cookie}}),page=await context.newPage();
  const shot=async(name:string)=>{await accessible(page,name,evidence);await page.screenshot({path:join(evidence,name+'.png'),fullPage:false});};
  try{
   await page.goto('/app/dashboards/synthetic-orbit-notice');await page.getByRole('button',{name:'Schedule email',exact:true}).click();const dialog=page.getByRole('dialog');
   await expect(dialog.getByLabel('Slack channel',{exact:true})).toHaveValue('CINTERNAL');await expect(dialog).toContainText('Slack scheduled; email paused');
   for(const state of ['Sent','Failed','Uncertain','Queued'])await expect(dialog.locator('.capture-source-status').filter({hasText:state}).first()).toBeVisible();
   await dialog.evaluate(d=>{d.scrollTop=0;});await shot(`schedule-${width}`);
   const close=dialog.getByRole('button',{name:'Close dialog',exact:true});
   if(width===1440)await close.hover();else{await close.dispatchEvent('pointerdown',{pointerType:'touch'});await page.getByRole('tooltip',{name:'Close dialog',exact:true}).waitFor();}
   await expect(page.getByRole('tooltip',{name:'Close dialog',exact:true})).toBeVisible();await page.screenshot({path:join(evidence,`tooltip-close-${width===1440?'hover':'long-press'}-${width}.png`)});
   if(width===390)await close.dispatchEvent('pointerup',{pointerType:'touch'});await page.mouse.move(0,0);await close.focus();await expect(page.getByRole('tooltip',{name:'Close dialog',exact:true})).toBeVisible();await dialog.evaluate(d=>{d.scrollTop=40;});await expect(page.getByRole('tooltip')).toHaveCount(0);await page.keyboard.press('Escape');
   // Escape closes the modal too; reopen for the footer and real enable/pause interaction.
   await expect(dialog).toHaveCount(0);await page.getByRole('button',{name:'Schedule email',exact:true}).click();
   await expect(dialog.getByLabel('Slack channel',{exact:true})).toHaveValue('CINTERNAL');await dialog.getByRole('button',{name:'Save schedule',exact:true}).scrollIntoViewIfNeeded();await shot(`schedule-footer-${width}`);
   if(width===390){await dialog.getByRole('button',{name:'Pause Slack schedule',exact:true}).click();await expect(dialog).toContainText('Slack paused');await dialog.getByRole('button',{name:'Enable saved Slack schedule',exact:true}).click();await expect(dialog).toContainText('Slack scheduled; email paused');}
   await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();
   await page.getByRole('button',{name:'Share',exact:true}).click();await page.getByRole('radio',{name:'Named people',exact:true}).check();const picker=page.getByLabel('Add a person',{exact:true}),person=await picker.locator('option').filter({hasText:'Marcus Lee'}).getAttribute('value');assert.ok(person);await picker.selectOption(person!);const remove=page.locator('.dash-grant button');
   if(width===1440)await remove.hover();else{await remove.dispatchEvent('pointerdown',{pointerType:'touch'});}
   await expect(page.getByRole('tooltip')).toBeVisible();await page.screenshot({path:join(evidence,`tooltip-remove-${width===1440?'hover':'long-press'}-${width}.png`)});if(width===390)await remove.dispatchEvent('pointerup',{pointerType:'touch'});await page.keyboard.press('Escape');
   await page.goto('/app/settings/integrations#personal-slack');const personal=page.getByRole('region',{name:'Your Slack mentions',exact:true});
   await personal.scrollIntoViewIfNeeded();if(width===1440){await expect(personal.getByRole('checkbox',{name:'Send my mentions as Slack direct messages'})).toBeChecked();
   await expect(personal).toContainText('Acknowledged by Slack');await expect(personal).toContainText('Uncertain');await expect(personal.getByRole('button',{name:'Retry failed mention'})).toHaveCount(1);}await shot(`personal-mentions-${width}`);
   if(width===1440){await personal.getByRole('checkbox').uncheck();await personal.getByRole('button',{name:'Save personal mention preference'}).click();await expect(personal).toContainText('Personal mention preference saved.');await page.reload();await expect(personal.getByRole('checkbox')).not.toBeChecked();await personal.getByRole('checkbox').check();await personal.getByRole('button',{name:'Save personal mention preference'}).click();await expect(personal).toContainText('Personal mention preference saved.');}
   await page.goto('/app/notifications');if(width===1440)await expect(page.getByRole('link',{name:'Your Slack mention preference'})).toHaveAttribute('href','/app/settings/integrations#personal-slack');await shot(`personal-inbox-${width}`);
   await page.goto('/app/settings/integrations');await page.getByRole('button',{name:/^(Open|Connect) Slack$/}).click();const settings=page.getByRole('region',{name:'Slack sales notices',exact:true});await expect(settings.getByRole('combobox',{name:'Channel',exact:true})).toHaveValue('CINTERNAL');await expect(settings.getByRole('checkbox',{name:'Dashboard ready',exact:true})).toBeChecked();await settings.getByText('Event types',{exact:true}).scrollIntoViewIfNeeded();await shot(`slack-settings-${width}`);await settings.getByRole('heading',{name:'Channel status',exact:true}).scrollIntoViewIfNeeded();await expect(settings).toContainText('Dashboard ready');await shot(`slack-channel-status-${width}`);
  }finally{await context.close();}
 }
}
