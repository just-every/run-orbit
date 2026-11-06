import base from '/workspace/run-orbit-judge/playwright.config.mjs';
export default {
  ...base,
  testDir: '/workspace/run-orbit-judge/tests/e2e',
  outputDir: '/tmp/orbit-judge-browser-results',
  use: {...base.use, launchOptions:{...base.use.launchOptions,executablePath:'/usr/bin/chromium',args:[...base.use.launchOptions.args,'--no-sandbox']}},
};
