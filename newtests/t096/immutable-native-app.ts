import {execFileSync} from 'node:child_process';
import {mkdir,open,readFile,writeFile,symlink} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
/** Execute the complete immutable native source tree, including its family, module and extension imports, with the qualified dependency tree. */
export async function immutableNativeApp(directory:string,commit:string,db:D1Database){
 const source=join(directory,'immutable-native',commit);
 await mkdir(source,{recursive:true,mode:0o700});
 await writeFile(join(source,'package.json'),'{"type":"module"}\n',{mode:0o600});
 await symlink(resolve('node_modules'),join(source,'node_modules'),'dir');
 const paths=execFileSync('git',['ls-tree','-r','--name-only',commit,'src'],{encoding:'utf8'}).trim().split('\n'),inventory=[];
 for(const path of paths){
  const destination=join(source,path);
  await mkdir(dirname(destination),{recursive:true,mode:0o700});
  // Native artwork exceeds child_process's default stdout buffer. Write each
  // immutable blob directly, preserving the complete source and asset bytes.
  const file=await open(destination,'w',0o600);
  try{execFileSync('git',['show',`${commit}:${path}`],{stdio:['ignore',file.fd,'pipe']});}
  finally{await file.close();}
  inventory.push({path,sha256:createHash('sha256').update(await readFile(destination)).digest('hex')});
 }
 await writeFile(join(source,'source-inventory.json'),JSON.stringify({commit,files:inventory}),{mode:0o600});
 const {createApp}=await import(pathToFileURL(join(source,'src/core/app/app.ts')).href);
 const appForDatabase=(database:D1Database)=>createApp({database,assets:{fetch:async()=>{throw new Error('Native archive API proof does not request static assets.');}}}),app=appForDatabase(db);
 const schema=await import(pathToFileURL(join(source,'src/core/features/records/archive-schema.ts')).href);
 const reader=await import(pathToFileURL(join(source,'src/core/shared/archive-file.ts')).href);
 return{app,appForDatabase,catalog:()=>schema.archiveCatalog(db),readArchiveFile:reader.readArchiveFile};
}
