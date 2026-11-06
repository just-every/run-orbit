import {createRequire} from 'node:module';
const require=createRequire(new URL('./orbit/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const launch=chromium.launch.bind(chromium);
chromium.launch=options=>launch({...options,executablePath:'/usr/bin/chromium',args:[...(options?.args??[]),'--no-sandbox']});
