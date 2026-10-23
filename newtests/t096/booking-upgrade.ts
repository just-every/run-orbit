import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {releasedDatabase} from './released-database';
import {createId} from '../../src/core/shared/ids';
import {createApp} from '../../tests/support/app';
import {emailLinkSignIn} from '../../tests/support/email-link';
import {createSourceSecurity} from '../../src/core/platform/source-security';
/** Populated released and starting-main schemas acquire the new model without changing an existing value. */
export async function bookingUpgrade(){
 for(const generation of ['released','main']){
  const target=await releasedDatabase();try{
   if(generation==='main')await target.upgrade('0053_dashboards.sql');
   const owner=createId(),stage=createId(),now=new Date().toISOString();await target.db.prepare('INSERT INTO owner_bootstrap VALUES(?,?,?,?,?,?,?,?,?)').bind('initial-owner',owner,'synthetic-orbit-1@upgrade.test','Upgrade owner','Existing business','UTC','USD',JSON.stringify([{id:stage,name:'Review'}]),now).run();
   const session=await emailLinkSignIn(target.db,'synthetic-orbit-1@upgrade.test'),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')}),app=createApp({database:target.db,assets:{fetch:async()=>new Response('')},sourceSecurity:security});
   const request=async(path:string,method='GET',body?:unknown)=>{const response=await app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:session.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.ok(response.ok,await response.clone().text());return response.json() as Promise<any>;};
   const deal=await request('workbench/opportunities','POST',{title:'Retained booking',companyName:'Existing company',contactName:'Existing guest',email:'synthetic-orbit-2@upgrade.test',stageId:stage,valueCents:12345});const source=await request('sources/bookings','PUT',{name:'Existing source',enabled:true});
   const raw=JSON.stringify({triggerEvent:'BOOKING_CREATED',createdAt:now,payload:{uid:'synthetic-orbit-1',attendees:[{email:'synthetic-orbit-2@upgrade.test'}]}}),signal=createId();
   // A historical signed booking already accepted by the prior edition.
   const {decodeBooking}=await import('../../src/core/features/ingestion/booking-webhooks'),event=await decodeBooking('calcom',raw);
   await target.db.batch([target.db.prepare("INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json) VALUES(?,'bookings',?,'meeting.booked','Meeting booked',?,?,'historical','observed','Exact normalized identity',?,?)").bind(signal,event.eventId,now,now,now,raw),target.db.prepare("INSERT INTO timeline_entries VALUES(?,'signal.recorded',?,?,'source','bookings','bookings',?)").bind(signal,now,now,JSON.stringify({signalId:signal,subject:'Meeting booked'})),target.db.prepare("INSERT INTO timeline_entry_records VALUES(?,'opportunity',?)").bind(signal,deal.id)]);
   const quote=(name:string)=>'"'+name.replaceAll('"','""')+'"',before=new Map<string,{columns:string[];rows:string}>();
   for(const {name} of (await target.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name<>'d1_migrations' AND name NOT LIKE 'record_search%' AND name NOT LIKE 'timeline_search%' ORDER BY name").all<{name:string}>()).results){const columns=(await target.db.prepare('SELECT name FROM pragma_table_xinfo(?) WHERE hidden<>1 ORDER BY cid').bind(name).all<{name:string}>()).results.map(c=>c.name);before.set(name,{columns,rows:JSON.stringify((await target.db.prepare(`SELECT ${columns.map(quote).join(',')} FROM ${quote(name)}`).all()).results)});}
   await target.upgrade();for(const [name,old] of before)assert.equal(JSON.stringify((await target.db.prepare(`SELECT ${old.columns.map(quote).join(',')} FROM ${quote(name)}`).all()).results),old.rows,`${generation}: ${name} preserved`);
   const upgraded=createApp({database:target.db,assets:{fetch:async()=>new Response('')},sourceSecurity:security}),changed=JSON.stringify({triggerEvent:'BOOKING_RESCHEDULED',createdAt:new Date().toISOString(),payload:{uid:'synthetic-orbit-2',rescheduleUid:'synthetic-orbit-1',attendees:[{email:'synthetic-orbit-2@upgrade.test'}]}}),response=await upgraded.request('https://orbit.test/api/v1/signals/bookings/calcom',{method:'POST',headers:{'X-Cal-Signature-256':createHmac('sha256',source.secret).update(changed).digest('hex')},body:changed});assert.equal(response.status,201,await response.clone().text());
   const detail=await upgraded.request(`https://orbit.test/api/v1/opportunities/${deal.id}`,{headers:{Cookie:session.cookie}});assert.equal(detail.status,200);const entries=(await detail.json() as any).opportunity.timeline.filter((t:any)=>t.payload?.booking);assert.equal(entries.length,1);assert.equal(entries[0].id,signal);assert.equal(entries[0].payload.booking.state,'rescheduled');assert.deepEqual((await target.db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  }finally{await target.dispose();}
 }
}
