const {createRequire} = require('node:module');
const path = require('node:path');
const req = createRequire(path.join(process.cwd(), 'package.json'));
const {chromium} = req('@playwright/test');
const launch = chromium.launch.bind(chromium);
chromium.launch = options => launch({...options, executablePath:'/usr/bin/chromium',args:[...(options?.args??[]),'--no-sandbox']});
