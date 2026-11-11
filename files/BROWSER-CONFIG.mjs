import config from '/workspace/orbit-f157/playwright.config.mjs';
export default {...config,testDir:'/workspace/orbit-f157/tests/e2e',use:{...config.use,launchOptions:{...config.use.launchOptions,executablePath:'/usr/bin/chromium',args:[...config.use.launchOptions.args,'--no-sandbox']}}};
