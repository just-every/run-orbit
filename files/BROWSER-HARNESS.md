# Browser execution harness

The product tests retain their repository configuration in CI. The cloud-only override below selects system Chromium with --no-sandbox and stores failure artifacts outside the product tree; the webServer remains scripts/browser-server.mjs, which migrates and seeds isolated state, builds the app, and serves its emitted Worker. No HTTP route or provider is mocked in the browser journey.

```js
import base from '/workspace/run-orbit/playwright.config.mjs';
export default {...base,testDir:'/workspace/run-orbit/tests/e2e',outputDir:'/tmp/orbit-test-results',use:{...base.use,launchOptions:{...base.use.launchOptions,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-mock-keychain','--password-store=basic']}},webServer:{...base.webServer,cwd:'/workspace/run-orbit'}};
```

All four final captures were visually inspected: reply and Do not contact states at 1440 and 390. The native select ellipsizes its long synthetic email at 390; its disabled selected choice text is asserted at the prescribed 1440 width, where it reads Do not contact. No new layout is introduced by this wording change.
