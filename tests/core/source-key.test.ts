import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {mkdtemp,writeFile,readFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ensureLocalSourceKey,ensureDeploymentSourceKey} from '../../scripts/installer/source-key.mjs';
import {secretBindings,uploadWorker} from '@runeditrun/rer/internal/modules/deploy-kit/worker.mjs';
test('SIGNAL-009 source keys are private, generated once and inherited across local setup and fake-provider deploys',async()=>{
 const root=await mkdtemp(join(tmpdir(),'orbit-source-key-')),registered=[],store={addSecrets:values=>registered.push(...values)};
 try{
 await writeFile(join(root,'.dev.vars'),'OWNER_EMAIL=owner@example.test\n',{mode:0o600});
 await ensureLocalSourceKey({root,store});const before=await readFile(join(root,'.dev.vars'),'utf8');assert.ok(/ORBIT_ENCRYPTION_KEY=[a-f0-9]{64}/.test(before),'Generated private key has the required entropy encoding');assert.equal((await stat(join(root,'.dev.vars'))).mode&0o777,0o600);await ensureLocalSourceKey({root,store});assert.ok(await readFile(join(root,'.dev.vars'),'utf8')===before,'Repeated setup preserves private settings');
 let saved;let sealed;const signingSecret=crypto.randomUUID();const uploads=[];const api={async request(path,options){if(path.endsWith('/secrets'))return saved?[{name:'ORBIT_ENCRYPTION_KEY',type:'secret_text'}]:[];if(options?.method==='PUT'){const metadata=JSON.parse(await options.body.get('metadata').text());const key=metadata.bindings.find(item=>item.name==='ORBIT_ENCRYPTION_KEY');if(key.type==='secret_text'){assert.equal(saved,undefined);saved=key.text;sealed=await createSourceSecurity({ORBIT_ENCRYPTION_KEY:saved})!.seal(signingSecret);}else assert.equal(key.type,'inherit');uploads.push(key.type);return{};}throw Error('Unexpected provider operation');}};
 const plan={worker:'orbit-proof',compatibilityDate:'2026-01-01',secrets:[{binding:'ORBIT_ENCRYPTION_KEY',environment:'ORBIT_ENCRYPTION_KEY'}]},artifact={main:'worker.js',assets:[],modules:[{path:'worker.js',base64:Buffer.from('export default {}').toString('base64')}]};
 for(const exists of [false,true]){const env={};await ensureDeploymentSourceKey(api,plan.worker,env,store);const secrets=await secretBindings(api,plan.worker,plan,env,exists);await uploadWorker(api,{plan,artifact,bindings:[],secrets,fingerprint:'test'});}
 assert.deepEqual(uploads,['secret_text','inherit']);assert.ok(registered.includes(saved));assert.ok(await createSourceSecurity({ORBIT_ENCRYPTION_KEY:saved})!.open(sealed)===signingSecret,'Previously encrypted source secrets still decrypt after redeploy');
 }finally{await rm(root,{recursive:true,force:true});}
});
