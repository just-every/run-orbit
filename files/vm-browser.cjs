const {createRequire}=require('node:module');
const req=createRequire(process.cwd()+'/package.json');
try {
 const {chromium}=req('@playwright/test');
 const launch=chromium.launch.bind(chromium);
 chromium.launch=(options={})=>launch({...options,executablePath:'/usr/bin/chromium',args:[...(options.args??[]),'--no-sandbox']});
} catch(error) { if(error.code!=='MODULE_NOT_FOUND')throw error; }
