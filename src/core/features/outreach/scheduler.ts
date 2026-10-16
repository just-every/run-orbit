import type { OutboundMail } from '../../platform/outbound-mail';
import { runOrbitTimers } from './timing-repository';

export async function schedulerStatus(db:D1Database,now=new Date()){
 const row=await db.prepare("SELECT value FROM runtime_controls WHERE name='outreach_timer'").first<{value:string}>();
 const status=row?JSON.parse(row.value) as {startedAt:string;completedAt?:string;failed?:boolean}:null;
 return {ready:Boolean(status?.completedAt&&!status.failed&&now.getTime()-Date.parse(status.completedAt)<120000),lastRunAt:status?.completedAt??null,failed:status?.failed??false};
}

// A shared lease bounds activity across isolates. Item claims in dispatchDue
// remain the authority for sending, including a request racing the Cron.
export async function runRequestTimers(db:D1Database,mail?:OutboundMail){
 const at=Date.now();
 const claim=await db.prepare(`INSERT INTO runtime_controls(name,value) VALUES('outreach_request',?)
  ON CONFLICT(name) DO UPDATE SET value=excluded.value
  WHERE json_extract(runtime_controls.value,'$.at')<=?-CASE WHEN json_extract(runtime_controls.value,'$.running')=1 THEN 30000 ELSE 5000 END RETURNING name`)
  .bind(JSON.stringify({at,running:true}),at).first<{name:string}>();
 if(!claim)return;
 try{await runOrbitTimers(db,mail,new Date(),{mail:1,evaluations:1,transitions:50});}
 finally{await db.prepare("UPDATE runtime_controls SET value=? WHERE name='outreach_request' AND json_extract(value,'$.at')=?").bind(JSON.stringify({at:Date.now(),running:false}),at).run();}
}

// Installation-local health never travels with customer archives. Only the
// hosted scheduled handler writes it, so HTTP reads cannot pretend it ran.
export async function runHostedTimers(db:D1Database,mail?:OutboundMail){
 const startedAt=new Date().toISOString();
 const save=(value:unknown)=>db.prepare("INSERT INTO runtime_controls(name,value) VALUES('outreach_timer',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(JSON.stringify(value)).run();
 const previous=await schedulerStatus(db);
 await save({startedAt,...previous.lastRunAt?{completedAt:previous.lastRunAt}:{}});
 try{await runOrbitTimers(db,mail);await save({startedAt,completedAt:new Date().toISOString()});}
 catch(error){await save({startedAt,failed:true});throw error;}
}
