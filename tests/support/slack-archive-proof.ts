import {localArchiveRoundTrip} from './capture-privacy-archive';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {isolatedDatabase} from './isolated-database';
import {createDependencies} from './dependencies';
import {createApp} from './app';
import {createId} from '../../src/core/shared/ids';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import type {SlackFixture} from './slack-notices-proof';
export async function proveSlackArchive(f:SlackFixture,{contact,secret,token,deletes,posts,call}:any){
 const request=async(path:string,method='GET',body?:unknown)=>{const r=await f.request(path,method,body);assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
 let job=await request('records/archive/exports','POST',{});while(job.state==='preparing')job=await request(`records/archive/exports/${job.id}/advance`,'POST',{});const archive=await request(`records/archive/exports/${job.id}/download`);
 assert.ok(!JSON.stringify(archive).includes(secret)&&!JSON.stringify(archive).includes(token));for(const table of ['slack_credentials','slack_action_tokens'])assert.ok(!archive.manifest.tables.some((t:any)=>t.name===table));
 const target=await isolatedDatabase();try{
  const restoreSecurity=createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')});
  const deps=createDependencies(target.db),actor=createId();await deps.auth.ensureOperator({id:actor,email:'target@orbit.test',displayName:'Target'});await deps.workspace.ensureWorkspace({name:'Archive receiver',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});const session=await deps.auth.createSession(actor);let app=createApp({database:target.db,assets:{fetch:async()=>new Response('')},sourceSecurity:restoreSecurity});
  const restoredRequest=async(path:string,method='GET',body?:unknown)=>{const r=await app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
  let restored=await restoredRequest('records/archive/imports','POST',{manifest:archive.manifest,confirmed:true});for(const part of archive.parts)await restoredRequest(`records/archive/imports/${restored.id}/parts/${part.index}`,'PUT',part);for(let n=0;n<1000&&restored.state!=='complete';n++)restored=await restoredRequest(`records/archive/imports/${restored.id}/finalize`,'POST',{});assert.equal(restored.state,'complete');
  for(const name of ['slack_notices','slack_actions','slack_events','slack_deletions'])assert.deepEqual((await target.db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all()).results,(await f.db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all()).results,`${name} history round-trips`);
  const channels=(await f.db.prepare('SELECT * FROM slack_channels ORDER BY rowid').all()).results,restoredChannels=(await target.db.prepare('SELECT * FROM slack_channels ORDER BY rowid').all()).results;assert.deepEqual(restoredChannels,channels.map(row=>({...row,enabled:0})),'routing definitions travel; dispatch authority requires fresh admin confirmation');
  const mappings=(await f.db.prepare('SELECT * FROM slack_mappings ORDER BY rowid').all()).results,restoredMappings=(await target.db.prepare('SELECT * FROM slack_mappings ORDER BY rowid').all()).results;assert.equal(restoredMappings.length,mappings.length);for(const [i,row] of restoredMappings.entries()){assert.ok(row.revoked_at);const {revoked_at,...rest}=row,{revoked_at:previous,...original}=mappings[i];assert.deepEqual(rest,original,'mapping provenance survives without authority');}
  for(const table of ['slack_credentials','slack_action_tokens'])assert.equal(await target.db.prepare(`SELECT count(*) n FROM ${table}`).first('n'),0);
  const personal=(await f.db.prepare('SELECT * FROM slack_personal_notices ORDER BY rowid').all()).results;
  assert.ok(personal.length>0,'A populated personal-delivery history is exported');
  assert.deepEqual((await target.db.prepare('SELECT * FROM slack_personal_notices ORDER BY rowid').all()).results,personal.map(row=>['queued','rate-limited','failed','submitting'].includes(String(row.state))?{...row,state:'held',error:'Archive restored; fresh personal opt-in required'}:row));
  assert.equal(await target.db.prepare('SELECT count(*) n FROM slack_personal_preferences WHERE enabled<>0').first('n'),0,'Records restore requires fresh personal opt-in');
  const recipient=await target.db.prepare('SELECT operator_id FROM slack_personal_preferences LIMIT 1').first<string>('operator_id');assert.ok(recipient);
  await target.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  const adminSession=await deps.auth.createSession(f.actor),personalSession=await deps.auth.createSession(recipient!);
  const restoredCall=async(path:string,method='GET',body?:unknown,person=false)=>app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${person?personalSession.token:adminSession.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.equal((await restoredCall('notifications/slack','PUT',{enabled:true,slackUserId:'UPERSONAL'},true)).status,409,'Imported mapping is not personal authority');
  const quiet=posts.length;assert.equal((await restoredCall('settings/slack/connect','POST',{token,signingSecret:secret})).status,200);
  assert.equal((await restoredCall('settings/slack/mappings','PUT',{slackUserId:'UPERSONAL',operatorId:recipient,revoked:false})).status,200);
  assert.equal((await restoredCall('settings/slack/process','POST',{})).status,200);assert.equal(posts.length,quiet,'Reconnected restored history never dispatches');
  assert.equal((await restoredCall('notifications/slack','PUT',{enabled:true,slackUserId:'UPERSONAL'},true)).status,200);
  const deal=await target.db.prepare("SELECT id FROM opportunities LIMIT 1").first<string>('id');assert.ok(deal);
  assert.equal((await restoredCall(`records/opportunity/${deal}/entries`,'POST',{kind:'note',text:'@Personal Recipient synthetic-orbit-restored',occurredAt:new Date().toISOString()})).status,200);
  assert.equal(posts.length,quiet+1,'Fresh opt-in permits only a new restored-installation mention');
  app=createApp({database:target.db,assets:{fetch:async()=>new Response('')},sourceSecurity:restoreSecurity});
  assert.equal((await restoredCall('settings/slack/process','POST',{})).status,200);assert.equal(posts.length,quiet+1,'Restarted delivery does not duplicate the accepted mention');
  const local=await isolatedDatabase();try{await localArchiveRoundTrip(f.db,local.db);assert.equal(await local.db.prepare('SELECT count(*) n FROM slack_personal_preferences WHERE enabled<>0').first('n'),0,'CLI restore also requires personal opt-in');assert.equal(await local.db.prepare("SELECT count(*) n FROM slack_personal_notices WHERE state IN('queued','rate-limited','failed','submitting')").first('n'),0);assert.equal(await local.db.prepare('SELECT count(*) n FROM slack_personal_notices').first('n'),personal.length,'CLI transfer retains populated personal history');}finally{await local.dispose();}

 }finally{await target.dispose();}
 const postCount=posts.length;await call('connect','POST',{token,signingSecret:secret});await call('process','POST',{});assert.equal(posts.length,postCount,'reconnect never replays notices or old actions');assert.ok((await call('')).channels.every((c:any)=>!c.enabled));assert.ok((await call('')).mappings.every((m:any)=>m.revoked_at));
 const beforeDelete=deletes.length;await request(`records/contact/${contact}`,'DELETE',{confirmed:true});const state=await call('');assert.ok(state.notices.filter((n:any)=>n.event_kind!=='dashboard').every((n:any)=>n.state==='redacted'&&n.content_json===null&&n.record_id===null));assert.ok(state.notices.filter((n:any)=>n.event_kind==='dashboard').every((n:any)=>!String(n.content_json).includes(contact)),'generic dashboard history stores no contact identity');assert.ok(deletes.length>beforeDelete,'erasure calls chat.delete through the shipped adapter');assert.ok(state.deletions.length>0&&state.deletions.every((d:any)=>d.state==='deleted'));
 assert.equal(await f.db.prepare('SELECT count(*) n FROM slack_personal_notices').first('n'),0,'Erasure removes personal mention history along with its source');await call('process','POST',{});assert.equal(await f.db.prepare('SELECT count(*) n FROM slack_personal_notices').first('n'),0,'A repeated tick cannot resurrect erased mentions');
}
