// Cloud-only allowance for the disposable database bootstrap. No product or assertion timeout changes.
const cp=require('node:child_process');
const original=cp.execFileSync;
cp.execFileSync=function(file,args,options){
 if(Array.isArray(args)&&args.includes('migrations')&&args.includes('apply')&&args.includes('--local')&&options?.timeout===60000){
  options={...options,timeout:180000};
 }
 return original.call(this,file,args,options);
};
require('node:module').syncBuiltinESMExports();
