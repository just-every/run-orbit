import {mkdir,readFile,writeFile,symlink} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {nativeFiles} from './native-history';
/** Execute the immutable native source tree, including its family, module and extension imports, with the qualified dependency tree. Homepage artwork the API never loads is not retained (native-history/README.md). */
export async function immutableNativeApp(directory:string,commit:string,db:D1Database){
 const source=join(directory,'immutable-native',commit);
 await mkdir(source,{recursive:true,mode:0o700});
 await writeFile(join(source,'package.json'),'{"type":"module"}\n',{mode:0o600});
 await symlink(resolve('node_modules'),join(source,'node_modules'),'dir');
 const inventory=[];
 for(const {path,bytes} of nativeFiles(commit,'src')){
  const destination=join(source,path);
  await mkdir(dirname(destination),{recursive:true,mode:0o700});
  await writeFile(destination,bytes,{mode:0o600});
  inventory.push({path,sha256:createHash('sha256').update(await readFile(destination)).digest('hex')});
 }
 await writeFile(join(source,'source-inventory.json'),JSON.stringify({commit,files:inventory}),{mode:0o600});
 const {createApp}=await import(pathToFileURL(join(source,'src/core/app/app.ts')).href);
 const appForDatabase=(database:D1Database)=>createApp({database,assets:{fetch:async()=>{throw new Error('Native archive API proof does not request static assets.');}}}),app=appForDatabase(db);
 const schema=await import(pathToFileURL(join(source,'src/core/features/records/archive-schema.ts')).href);
 const reader=await import(pathToFileURL(join(source,'src/core/shared/archive-file.ts')).href);
 return{app,appForDatabase,catalog:()=>schema.archiveCatalog(db),readArchiveFile:reader.readArchiveFile};
}
