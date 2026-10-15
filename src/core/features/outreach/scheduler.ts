import type { OutboundMail } from '../../platform/outbound-mail';
import { WorkbenchError } from '../workbench/repository';
import { runOrbitTimers } from './timing-repository';

export async function schedulerStatus(db:D1Database,now=new Date()){
 const row=await db.prepare("SELECT value FROM runtime_controls WHERE name='outreach_timer'").first<{value:string}>();
 const status=row?JSON.parse(row.value) as {startedAt:string;completedAt?:string;failed?:boolean}:null;
 return {ready:Boolean(status?.completedAt&&!status.failed&&now.getTime()-Date.parse(status.completedAt)<120000),lastRunAt:status?.completedAt??null,failed:status?.failed??false};
}

export async function requireScheduler(db:D1Database){
 const status=await schedulerStatus(db);
 if(status.failed)throw new WorkbenchError(409,'The hosted minute timer failed. No schedule was saved. Check the deployment’s Worker errors, then review the schedule again once the timer resumes.');
 if(!status.ready)throw new WorkbenchError(409,status.lastRunAt?'The hosted minute timer is overdue. No schedule was saved. Try reviewing the schedule again once the timer resumes.':'The hosted minute timer has not started yet. No schedule was saved. New Cloudflare timers can take several minutes to activate; try reviewing the schedule again shortly.');
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
