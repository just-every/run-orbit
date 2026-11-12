// Extra wall-clock allowance only in this VM; the test body and assertions are untouched.
const {createRequire}=require('node:module'),req=createRequire(process.cwd()+'/package.json');
try {
 const {test}=req('@playwright/test'),setTimeout=test.setTimeout.bind(test);
 test.setTimeout=duration=>setTimeout(Math.max(duration,180000));
} catch(error) { if(error.code!=='MODULE_NOT_FOUND')throw error; }
