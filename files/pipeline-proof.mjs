import {withOperatorWorkspace} from '/workspace/run-orbit/tests/rer/operator-workspace.mjs';
import {pipelineCreationJourney} from '/workspace/run-orbit/tests/rer/workflow-journey.mjs';
import {expect} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import {mkdir} from 'node:fs/promises';
const evidence=process.env.HOME+'/rer-consolidation/work/main-orbit-stranger37-trips-1-c1/packet/screens';
await mkdir(evidence,{recursive:true});
await withOperatorWorkspace({name:'pipeline-replay',widths:[1440]},async({page})=>{
 await page.goto(new URL('/app/settings/pipeline',page.url()).href);
 await pipelineCreationJourney(page);
 console.log('PASS visible and keyboard pipeline creation: both saved with Discovery stage');
 await page.getByRole('button',{name:'New pipeline',exact:true}).click();
 const card=page.getByRole('region',{name:'New pipeline',exact:true});
 await card.getByLabel('Name',{exact:true}).fill('Synthetic follow-up pipeline');
 await card.getByLabel('First stage',{exact:true}).fill('Discovery');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await expect(card.getByRole('button',{name:'Create pipeline',exact:true})).toBeVisible();
  await card.screenshot({path:`${evidence}/pipeline-${width}.png`});
 }
 for(const [product,vendor] of [['Cal.com','calcom'],['Calendly','calendly']]){
  await page.goto(new URL('/app/settings/integrations',page.url()).href);
  await page.getByRole('button',{name:`Set up ${product}`,exact:true}).click();
  const panel=page.locator('.integration-panel');
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});
   await expect(panel.getByRole('textbox',{name:'Webhook URL',exact:true})).toBeVisible();
   await panel.screenshot({path:`${evidence}/${vendor}-panel-${width}.png`});
  }
  await panel.getByRole('link',{name:'this source’s recipe in Settings › Capture',exact:true}).click();
  await expect(page.getByLabel('Booking provider',{exact:true})).toHaveValue(vendor);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});
   await page.getByRole('main').screenshot({path:`${evidence}/${vendor}-recipe-${width}.png`});
  }
 }
 await page.getByLabel('Recipe',{exact:true}).selectOption('automation');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await expect(page.getByRole('button',{name:'Copy connection test',exact:true})).toBeVisible();
  await page.getByRole('main').screenshot({path:`${evidence}/automation-${width}.png`});
 }
 console.log('PASS changed-screen browser proof at 1440 and 390');
});
