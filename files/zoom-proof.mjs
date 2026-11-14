import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {openLink} from '../tests/rer/sign-in.mjs';
import {devSignIn} from '../tests/rer/operator-fixture.mjs';
const output=await readFile('/tmp/orbit-proof-dev.log','utf8');
const link=openLink(output);
const packet=process.env.HOME+'/rer-consolidation/work/main-orbit-readable-runs-1-pc1/packet';
await mkdir(packet+'/screens',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 await devSignIn(page,link);
 if(new URL(page.url()).pathname==='/setup'){
  await page.getByLabel('Your name').fill('Synthetic Orbit Owner');
  await page.getByLabel('Business name').fill('Synthetic Orbit Studio');
  await page.getByRole('button',{name:'Finish setup',exact:true}).click();
  await page.waitForURL('**/app');
 }
 const origin=new URL(page.url()).origin;
 await page.goto(origin+'/app/settings/integrations');
 await page.getByRole('button',{name:'Connect Zoom',exact:true}).click();
 const zoom=page.locator('section[aria-labelledby="zoom-settings"]');
 await zoom.getByRole('heading',{name:'Connect Zoom',exact:true}).waitFor();
 await zoom.locator('summary').click();
 const views=[];
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  await zoom.screenshot({path:packet+`/screens/zoom-setup-${width}.png`});
  views.push({width,horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 await writeFile(packet+'/zoom-browser-receipt.json',JSON.stringify({surface:'/app/settings/integrations',section:'Zoom meetings',proofOnly:true,views},null,2)+'\n');
 console.log('Zoom setup proof captured at 1440 and 390.');
}finally{await browser.close();}
