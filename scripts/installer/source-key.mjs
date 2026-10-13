import {randomBytes} from 'node:crypto';
import {readSettings} from '@runeditrun/rer/adapter-settings';
import {writePrivateFile} from '@runeditrun/rer/private-files';
/** Upgrade an existing private settings file without replacing any saved value. */
export async function ensureLocalSourceKey({root,store}){
 const saved=await readSettings(root,{});
 if(saved.text===undefined)return; // Fresh installations use the managed setup manifest.
 if(Object.hasOwn(saved.values,'ORBIT_ENCRYPTION_KEY')){
  if(!/^[a-f0-9]{64}$/i.test(saved.values.ORBIT_ENCRYPTION_KEY))throw Error('The saved source encryption key is invalid. Restore its original value before setup.');
  store.addSecrets?.([saved.values.ORBIT_ENCRYPTION_KEY]);return;
 }
 const key=randomBytes(32).toString('hex');store.addSecrets?.([key]);
 await writePrivateFile(saved.path,saved.text.replace(/\n*$/,'\n')+`ORBIT_ENCRYPTION_KEY=${key}\n`);
}
/** Read names only; existing remote secrets are inherited by Base's deploy kit. A missing one is generated once. */
export async function ensureDeploymentSourceKey(api,worker,env,store){
 let secrets;try{secrets=await api.request(`/workers/scripts/${worker}/secrets`);}catch(error){if(error.status!==404)throw error;secrets=[];}
 if(!Array.isArray(secrets)||secrets.some(item=>typeof item.name!=='string'))throw Error('Could not verify deployed secret names.');
 // ORBIT_ENCRYPTION_KEY seals source secrets; SESSION_SECRET keys Base sign-in links and rate limits.
 for(const name of ['ORBIT_ENCRYPTION_KEY','SESSION_SECRET']){
  if(secrets.some(item=>item.name===name)){delete env[name];continue;}
  const key=env[name]?.trim()||randomBytes(32).toString('hex');
  if(!/^[a-f0-9]{64}$/i.test(key))throw Error(`${name} must encode 32 random bytes as hex.`);
  env[name]=key;store.addSecrets?.([key]);
 }
}
