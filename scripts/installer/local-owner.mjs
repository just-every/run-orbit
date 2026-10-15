import {lstat,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {localState} from '../local-state.mjs';

/** The native owner chosen in Settings, read without opening or changing the app. */
export async function localOwner(root){
 localState(root);
 let directory=root;
 for(const part of ['.wrangler','state','v3','d1','miniflare-D1DatabaseObject']){
  directory=join(directory,part);
  let status;try{status=await lstat(directory);}catch(error){if(error.code==='ENOENT')return [];throw error;}
  if(status.isSymbolicLink()||!status.isDirectory())throw Error('Local owner state is unsafe. Preserve it before deployment.');
 }
 const owners=[];
 for(const file of await readdir(directory,{withFileTypes:true})){
  if(!file.isFile()||!file.name.endsWith('.sqlite'))continue;
  const db=new DatabaseSync(join(directory,file.name),{readOnly:true});
  try{if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='operators'").get())owners.push(...db.prepare("SELECT email FROM operators WHERE setup_owner=1 AND status='active'").all().map(row=>row.email));}
  finally{db.close();}
 }
 return [...new Set(owners)];
}
