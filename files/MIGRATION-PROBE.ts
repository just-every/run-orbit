import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {isolatedDatabase} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/run-orbit/tests/support/isolated-database.ts';
import {localArchiveRoundTrip} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/run-orbit/tests/support/capture-privacy-archive.ts';
import {createDependencies} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/run-orbit/tests/support/dependencies.ts';
import {createApp} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/run-orbit/tests/support/app.ts';
import {createSourceSecurity} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/run-orbit/src/core/platform/source-security.ts';
import {createId} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/run-orbit/src/core/shared/ids.ts';
import {createHmac} from 'node:crypto';
async function main(){
const source=await isolatedDatabase(),target=await isolatedDatabase();
try{
 const names=(await readdir('migrations/core')).filter(n=>n.endsWith('.sql')).sort(),applied=(await source.db.prepare('SELECT name FROM d1_migrations ORDER BY name').all<{name:string}>()).results.map(r=>r.name);assert.deepEqual(applied,names);
 const deps=createDependencies(source.db),actor=createId(),stage=createId(),email=['synthetic-orbit-archive','example.test'].join('@');await deps.auth.ensureOperator({id:actor,email:['synthetic-orbit-owner','example.test'].join('@'),displayName:'Synthetic owner'});await deps.workspace.ensureWorkspace({name:'Booking archive',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await deps.workspace.ensurePipelineStage({id:stage,name:'Discovery',position:0});const session=await deps.auth.createSession(actor),app=createApp({database:source.db,assets:{fetch:async()=>new Response('')},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'7c'.repeat(32)})});
 const request=async(path:string,method='GET',data?:unknown)=>{const r=await app.request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});assert.ok(r.ok,await r.clone().text());return r.json() as Promise<any>;};
 const customer=await request('workbench/opportunities','POST',{title:'Portable booking',companyName:'Synthetic account',contactName:'Synthetic attendee',email,stageId:stage,valueCents:100});const {secret}=await request('sources/bookings','PUT',{name:'Synthetic Calendly',enabled:true});
 const deliver=async(kind:string,id:string,extra:Record<string,unknown>={})=>{const event=`https://api.calendly.com/scheduled_events/synthetic-orbit-${id}`,body=JSON.stringify({event:kind,created_at:'2026-01-01T00:00:00.000Z',payload:{uri:event+'/invitees/synthetic-orbit',event,email,name:'Synthetic attendee',scheduled_event:{uri:event,name:'Portable meeting',start_time:'2030-01-01T10:00:00.000Z',end_time:'2030-01-01T11:00:00.000Z',location:{type:'physical',location:'Synthetic room'}},...extra}}),t=String(Math.floor(Date.now()/1000)),r=await app.request('https://orbit.test/api/v1/signals/bookings/calendly',{method:'POST',headers:{'Calendly-Webhook-Signature':`t=${t},v1=${createHmac('sha256',secret).update(t+'.'+body).digest('hex')}`},body});assert.equal(r.status,201,await r.clone().text());return r.json() as Promise<any>;};
 const original=await deliver('invitee.created','old');await deliver('invitee.created','new',{old_invitee:'https://api.calendly.com/scheduled_events/synthetic-orbit-old/invitees/synthetic-orbit',rescheduled:true});await deliver('invitee.canceled','old',{new_invitee:'https://api.calendly.com/scheduled_events/synthetic-orbit-new/invitees/synthetic-orbit',rescheduled:true});await deliver('invitee.canceled','new',{cancellation:{canceled_by:'Synthetic host',reason:'Cancelled'}});
 await localArchiveRoundTrip(source.db,target.db);
 const rows=async(db:D1Database)=>(await db.prepare('SELECT * FROM booking_lifecycle ORDER BY signal_id').all()).results;assert.deepEqual(await rows(target.db),await rows(source.db));
 assert.equal(await target.db.prepare('SELECT secret_ciphertext FROM signal_sources WHERE id=?').bind('bookings').first('secret_ciphertext'),null);
 const timeline=await target.db.prepare('SELECT payload_json FROM timeline_entries WHERE id=?').bind(original.id).first<{payload_json:string}>();assert.equal(JSON.parse(timeline!.payload_json).booking.status,'cancelled');
 console.log(JSON.stringify({check:'migration ledger and CLI booking archive',exit:0,migrations:names.length,bookingReceipts:(await rows(target.db)).length,status:'cancelled',sameActivity:true,credentialsRestored:false,deal:customer.id}));
}finally{await source.dispose();await target.dispose();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
