import base from './run-orbit/playwright.config.mjs';
export default {
 ...base,
 testDir:new URL('./run-orbit/tests/e2e/',import.meta.url).pathname,
 outputDir:new URL('./browser-results/',import.meta.url).pathname,
 reporter:'list',
 use:{...base.use,trace:'off',launchOptions:{...base.use.launchOptions,executablePath:'/usr/bin/chromium',args:[...base.use.launchOptions.args,'--no-sandbox']}}
};
