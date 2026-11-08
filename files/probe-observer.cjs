require('/tmp/orbit-chromium.cjs');
const {createRequire} = require('node:module');
const path = require('node:path');
const req = createRequire(path.join(process.cwd(), 'package.json'));
const {chromium} = req('@playwright/test');
const launch = chromium.launch.bind(chromium);
chromium.launch = async options => {
 const browser = await launch(options);
 const newContext = browser.newContext.bind(browser);
 browser.newContext = async options => {
  const context = await newContext(options);
  await context.exposeBinding('orbitObserve', (_source, value) => console.log('NAV_PROBE', JSON.stringify(value)));
  await context.addInitScript(() => {
   let last = '';
   new MutationObserver(() => {
    const saved = document.body?.innerText.includes('Saved result · measured ') ?? false;
    const drawer = !!document.querySelector('dialog[open] .sales-history');
    const next = JSON.stringify({search:location.search,saved,drawer});
    if (saved && last !== next) { last = next; window.orbitObserve(JSON.parse(next)); }
   }).observe(document,{subtree:true,childList:true,attributes:true});
  });
  context.on('page', page => page.on('response', async response => {
   const pathname = new URL(response.url()).pathname;
   if (/\/versions\/\d+\/snapshots$/.test(pathname)) {
    const body = await response.json().catch(()=>null);
    console.log('HISTORY_PROBE',JSON.stringify({pathname,status:response.status(),items:body?.items?.length}));
   }
  }));
  return context;
 };
 return browser;
};
