/** SEQUENCE-002 outcome measures for one deal's outreach: each counted separately, and a reported open never counts as success. */
export interface FollowUpOutcomes {firstAcceptedAt:string|null;accepted:number;delivered:number;humanReplies:number;meetingsBooked:number;stageAdvances:number;lifecycle:string;closedAt:string|null;inferredReports:number;automaticReplies:number}
const linked=`FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id WHERE r.record_type='opportunity' AND r.record_id=?1`;
const signals=`FROM signals s JOIN signal_links l ON l.signal_id=s.id AND l.record_type='opportunity' AND l.record_id=?1`;
export async function followUpOutcomes(db:D1Database,opportunityId:string):Promise<FollowUpOutcomes>{
 const row=await db.prepare(`WITH first AS (SELECT MIN(t.occurred_at) AS at ${linked} AND t.kind='message.accepted')
  SELECT (SELECT at FROM first) AS firstAcceptedAt,
   (SELECT COUNT(DISTINCT json_extract(t.payload_json,'$.messageId')) ${linked} AND t.kind='message.accepted') AS accepted,
   (SELECT COUNT(DISTINCT json_extract(t.payload_json,'$.messageId')) ${linked} AND t.kind='provider.delivered') AS delivered,
   (SELECT COUNT(*) ${signals} WHERE s.type='email.replied' AND s.occurred_at>=(SELECT at FROM first)) AS humanReplies,
   (SELECT COUNT(*) ${signals} WHERE s.type='meeting.booked' AND s.occurred_at>=(SELECT at FROM first)) AS meetingsBooked,
   (SELECT COUNT(*) ${signals} WHERE s.type LIKE '%:email.auto_replied' AND s.occurred_at>=(SELECT at FROM first)) AS automaticReplies,
   (SELECT COUNT(*) ${linked} AND t.kind IN('provider.open','provider.click') AND t.occurred_at>=(SELECT at FROM first))
    +(SELECT COUNT(*) ${signals} WHERE s.type IN('email.opened','page.viewed') AND s.occurred_at>=(SELECT at FROM first)) AS inferredReports,
   (SELECT COUNT(*) ${linked} AND t.kind='stage.changed' AND t.occurred_at>=(SELECT at FROM first)
     AND COALESCE(json_extract(t.payload_json,'$.previousPipelineId'),'')=COALESCE(json_extract(t.payload_json,'$.currentPipelineId'),'')
     AND (SELECT position FROM pipeline_stages WHERE id=json_extract(t.payload_json,'$.current'))>(SELECT position FROM pipeline_stages WHERE id=json_extract(t.payload_json,'$.previous'))) AS stageAdvances,
   o.lifecycle,CASE WHEN o.closed_at>=(SELECT at FROM first) THEN o.closed_at END AS closedAt
  FROM opportunities o WHERE o.id=?1`).bind(opportunityId).first<FollowUpOutcomes>();
 if(!row)throw new Error('Opportunity not found.');
 return row;
}
