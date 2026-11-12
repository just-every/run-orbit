// VM-only allowance for the unmodified edition's 80 real D1 migrations.
const cp=require('node:child_process'),{syncBuiltinESMExports}=require('node:module');
const execFileSync=cp.execFileSync;
cp.execFileSync=function(file,args,options){
 if(Array.isArray(args)&&args.includes('migrations')&&args.includes('--local')&&options?.timeout&&options.timeout<240000)options={...options,timeout:240000};
 return execFileSync.call(this,file,args,options);
};
syncBuiltinESMExports();
