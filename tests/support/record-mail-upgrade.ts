import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {getPlatformProxy} from 'wrangler';
import {createApp} from './app';
import {signIn} from '../../newtests/t096/fixture';
import {createId} from '../../src/core/shared/ids';
/** Upgrade a populated previous mail schema, including an owner's additional column. */
export async function recordMailForwardUpgrade(){
 const directory=await mkdtemp(join(tmpdir(),'orbit-mail-upgrade-')),migrations=join(directory,'migrations'),config=join(directory,'wrangler.toml'),state=join(directory,'state');await mkdir(migrations);
 await writeFile(config,`name="orbit-mail-upgrade"\ncompatibility_date="2026-09-08"\ncompatibility_flags=["nodejs_compat"]\n[[d1_databases]]\nbinding="DB"\ndatabase_name="orbit-mail-upgrade"\ndatabase_id="00000000-0000-0000-0000-000000000001"\nmigrations_dir=${JSON.stringify(migrations)}\n`);
 const completion='0066_record_mail_completion.sql';for(const name of (await readdir('migrations/core')).filter(name=>name.endsWith('.sql')&&name!==completion))await writeFile(join(migrations,name),await readFile(join('migrations/core',name)));
 const migrate=()=>execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',config,'--persist-to',state],{env:{...process.env,CI:'1'},stdio:'pipe',timeout:120000});let platform:Awaited<ReturnType<typeof getPlatformProxy<{DB:D1Database}>>>|undefined;
 try{migrate();platform=await getPlatformProxy<{DB:D1Database}>({configPath:config,persist:{path:join(state,'v3')},remoteBindings:false});let db=platform.env.DB;
  const owner=createId(),stage=createId(),at=new Date().toISOString();await db.prepare('INSERT INTO owner_bootstrap VALUES(?,?,?,?,?,?,?,?,?)').bind('initial-owner',owner,'upgrade@record-mail.test','Upgrade owner','Mail upgrade','UTC','USD',JSON.stringify([{id:stage,name:'New'}]),at).run();const session=await signIn(db,'upgrade@record-mail.test');
  const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:{send:async()=>({providerMessageId:'accepted-before-upgrade'})}}),call=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:session.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
  const contact=await call('records/contact','POST',{name:'Morgan Chen',email:'morgan@upgrade-mail.test',contactability:'contactable'},201),draft=await call(`workbench/records/contact/${contact.id}/drafts`,'POST',{contactId:contact.id,opportunityId:null,subject:'Retained production consultation',body:'Hi Morgan, can we review the consultation?'},201),render=await call(`library/drafts/${draft.id}/render`);await call(`library/drafts/${draft.id}/render`,'POST',{revision:1,reviewHash:render.reviewHash});const preview=await call(`workbench/drafts/${draft.id}/approval-preview`);const message=await call(`workbench/drafts/${draft.id}/approve`,'POST',{revision:1,quietHoursConfirmation:preview.localTime});assert.equal(message.state,'accepted');
  await db.prepare('ALTER TABLE record_mail_obligations ADD COLUMN owner_retained_note TEXT').run();await db.prepare('UPDATE record_mail_obligations SET owner_retained_note=?').bind('Preserve the owner’s additional evidence').run();const original=await db.prepare('SELECT * FROM record_mail_obligations').first<any>(),columns=Object.keys(original);
  await platform.dispose();platform=undefined;await writeFile(join(migrations,completion),await readFile(join('migrations/core',completion)));migrate();platform=await getPlatformProxy<{DB:D1Database}>({configPath:config,persist:{path:join(state,'v3')},remoteBindings:false});db=platform.env.DB;
  const retained=await db.prepare(`SELECT ${columns.join(',')} FROM record_mail_obligations`).first();assert.deepEqual(retained,original);assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  const upgraded=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}}),response=await upgraded.request(`https://orbit.test/api/v1/workbench/records/contact/${contact.id}/mail`,{headers:{Cookie:session.cookie}});assert.equal(response.status,200);const history=await response.json() as any;assert.equal(history.obligations[0].ownerId,owner);assert.equal(history.obligations[0].operatorId,owner);assert.equal(history.messages[0].body,'Hi Morgan, can we review the consultation?');
  console.log('OUT-017 forward upgrade: accepted mail and open sender promise retain all prior values and owner-added column; current owner initialized; foreign keys intact');
 }finally{await platform?.dispose();await rm(directory,{recursive:true,force:true});}
}
