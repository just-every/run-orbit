import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import {test} from 'node:test';
import {expect} from '@playwright/test';
import {withOperatorWorkspace} from './operator-workspace.mjs';
import {operatorRouteJourney} from './operator-route-journey.mjs';

test('BASE-PUBLIC-003 T099 native operator routes and expanded data views at 1440px',{timeout:30*60000},()=>withOperatorWorkspace({name:'routes-1440',widths:[1440],observeSetup:true},async context=>{await recordReadOrderJourney(context);await operatorRouteJourney(context,1440);}));

// Hold one response until the other read has finished: no timer can decide which
// error owns the route. Exercise the same record pages as T099 at one width.
async function recordReadOrderJourney({page,fixture,origin,directory}){
 for(const [kind,id] of [['contact',fixture.contactId],['opportunity',fixture.opportunityId]]){
  for(const [primaryStatus,relationshipStatus] of [[404,404],[404,503],[503,404],[401,403],[403,401],[409,500],[500,409],[404,200],[200,404],[403,200],[200,403],[500,200],[200,500]]){
   for(const first of ['primary','relationships']){
    let release;const held=new Promise(done=>{release=done;});
    let answered;const firstAnswered=new Promise(done=>{answered=done;});
    const primary=`**/api/v1/records/${kind}/${id}`,relationships=`**/api/v1/relationships/${kind}/${id}`;
    const handler=(read,status)=>async route=>{
     if(read!==first)await held;
     if(status===200)await route.continue();
     else await route.fulfill({status,json:{error:`${read} refused (${status})`}});
     if(read===first)answered();
    };
    await page.route(primary,handler('primary',primaryStatus));
    await page.route(relationships,handler('relationships',relationshipStatus));
    const firstResponse=page.waitForResponse(response=>response.url()===origin+`/api/v1/${first==='primary'?'records':'relationships'}/${kind}/${id}`);
    try{
     await page.goto(origin+`/app/${kind==='contact'?'contacts':'opportunities'}/${id}`,{waitUntil:'domcontentloaded'});
     await firstAnswered;await (await firstResponse).finished();
     // Observe both browser fetch and React's render before releasing the other response.
     await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
     release();
     const label=`${kind}: primary ${primaryStatus}, relationships ${relationshipStatus}, ${first} first`;
     const alert=page.getByRole('main').getByRole('alert');
     if(primaryStatus===404||relationshipStatus===404){
      await expect(alert,label).toContainText(`This ${kind} does not exist.`);
      await expect(page.getByRole('main').locator('form')).toHaveCount(0);
      await expect(page.getByRole('main').locator(`a[href="/app/${kind==='contact'?'contacts':'opportunities'}"]`)).toBeVisible();
     }else await expect(alert,label).toContainText(primaryStatus===200?`relationships refused (${relationshipStatus})`:`primary refused (${primaryStatus})`);
     console.log(`Record recovery passed: ${label}`);
     if(primaryStatus===404&&relationshipStatus===404&&first==='relationships'){
      for(const width of [1440,390]){
       await page.setViewportSize({width,height:900});
       await page.screenshot({path:`${directory}/recovery-${kind}-${width}.png`,fullPage:true});
      }
      await page.setViewportSize({width:1440,height:900});
     }
    }finally{release();await page.unroute(primary);await page.unroute(relationships);}
   }
  }
 }
}
