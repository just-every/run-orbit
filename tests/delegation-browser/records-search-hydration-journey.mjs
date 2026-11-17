import {expect} from '@playwright/test';

/** A slow page module must not admit typing that hydration will erase. */
export async function recordsSearchHydrationJourney(page){
 await page.setViewportSize({width:1440,height:900});
 let release,requested,continued;
 const held=new Promise(done=>{release=done;});
 const entered=new Promise(done=>{requested=done;}),handled=new Promise(done=>{continued=done;});
 const module='**/assets/records-page-*.js';
 await page.route(module,async route=>{requested();await held;try{await route.continue();}finally{continued();}});
 const search=page.getByRole('searchbox',{name:'Search records and timeline',exact:true});
 try{
  await page.goto('/app/contacts',{waitUntil:'commit'});
  await entered;
  await expect(search).toBeVisible();
  await expect(search).not.toBeEditable();
 }finally{release();await handled;await page.unroute(module);}
 const query='Synthetic Calendar Contact';
 await search.fill(query);
 const views=page.getByRole('region',{name:'Saved record views',exact:true});
 await views.locator('summary').click();
 await views.getByLabel('View name',{exact:true}).fill('Synthetic delayed search');
 const saved=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/records/views'&&response.request().method()==='POST');
 await views.getByRole('button',{name:'Save new view',exact:true}).click();
 const response=await saved;expect(response.status()).toBe(201);
 const {view}=await response.json();expect(view.q).toBe(query);
 await page.goto(`/app/contacts?saved=${encodeURIComponent(view.id)}`);
 await expect(search).toHaveValue(query);
 await views.locator('summary').click();
 await views.getByRole('button',{name:'Delete view',exact:true}).click();
 await expect(views.getByRole('status')).toHaveText('View deleted.');
}
