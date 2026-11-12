import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isolatedDatabase} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/main-probe/tests/support/isolated-database.ts';
import {createDependencies} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/main-probe/tests/support/dependencies.ts';
import {createApp as oldApp} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/main-probe/tests/support/app.ts';
import {createApp} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/run-orbit/tests/support/app.ts';
import {createSourceSecurity} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/run-orbit/src/core/platform/source-security.ts';
import {createId} from '/home/agent/rer-consolidation/work/sd-orbit-c-f163/run-orbit/src/core/shared/ids.ts';
async function main(){const dbs=await isolatedDatabase();try{
 const db=dbs.db,deps=createDependencies(db),actor=createId(),stage=createId(),key=randomBytes(32).toString('hex'),email=['synthetic-orbit-upgrade','example.test'].join('@');
 await deps.auth.ensureOperator({id:actor,email:['synthetic-orbit-owner','example.test'].join('@'),displayName:'Synthetic owner'});await deps.workspace.ensureWorkspace({name:'Legacy booking',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await deps.workspace.ensurePipelineStage({id:stage,name:'Discovery',position:0});const session=await deps.auth.createSession(actor),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:key}),headers={Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'};
 let app=oldApp({database:db,assets:{fetch:async()=>new Response('')},sourceSecurity:security});
 const json=async(path:string,method='GET',body?:unknown)=>{const r=await app.request('https://orbit.test/api/v1/'+path,{method,headers,body:body?JSON.stringify(body):undefined});assert.ok(r.ok,await r.clone().text());return r.json() as Promise<any>;};
 const deal=await json('workbench/opportunities','POST',{title:'Prior booking',companyName:'Synthetic company',contactName:'Synthetic attendee',email,stageId:stage,valueCents:100}),{secret}=await json('sources/bookings','PUT',{name:'Calendly',enabled:true});
 const event=(id:string)=>`https://api.calendly.com/scheduled_events/synthetic-orbit-${id}`,invitee=(id:string)=>`${event(id)}/invitees/synthetic-orbit`;
 const payload=(id:string,extra={})=>({event:'invitee.created',created_at:'2026-01-01T00:00:00.000Z',payload:{uri:invitee(id),event:event(id),email,name:'Synthetic attendee',scheduled_event:{uri:event(id),name:'Legacy consultation',start_time:id==='old'?'2030-01-01T10:00:00.000Z':'2030-01-02T10:00:00.000Z',end_time:id==='old'?'2030-01-01T11:00:00.000Z':'2030-01-02T11:00:00.000Z'},...extra}});
 const deliver=async(body:any)=>{const raw=JSON.stringify(body),t=String(Math.floor(Date.now()/1000)),r=await app.request('https://orbit.test/api/v1/signals/bookings/calendly',{method:'POST',headers:{'Calendly-Webhook-Signature':`t=${t},v1=${createHmac('sha256',secret).update(t+'.'+raw).digest('hex')}`},body:raw});assert.equal(r.status,201,await r.clone().text());return r.json() as Promise<any>;};
 const original=await deliver(payload('old'));
 if(!await db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='booking_lifecycle'").first()){const sql=await readFile('migrations/core/0081_calendly_booking_lifecycle.sql','utf8');for(const statement of sql.replace(/^--.*$/gm,'').split(';').filter(value=>value.trim()))await db.prepare(statement).run();}
 app=createApp({database:db,assets:{fetch:async()=>new Response('')},sourceSecurity:security});
 const changed=await deliver(payload('new',{old_invitee:invitee('old'),rescheduled:true}));
 const detail=await json(`records/opportunity/${deal.id}`);const meetings=detail.timeline.filter((row:any)=>row.kind==='signal.recorded');
 console.log(JSON.stringify({probe:'booking from prior main survives upgrade',originalActivity:original.id,rescheduledActivity:changed.id,activities:meetings.length,expectedActivities:1}));
 assert.equal(changed.id,original.id,'A booking received before upgrade must keep its activity identity');assert.equal(meetings.length,1);
}finally{await dbs.dispose();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
