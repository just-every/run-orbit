import {chromium} from '/workspace/orbit-f146/node_modules/@playwright/test/index.mjs';
import {optOutUpgradeBrowserJourney} from '/workspace/orbit-f146/newtests/t096/browser-opt-out-upgrade.ts';
const originalLaunch = chromium.launch.bind(chromium);
chromium.launch = options => originalLaunch({...options, executablePath: '/usr/bin/chromium', args: [...(options?.args ?? []), '--no-sandbox']});
await optOutUpgradeBrowserJourney('/home/agent/rer-consolidation/work/sd-orbit-c-f146/packet');
