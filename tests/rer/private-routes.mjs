import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function privateFiles(root){
 await mkdir(join(root,'exports'),{recursive:true});
 for(const folder of ['.rer/local','.seed/installer']){
  await mkdir(join(root,folder),{recursive:true,mode:0o700});
  await writeFile(join(root,folder,'private-route.txt'),'private archive test sentinel',{mode:0o600});
 }
 await writeFile(join(root,'exports/private-route.rer'),'private archive test sentinel',{mode:0o600});
 await writeFile(join(root,'private-route.rer'),'private archive test sentinel',{mode:0o600});
 return [
  '/cdn-cgi/local/explorer/api/d1','/cdn-cgi/local/explorer/api/databases','/cdn-cgi/local/explorer/api/kv/namespaces',
  '/cdn-cgi/local/explorer/api/r2/buckets','/cdn-cgi/handler/scheduled',
  '/.rer/local/dev-key.env','/.seed/installer/state.json',
  '/.rer/local/private-route.txt','/.seed/installer/','/.seed/installer/private-route.txt',
  '/exports/private-route.rer','/private-route.rer',`/@fs${join(root,'private-route.rer')}`,`/@fs${join(root,'exports/private-route.rer')}`,`/@fs${join(root,'.rer/local/dev-key.env')}`,
 ];
}
export async function assertPrivateRoutes(origin,paths){
 const results=await Promise.all(paths.map(async path=>{
  const response=await fetch(origin+path,{redirect:'manual'});
  if(path.startsWith('/cdn-cgi/')||path.startsWith('/.'))assert.equal(response.status,404,`${path}: ${response.status}`);
  else assert.ok([403,404].includes(response.status),`${path}: ${response.status}`);
  assert.doesNotMatch(await response.text(),/private archive test sentinel/);
  return {path,status:response.status};
 }));
 console.log(JSON.stringify({publicPort:new URL(origin).port,privateRoutes:results}));
}
export async function setupWithProbes(checkout,args,origin,paths){
 let finished=false,observed=false,probeFailure;
 const setup=checkout.rer(args).finally(()=>{finished=true;});
 while(!finished){
  try{
   if((await fetch(origin+'/health')).status===200){await assertPrivateRoutes(origin,paths);observed=true;break;}
  }catch(error){if(error.name==='AssertionError'){probeFailure=error;break;}}
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 const result=await setup;
 if(probeFailure)throw probeFailure;
 assert.equal(observed,true,'Observe the public setup runtime while it is serving');
 return result;
}
