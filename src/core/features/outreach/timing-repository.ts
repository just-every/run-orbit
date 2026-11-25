import {dispatchObligationReminders} from '../obligations/effects';
import {recordMailDatabase} from './record-mail-storage';
import {archiveImportActive} from '../../platform/archive-maintenance';
import { createId } from '../../shared/ids';
import { processEvaluationJobs } from '../workbench/evaluation-repository';
import { OutreachService } from './service';
import type { OutboundMail } from '../../platform/outbound-mail';
export async function runOrbitTimers(db:D1Database,mail?:OutboundMail,now=new Date(),limits={mail:50,evaluations:100,transitions:-1}){
 if(await archiveImportActive(db))return;
 await processEvaluationJobs(db,limits.evaluations);
 await dispatchObligationReminders(db,now.toISOString());
 const at=now.toISOString();
 const run=createId(),prefix=`${run}:`;
 // Select and publish every due transition in one transaction. The timeline is
 // the durable selected set, so inserting it cannot invalidate the stale test
 // before the corresponding opportunity update runs.
 // Select and publish every due transition in one transaction. The timeline is
 // the durable selected set, so inserting it cannot invalidate the stale test
 // before the corresponding opportunity update runs. Candidates come from
 // indexes over what is due, and idleness from opportunity_activity, so a run
 // reads the same few rows however many deals and timeline entries exist.
 await db.batch([
  db.prepare("UPDATE opportunity_activity SET entry_at=(SELECT MAX(t.occurred_at) FROM timeline_entry_records r JOIN timeline_entries t ON t.id=r.timeline_entry_id WHERE r.record_type='opportunity' AND r.record_id=opportunity_activity.opportunity_id),dirty=0 WHERE dirty=1"),
  db.prepare(`INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json)
   SELECT ?||o.id,'queue.now',?,?,'feature',NULL,'timer',json_object('opportunityId',o.id,'reason',CASE WHEN o.expected_close_at<=? THEN 'Expected close date passed' WHEN o.next_due_at<=? THEN 'Awaiting-response interval elapsed' ELSE 'Opportunity became stale' END)
   FROM (SELECT DISTINCT id FROM (
    SELECT id FROM opportunities INDEXED BY opportunities_close_due_idx WHERE lifecycle='open' AND queue_state<>'now' AND expected_close_at<=?
    UNION ALL SELECT id FROM opportunities INDEXED BY opportunities_next_due_idx WHERE lifecycle='open' AND queue_state='next' AND next_due_at<=?
    UNION ALL SELECT opportunity_id FROM opportunity_activity INDEXED BY opportunity_activity_idle_idx WHERE idle=1 AND julianday(COALESCE(entry_at,created_at))<julianday(?)-(SELECT MIN(days) FROM (SELECT stale_interval_days AS days FROM workspace_settings UNION ALL SELECT stale_interval_days FROM pipeline_stage_rules))
   )) c CROSS JOIN opportunities o ON o.id=c.id CROSS JOIN workspace_settings w LEFT JOIN pipeline_stage_rules r ON r.stage_id=o.stage_id LEFT JOIN opportunity_activity a ON a.opportunity_id=o.id
   WHERE o.lifecycle='open' AND o.queue_state<>'now'
   AND (o.expected_close_at<=? OR (o.queue_state='next' AND o.next_due_at<=? AND NOT EXISTS(SELECT 1 FROM (SELECT opportunity_id,state FROM outbound_messages UNION ALL SELECT opportunity_id,state FROM record_mail_outbound_messages) m WHERE m.opportunity_id=o.id AND m.state='scheduled'))
   OR (o.queue_state<>'next' AND julianday(COALESCE(a.entry_at,o.created_at))<julianday(?)-COALESCE(r.stale_interval_days,w.stale_interval_days))) ORDER BY o.updated_at LIMIT ?`)
   .bind(prefix,at,at,at,at,at,at,at,at,at,at,limits.transitions),
  db.prepare("INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) SELECT id,'opportunity',json_extract(payload_json,'$.opportunityId') FROM timeline_entries WHERE id>=? AND id<?")
   .bind(prefix,`${run};`),
  db.prepare("UPDATE opportunities SET queue_state='now',queue_reason=(SELECT json_extract(t.payload_json,'$.reason') FROM timeline_entries t WHERE t.id=?||opportunities.id),next_due_at=NULL,updated_at=? WHERE id IN(SELECT json_extract(payload_json,'$.opportunityId') FROM timeline_entries WHERE id>=? AND id<?) AND lifecycle='open' AND queue_state<>'now'")
   .bind(prefix,at,prefix,`${run};`)
 ]);
 if(mail){const service=new OutreachService(db,mail);await service.dispatchDue(now,limits.mail);await service.reconcile(now,limits.mail);const recordService=new OutreachService(recordMailDatabase(db),mail);await recordService.dispatchDue(now,limits.mail);await recordService.reconcile(now,limits.mail);}
}
