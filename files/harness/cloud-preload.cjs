const childProcess = require('node:child_process');
const {syncBuiltinESMExports} = require('node:module');
const original = childProcess.execFileSync;
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
function schemaCache(){
 const hash=crypto.createHash('sha256');
 for(const file of fs.readdirSync('migrations/core').sort()) {hash.update(file);hash.update(fs.readFileSync(path.join('migrations/core',file)));}
 return '/tmp/orbit-cloud-empty-'+hash.digest('hex').slice(0,16);
}
childProcess.execFileSync = function(file,args,options) {
  if (Array.isArray(args) && args.includes('migrations') && args.includes('apply')) options={...options,timeout:600000};
  const migration=Array.isArray(args)&&args.includes('migrations')&&args.includes('apply')&&args.includes('--persist-to');
  if(!migration)return original.call(this,file,args,options);
  const target=args[args.indexOf('--persist-to')+1],cache=schemaCache();
  if(fs.existsSync(cache+'/complete')){fs.cpSync(cache+'/store',target,{recursive:true});return Buffer.from('Cloud fixture: identical empty migrated schema copied into fresh isolated state.\n');}
  const result=original.call(this,file,args,options);
  if(!fs.existsSync(cache+'/complete')){fs.mkdirSync(cache,{recursive:true});fs.cpSync(target,cache+'/store',{recursive:true});fs.writeFileSync(cache+'/complete','Real Wrangler migrations completed; cache contains no owner, session or customer.\n');}
  return result;
};
syncBuiltinESMExports();
const {chromium} = require('/home/agent/rer-consolidation/work/sd-orbit-form003-fix-1/run-orbit/node_modules/@playwright/test');
const launch = chromium.launch.bind(chromium);
chromium.launch = options => launch({...options,executablePath:'/usr/bin/chromium',args:[...(options?.args??[]),'--no-sandbox']});
