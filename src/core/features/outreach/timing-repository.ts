import {archiveImportActive} from '../../platform/archive-maintenance';
import { createId } from '../../shared/ids';
import { processEvaluationJobs } from '../workbench/evaluation-repository';
import { OutreachService } from './service';
import type { OutboundMail } from '../../platform/outbound-mail';
export async function runOrbitTimers(db:D1Database,mail?:OutboundMail,now=new Date(),limits={mail:50,evaluations:100,transitions:-1}){
 if(await archiveImportActive(db))return;
 await processEvaluationJobs(db,limits.evaluations);
 const at=now.toISOString();
 const run=createId(),prefix=`${run}:`;
 // Select and publish every due transition in one transaction. The timeline is
 // the durable selected set, so inserting it cannot invalidate the stale test
 // before the corresponding opportunity update runs.
 await db.batch([
  db.prepare(`INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json)
   SELECT ?||o.id,'queue.now',?,?,'feature',NULL,'timer',json_object('opportunityId',o.id,'reason',CASE WHEN o.expected_close_at<=? THEN 'Expected close date passed' WHEN o.next_due_at<=? THEN 'Awaiting-response interval elapsed' ELSE 'Opportunity became stale' END)
   FROM opportunities o CROSS JOIN workspace_settings w WHERE o.lifecycle='open' AND o.queue_state<>'now'
   AND (o.expected_close_at<=? OR (o.queue_state='next' AND o.next_due_at<=? AND NOT EXISTS(SELECT 1 FROM outbound_messages m WHERE m.opportunity_id=o.id AND m.state='scheduled'))
   OR (o.queue_state<>'next' AND julianday(COALESCE((SELECT MAX(t.occurred_at) FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=o.id),o.created_at))<julianday(?)-w.stale_interval_days)) ORDER BY o.updated_at LIMIT ?`)
   .bind(prefix,at,at,at,at,at,at,at,limits.transitions),
  db.prepare("INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) SELECT id,'opportunity',json_extract(payload_json,'$.opportunityId') FROM timeline_entries WHERE id>=? AND id<?")
   .bind(prefix,`${run};`),
  db.prepare("UPDATE opportunities SET queue_state='now',queue_reason=(SELECT json_extract(t.payload_json,'$.reason') FROM timeline_entries t WHERE t.id=?||opportunities.id),next_due_at=NULL,updated_at=? WHERE lifecycle='open' AND queue_state<>'now' AND EXISTS(SELECT 1 FROM timeline_entries t WHERE t.id=?||opportunities.id)")
   .bind(prefix,at,prefix)
 ]);
 if(mail){const service=new OutreachService(db,mail);await service.dispatchDue(now,limits.mail);await service.reconcile(now,limits.mail);}
}
