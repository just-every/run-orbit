import { observedCapacityWorker } from '../support/observed-capacity-worker';
import {availablePort} from '../support/available-port';
import { verifyArchiveCapacity } from './archive-capacity';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import { isolatedDatabase } from '../support/isolated-database';
import { createDependencies } from '../support/dependencies';
import { sessionCookieName } from '../support/test-auth';
import {identityVarArgs} from '../support/worker-identity.mjs';
const fixture=await isolatedDatabase(),db=fixture.db,now=new Date().toISOString(),actor='00000000000000000000000000',stage='00000000000000000000000001';
const deps=createDependencies(db);await deps.auth.ensureOperator({id:actor,email:'capacity@example.test',displayName:'Capacity operator'});await deps.workspace.ensureWorkspace({name:'Capacity fixture',timezone:'UTC',currency:'USD',workingHours:{days:[1,2,3,4,5],start:'08:00',end:'18:00'},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});await deps.workspace.ensurePipelineStage({id:stage,name:'Qualified',position:0});
async function populate(label:string,count:number,sql:(cte:string)=>string){for(let start=1;start<=count;start+=5000){const end=Math.min(start+4999,count),cte=`WITH RECURSIVE numbers(n) AS(SELECT ${start} UNION ALL SELECT n+1 FROM numbers WHERE n<${end})`;await db.prepare(sql(cte)).run();}console.log(`Populated ${count} ${label}`);}
let worker:ReturnType<typeof spawn>|undefined,logs='';
let observation: Awaited<ReturnType<typeof observedCapacityWorker>> | undefined;
console.log(`Capacity database: ${fixture.directory}`);
try{
 observation=await observedCapacityWorker();
 await db.prepare("INSERT INTO runtime_controls VALUES('restore','capacity fixture')").run();
 await populate('companies',25000,c=>`${c} INSERT INTO companies(id,name,created_at,updated_at) SELECT printf('%026d',n),'Company '||n,'${now}','${now}' FROM numbers`);
 await populate('contacts',100000,c=>`${c} INSERT INTO contacts(id,company_id,name,email,email_key,contactability,created_at,updated_at) SELECT printf('%026d',n),printf('%026d',1+(n%25000)),CASE WHEN n>99950 THEN 'Capacityneedle contact ' ELSE 'Contact ' END||n,'person-'||n||'@capacity.test','person-'||n||'@capacity.test','contactable','${now}','${now}' FROM numbers`);
 await populate('opportunities',25000,c=>`${c} INSERT INTO opportunities(id,title,lifecycle,stage_id,value_cents,score,band,queue_state,created_at,updated_at) SELECT printf('%026d',n),'Opportunity '||n,'open','${stage}',10000,0,'low','none','${now}','${now}' FROM numbers`);
 await db.prepare("INSERT INTO signal_sources(id,name,type,enabled,created_at,updated_at) VALUES('capacity','Capacity test','operator_attested',1,?,?)").bind(now,now).run();
 await populate('signals',1000000,c=>`${c} INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at) SELECT printf('%026d',n),'capacity',CAST(n AS TEXT),'meeting.booked','Capacity signal','${now}','${now}','capacity-test-fixture','observed','test record ID','${now}' FROM numbers`);
 await populate('signal links',1000000,c=>`${c} INSERT INTO signal_links SELECT printf('%026d',n),'opportunity',printf('%026d',1+(n%25000)),'test record ID','${now}' FROM numbers`);
 await populate('timeline activities',2000000,c=>`${c} INSERT INTO timeline_entries SELECT printf('%026d',n),'manual.note','${now}','${now}','operator','${actor}','test',json_object('text',CASE WHEN n>1999900 THEN 'Timelineneedle ' ELSE 'Historical activity ' END||n) FROM numbers`);
 await populate('timeline links',2000000,c=>`${c} INSERT INTO timeline_entry_records SELECT printf('%026d',n),'contact',printf('%026d',1+(n%100000)) FROM numbers`);
 await db.prepare("DELETE FROM runtime_controls WHERE name='restore'").run();
 const session=await deps.auth.createSession(actor),port=Number(process.env.RECORD_CAPACITY_PORT??await availablePort()),origin=`http://127.0.0.1:${port}`;
 await db.prepare("INSERT INTO ai_calls(id,operator_id,provider,model,feature,input_tokens,output_tokens,cached_input_tokens,estimated_cost,duration_ms,status,created_at) VALUES('capacity-ai',?,'openai','capacity-model','draft',9876,5432,1234,0.987,321,'success',?)").bind(actor,now).run();
 await fixture.close();
 async function startWorker(){worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config',observation!.configPath,'--local','--persist-to',fixture.directory,'--port',String(port),'--inspector-port','0',...identityVarArgs(origin)],{stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1'}});
 observation!.attach(worker,'source',line=>{logs=(logs+line+'\n').slice(-65536);});
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/health')).ok)break;}catch{}if(i===99)throw new Error(logs);await new Promise(resolve=>setTimeout(resolve,100));}
 }
 async function stopWorker(){if(worker){await observation!.stop(worker);worker=undefined;}}
 await startWorker();
 const paths=['contact?q=Capacityneedle','contact?q=Timelineneedle','contact','company','opportunity?lifecycle=open&band=low&queue_state=none'];const evidence:Record<string,unknown>={counts:{contacts:100000,companies:25000,openOpportunities:25000,signals:1000000,timelineActivities:2000000},runtime:'local emitted Cloudflare Worker with real D1',measurements:{}};
 for(const path of paths){const samples:number[]=[];for(let i=0;i<30;i++){const started=performance.now(),response=await fetch(origin+'/api/v1/records/'+path,{headers:{cookie:`${sessionCookieName}=${session.token}`}}),body=await response.json() as {records:unknown[]};samples.push(performance.now()-started);assert.equal(response.status,200);assert.equal(body.records.length,50);}samples.sort((a,b)=>a-b);const p95=samples[Math.ceil(samples.length*.95)-1];(evidence.measurements as any)[path]={samples:samples.length,p95Ms:p95,maxMs:samples.at(-1)};assert.ok(p95<500,`${path} p95 ${p95.toFixed(1)}ms exceeds 500ms`);}
 evidence.archive=await verifyArchiveCapacity(origin,`${sessionCookieName}=${session.token}`,async read=>{await stopWorker();await fixture.reopen();try{return await read(fixture.db);}finally{await fixture.close();await startWorker();}},actor,observation);
 assert.equal((await fetch(origin+'/health')).status,200);
 const eraseStarted=performance.now(),eraseResponse=await fetch(origin+'/api/v1/records/contact/00000000000000000000100000',{method:'DELETE',headers:{cookie:`${sessionCookieName}=${session.token}`,origin,'content-type':'application/json'},body:JSON.stringify({confirmed:true})});assert.equal(eraseResponse.status,200,await eraseResponse.text());const eraseMs=performance.now()-eraseStarted;assert.ok(eraseMs<300000,'Contact erasure exceeded five minutes');assert.equal((await fetch(origin+'/api/v1/records/contact/00000000000000000000100000',{headers:{cookie:`${sessionCookieName}=${session.token}`}})).status,404);evidence.contactErasure={milliseconds:eraseMs,absentOnNextRead:true};
 await stopWorker();
 evidence.nativeD1=await observation.verify();
 await mkdir('verification',{recursive:true});await writeFile('verification/records-capacity.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
}catch(error){console.error(logs.slice(-12000));throw error;}finally{try{await observation?.dispose();}finally{await fixture.dispose(process.env.ARCHIVE_CAPACITY_KEEP_STATE==='1');}}
