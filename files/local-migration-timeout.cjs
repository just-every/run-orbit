const cp=require('node:child_process');
const original=cp.execFileSync;
cp.execFileSync=function(file,args,options){
 if(Array.isArray(args)&&args[0]==='node_modules/wrangler/bin/wrangler.js'&&args[1]==='d1'&&args[2]==='migrations'&&args[3]==='apply')options={...options,timeout:300000};
 return original.call(this,file,args,options);
};
require('node:module').syncBuiltinESMExports();
