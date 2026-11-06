import pinned from './run-orbit/playwright.config.mjs';
const root = new URL('./run-orbit/', import.meta.url).pathname;
export default {
  ...pinned,
  testDir: root + 'tests/e2e',
  outputDir: new URL('./browser-artifacts/', import.meta.url).pathname,
  reporter: [['list'], ['json', {outputFile: new URL('./packet/browser-results.json', import.meta.url).pathname}]],
  projects: [
    {name: 'privacy-1440', use: {viewport: {width:1440, height:900}}},
    {name: 'privacy-390', use: {viewport: {width:390, height:900}}},
  ],
  use: {...pinned.use, launchOptions: {...pinned.use.launchOptions, executablePath: '/usr/bin/chromium', args: [...pinned.use.launchOptions.args, '--no-sandbox']}},
};
