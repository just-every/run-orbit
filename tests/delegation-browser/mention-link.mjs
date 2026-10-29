import {expect} from '@playwright/test';

const inView=async(page,id)=>page.evaluate(entry=>{const box=document.getElementById(entry)?.getBoundingClientRect();return box?{top:Math.round(box.top),bottom:Math.round(box.bottom),height:innerHeight}:null;},id);

/** RECORD-017: a colleague follows the mention link from Notifications and lands with the entry in view once the deal sections above it have rendered. */
export async function mentionLink({author,colleague,origin,opportunity,occurredAt}){
 const posted=await author.request.post(`/api/v1/records/opportunity/${opportunity}/entries`,{headers:{Origin:origin},data:{kind:'note',text:'@Morgan Manager can you review the renewal pricing?',occurredAt}});
 expect(posted.status(),await posted.text()).toBe(200);const entry=`entry-${(await posted.json()).id}`;
 const page=await colleague.newPage();
 // The sections above the timeline arrive after it, as they do on a slow connection.
 await page.route('**/api/v1/risks/**',async route=>{await new Promise(done=>setTimeout(done,1500));await route.continue();});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto('/app/notifications');
  const risks=page.waitForResponse(response=>new URL(response.url()).pathname.startsWith('/api/v1/risks/'));
  await page.getByRole('link',{name:'Open the mention'}).first().click();await page.waitForURL(new RegExp(`/app/opportunities/${opportunity}#${entry}$`));
  // Chrome's scroll anchoring would hide the shift; Safari has none, so the journey runs without it.
  await page.addStyleTag({content:'html,body{overflow-anchor:none}'});
  expect((await risks).ok()).toBe(true);await expect(page.getByTestId('deal-risks').locator('summary')).toBeVisible();await expect(page.getByTestId('record-details').getByRole('heading',{name:'People',exact:true})).toBeVisible();
  await expect.poll(async()=>{const box=await inView(page,entry);return box!==null&&box.top>=0&&box.bottom<=box.height;},{message:`the mentioned entry is in the viewport at ${width}`,timeout:5000}).toBe(true);
  await page.waitForTimeout(800);const settled=await inView(page,entry);expect(settled.top>=0&&settled.bottom<=settled.height,`still in view at ${width}: ${JSON.stringify(settled)}`).toBe(true);
 }
 await page.close();
}
