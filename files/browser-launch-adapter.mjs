import {chromium} from '/home/agent/rer-consolidation/work/ct-judge-orbit-team003-20261105-2138-sol1/repo/node_modules/@playwright/test/index.mjs';
const launch=chromium.launch.bind(chromium);
chromium.launch=options=>launch({...options,executablePath:'/usr/bin/chromium',args:[...(options?.args??[]),'--no-sandbox']});
