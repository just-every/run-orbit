import {isolateBrowserTemp} from '../support/browser-temp.mjs';
isolateBrowserTemp();
import {verifiedEditionCommit} from './edition-source.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {mailbox} from './hosted/mailbox.mjs';
import {nativeAccess} from './hosted/native-access.mjs';
import {runTransfer} from '../../scripts/data-transfer/run.mjs';
import {transferClient} from '../../scripts/data-transfer/http.mjs';
import {readArchiveFile} from '../../src/core/shared/archive-file.ts';
const editionCommit=verifiedEditionCommit();
const root=process.env.ORBIT_RECOVERY_PRIVATE_DIR,origin=process.env.ORBIT_RECOVERY_ORIGIN;
assert.ok(root?.startsWith('/')&&origin?.startsWith('https://'),'Explicit private directory and isolated recovery origin required');
assert.notEqual(origin,'https://orbit.justevery.com');
const state=JSON.parse(await readFile(process.env.ORBIT_ACCEPTANCE_STORAGE_STATE,'utf8'));
const cookie=state.cookies.find(row=>row.name==='__Host-orbit_session');assert.ok(cookie);
const sourceOrigin='https://orbit.justevery.com',receive=await mailbox(),browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});
const sourceFile=root+'/source.json',targetFile=root+'/restored.json';
async function inventory(file){
 const tables={};
 for await(const entry of readArchiveFile(Readable.toWeb(createReadStream(file)))){
  if(entry.kind==='manifest')for(const table of entry.manifest.tables)tables[table.name]=[];
  else for(const record of entry.part.records)tables[record.table].push(record.row);
 }
 return tables;
}
const stable=row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))));
const sorted=rows=>rows.map(stable).sort();
try{
 await mkdir(root,{recursive:true,mode:0o700});
 await runTransfer({operation:'export',origin:sourceOrigin,file:sourceFile},transferClient(sourceOrigin,`${cookie.name}=${cookie.value}`),()=>{});
 const source=await inventory(sourceFile);
 assert.ok(source.contacts.length&&source.outbound_messages.length,'Recover actual workflow records');
 assert.equal(source.outbound_messages.filter(row=>['scheduled','queued','reconciling','delivery-unknown'].includes(row.state)).length,0,'Source requires a quiescent dispatch window');
 const initial=await browser.newContext(),page=await initial.newPage();
 const before=await nativeAccess({page,origin,email:process.env.ORBIT_RECOVERY_OPERATOR,receive});
 await runTransfer({operation:'import',origin,file:sourceFile},transferClient(origin,`${before.cookie.name}=${before.cookie.value}`),()=>{});
 assert.equal((await initial.request.get(origin+'/api/v1/records/contact')).status(),401);
 await initial.close();
 const restored=await browser.newContext(),restoredPage=await restored.newPage();
 const after=await nativeAccess({page:restoredPage,origin,email:process.env.ORBIT_RESTORED_OPERATOR,receive});
 await runTransfer({operation:'export',origin,file:targetFile},transferClient(origin,`${after.cookie.name}=${after.cookie.value}`),()=>{});
 const target=await inventory(targetFile);assert.deepEqual(Object.keys(target).sort(),Object.keys(source).sort());
 const tables={};
 for(const [name,rows]of Object.entries(source)){
  let actual=target[name];
  if(name==='audit_entries'){const ids=new Set(rows.map(row=>row.id)),extra=actual.filter(row=>!ids.has(row.id));assert.ok(extra.length>=1);assert.ok(extra.every(row=>['data.restored','data.exported'].includes(row.action)));actual=actual.filter(row=>ids.has(row.id));}
  assert.deepEqual(sorted(actual),sorted(rows),`Equivalent restored ${name}`);
  tables[name]={rows:rows.length,sha256:createHash('sha256').update(JSON.stringify(sorted(rows))).digest('hex')};
 }
 await restoredPage.goto(origin+'/app/records',{waitUntil:'networkidle'});
 await mkdir('verification',{recursive:true});await restoredPage.screenshot({path:'verification/hosted-recovery.png',fullPage:true});
 await writeFile(root+'/restored-native-state.json',JSON.stringify(await restored.storageState()),{mode:0o600});
 const lock=JSON.parse(await readFile('composition.lock.json','utf8'));
 await writeFile('verification/hosted-recovery.json',JSON.stringify({at:new Date().toISOString(),editionCommit,familyCommit:lock.repositories.family.commit,sourceOrigin,recoveryOrigin:origin,tables,allDomainTablesEquivalent:true,temporaryNativeSessionRevoked:true,nativeAccessBefore:before.proof,nativeAccessAfter:after.proof,customerProviderConfiguration:'Recovery deployed with authentication mail only; provider configuration receipt is separate'},null,2)+'\n');
 console.log('Native streaming recovery and complete data equivalence passed.');
}finally{await browser.close();}
