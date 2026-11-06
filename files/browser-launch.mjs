import {createRequire} from 'node:module';
const require=createRequire('/home/agent/rer-consolidation/work/sd-orbit-c-f115/orbit/package.json');
const {chromium}=require('@playwright/test');
const launch=chromium.launch.bind(chromium);
chromium.launch=options=>launch({...options,executablePath:'/usr/bin/chromium',args:[...options?.args??[],'--no-sandbox']});
