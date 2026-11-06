import {createRequire} from 'node:module';
const require=createRequire('/home/agent/rer-consolidation/work/ct-proof-orbit-ai002-20261106-0255/run-orbit/package.json');
const {chromium}=require('@playwright/test');
const launch=chromium.launch.bind(chromium);
chromium.launch=options=>launch({...options,executablePath:'/usr/bin/chromium',args:[...(options?.args??[]),'--no-sandbox']});
