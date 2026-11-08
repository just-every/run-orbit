import {chromium} from '/workspace/run-orbit/node_modules/@playwright/test/index.mjs';
import {optOutUpgradeBrowserJourney} from '/workspace/run-orbit/newtests/t096/browser-opt-out-upgrade.ts';
const launch = chromium.launch.bind(chromium);
chromium.launch = options => launch({...options, executablePath: '/usr/bin/chromium', args: [...(options?.args ?? []), '--no-sandbox']});
await optOutUpgradeBrowserJourney(process.env.ORBIT_PROOF_PACKET!);
