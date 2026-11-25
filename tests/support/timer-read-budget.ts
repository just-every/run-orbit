import assert from 'node:assert/strict';
import {Hono} from 'hono';
import {rowMeter} from './row-meter';
import {runHostedTimers,runRequestTimers} from '../../src/core/features/outreach/scheduler';
import {sweepArchiveTrash} from '../../src/core/features/records/archive-erasure';
import {dispatchSalesTaskReminders} from '../../src/core/features/tasks';
import {processWorkflows} from '../../src/core/features/workflows/engine';
import {processSlack} from '../../src/core/features/slack/delivery';
import {processMailchimpDeletions} from '../../src/core/features/marketing/deletions';
import {pollProviders} from '../../src/core/features/capture/providers/service';
import {createNotificationRoutes} from '../../src/core/features/notifications/routes';
import type {AuthenticatedOperator} from '../../src/core/features/identity';

// Cloudflare Workers Free gives a whole account 5 million D1 row reads a day, shared by every tool on it.
// A small company's Orbit runs the Cron every minute (1,440 runs) and an inbox tab polls while it is open,
// so each run and poll must read a flat number of rows however many deals, entries and notifications
// thirty days of use leave behind. Ceilings are generous; the point is that history cannot move them.
const dealCount=200,entryCount=6000,notificationCount=1000,day=86400000;

async function seed(db:D1Database,operatorId:string,deals:number,entries:number,notifications:number,offset=0){
 const now=Date.now(),at=(ago:number)=>new Date(now-ago).toISOString();
 // Open deals created thirty days ago whose timelines keep growing to today, and a tenth that went quiet.
 await db.prepare(`WITH RECURSIVE s(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<?1) INSERT INTO opportunities(id,title,lifecycle,stage_id,value_cents,score,band,queue_state,created_at,updated_at)
  SELECT 'budget-deal-'||CAST(?2+i AS INTEGER),'Deal '||CAST(?2+i AS INTEGER),'open','budget-stage',100000,50,'medium','none',?3,?3 FROM s`).bind(deals,offset,at(30*day)).run();
 for(let from=0;from<entries;from+=2000){
  const count=Math.min(2000,entries-from),last=from+count-1;
  await db.prepare(`WITH RECURSIVE s(i) AS (SELECT ?1 UNION ALL SELECT i+1 FROM s WHERE i<?2) INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json)
   SELECT 'budget-entry-'||CAST(?3+i AS INTEGER),'note.added',strftime('%Y-%m-%dT%H:%M:%fZ',(?4-(?5-i)*?6/?5)/1000.0,'unixepoch'),?7,'system',NULL,'test','{}' FROM s`).bind(from,last,offset,now,entries,30*day,at(0)).run();
  await db.prepare(`WITH RECURSIVE s(i) AS (SELECT ?1 UNION ALL SELECT i+1 FROM s WHERE i<?2) INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id)
   SELECT 'budget-entry-'||CAST(?3+i AS INTEGER),'opportunity','budget-deal-'||CAST(?3+1+(i%?4) AS INTEGER) FROM s`).bind(from,last,offset,Math.max(1,Math.floor(deals*0.9))).run();
 }
 await db.prepare(`WITH RECURSIVE s(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<?1) INSERT INTO notifications(id,operator_id,opportunity_id,event_key,kind,message,created_at,read_at)
  SELECT 'budget-note-'||CAST(?2+i AS INTEGER),?6,NULL,'budget-key-'||CAST(?2+i AS INTEGER),'form.submitted','New enquiry',strftime('%Y-%m-%dT%H:%M:%fZ',(?3-i*?4/?1)/1000.0,'unixepoch'),CASE WHEN i%5=0 THEN NULL ELSE ?5 END FROM s`).bind(notifications,offset,now,30*day,at(0),operatorId).run();
}

/** Seeds thirty days of history on an installation, then proves the minute Cron, a request-driven timer and the inbox poll stay flat. */
export async function proveTimerReadBudget(raw:D1Database,operatorId:string){
  await raw.prepare("INSERT INTO pipeline_stages(id,name,position,created_at,updated_at) VALUES('budget-stage','Budget stage',9999,?1,?1)").bind(new Date().toISOString()).run();
  await seed(raw,operatorId,dealCount,entryCount,notificationCount);
  const meter=rowMeter(raw),db=meter.db;
  const mail={send:async()=>{throw new Error('no message is due');}};
  const minute=async()=>{
   await runHostedTimers(db,mail);await sweepArchiveTrash(db);await dispatchSalesTaskReminders(db);await processWorkflows(db);
   await processMailchimpDeletions(db,{security:undefined,origin:'https://orbit.test'});await processSlack(db,{security:undefined,origin:'https://orbit.test'});await pollProviders(db,undefined);
  };
  // The first run lets the quiet deals reach NOW and claims the hourly archive slot; later runs are the steady state.
  const quiet=await raw.prepare("SELECT count(*) AS n FROM opportunities WHERE id LIKE 'budget-deal-%' AND queue_state='none' AND id NOT IN(SELECT record_id FROM timeline_entry_records WHERE timeline_entry_id IN(SELECT id FROM timeline_entries WHERE occurred_at>?))").bind(new Date(Date.now()-14*day).toISOString()).first<{n:number}>('n');
  await minute();
  const reached=await raw.prepare("SELECT count(*) AS n FROM opportunities WHERE id LIKE 'budget-deal-%' AND queue_state='now'").first<{n:number}>('n');
  assert.equal(reached,quiet,'every deal quiet for the stale interval reaches NOW, and no other');
  assert.ok(quiet!>0&&quiet!<dealCount,'the seeded history has both quiet and active deals');
  meter.reset();await minute();
  const steady=meter.reads;
  assert.ok(steady<=300,`a steady minute reads ${steady} rows`);
  meter.reset();await runRequestTimers(db,mail);assert.ok(meter.reads<=300,`a request-driven timer reads ${meter.reads} rows`);

  // Editing or removing history changes staleness exactly as reading every timeline did.
  const stale=async(id:string)=>raw.prepare('SELECT queue_state,queue_reason FROM opportunities WHERE id=?').bind(id).first<{queue_state:string;queue_reason:string|null}>();
  assert.equal((await stale('budget-deal-1'))?.queue_state,'none');assert.equal((await stale('budget-deal-2'))?.queue_state,'none');
  await raw.prepare("DELETE FROM timeline_entries WHERE id IN(SELECT timeline_entry_id FROM timeline_entry_records WHERE record_id='budget-deal-1')").run();
  await raw.prepare("UPDATE timeline_entries SET occurred_at=? WHERE id IN(SELECT timeline_entry_id FROM timeline_entry_records WHERE record_id='budget-deal-2')").bind(new Date(Date.now()-20*day).toISOString()).run();
  await minute();
  assert.deepEqual(await stale('budget-deal-1'),{queue_state:'now',queue_reason:'Opportunity became stale'},'a deal whose entries were deleted is stale from its creation');
  assert.deepEqual(await stale('budget-deal-2'),{queue_state:'now',queue_reason:'Opportunity became stale'},'a deal whose entries were backdated is stale');
  assert.equal((await stale('budget-deal-3'))?.queue_state,'none','a deal with recent entries stays out of NOW');

  // Doubling the history leaves the Cron where it was.
  await seed(raw,operatorId,dealCount,entryCount,notificationCount,10000);
  await minute();meter.reset();await minute();
  const steadyAfter=meter.reads;assert.ok(steadyAfter<=steady+30,`doubling history moved the minute Cron from ${steady} to ${steadyAfter} rows`);

  // The inbox: the list is bounded, and an unchanged poll costs a few rows.
  const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
  app.use('*',async(c,next)=>{c.set('operator',{operatorId} as AuthenticatedOperator);await next();});
  app.route('/',createNotificationRoutes(db,{}));
  meter.reset();const listed=await app.request('/');const body=await listed.json() as {notifications:unknown[];unread:number};
  const tag=listed.headers.get('ETag');
  const listReads=meter.reads;
  assert.equal(listed.status,200);assert.equal(body.notifications.length,100);assert.ok(tag);assert.ok(meter.reads<=1500,`the inbox list reads ${meter.reads} rows`);
  meter.reset();const unchanged=await app.request('/',{headers:{'If-None-Match':tag!}});
  const pollReads=meter.reads;assert.equal(unchanged.status,304);assert.ok(pollReads<=20,`an unchanged inbox poll reads ${pollReads} rows`);
  await raw.prepare("UPDATE notifications SET read_at=? WHERE id='budget-note-5'").bind(new Date(Date.now()+1000).toISOString()).run();
  const changed=await app.request('/',{headers:{'If-None-Match':tag!}});
  assert.equal(changed.status,200,'reading a notification changes what the poll returns');
  console.log(`D1 read budget: minute Cron ${steady} rows with ${dealCount} deals and ${entryCount} entries (${steadyAfter} after the history doubled), inbox list ${listReads} rows, unchanged inbox poll ${pollReads} rows`);
}
