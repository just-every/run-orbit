/** All checklist facts are read from this installation; no progress flag grants authority. */
export async function onboardingState(db:D1Database,mailConfigured:boolean,aiConfigured:boolean){
 const state=await db.prepare(`SELECT
 EXISTS(SELECT 1 FROM audit_entries WHERE action='mail.sender_test' AND json_extract(details_json,'$.state')='received') AS mailChecked,
 EXISTS(SELECT 1 FROM contacts c JOIN companies co ON co.id=c.company_id) AS customer,
 (EXISTS(SELECT 1 FROM contacts) OR EXISTS(SELECT 1 FROM companies) OR EXISTS(SELECT 1 FROM opportunities)) AS records,
 EXISTS(SELECT 1 FROM signal_sources WHERE enabled=1 AND type='signed_webhook' AND secret_ciphertext IS NOT NULL) AS source,
 EXISTS(SELECT 1 FROM signals WHERE json_valid(payload_json) AND json_extract(payload_json,'$.data.test')=1) AS test,
 EXISTS(SELECT 1 FROM drafts) AS draft,
 EXISTS(SELECT 1 FROM outbound_messages WHERE state IN('accepted','delivered','opened','replied')) AS sent,
 (SELECT id FROM opportunities WHERE lifecycle='open' ORDER BY created_at DESC,id DESC LIMIT 1) AS opportunityId,
 (SELECT d.id FROM drafts d JOIN opportunities o ON o.id=d.opportunity_id
  WHERE o.lifecycle='open' AND NOT EXISTS(SELECT 1 FROM outbound_messages m WHERE m.draft_id=d.id AND m.revision=d.revision)
  ORDER BY d.is_stale ASC,d.updated_at DESC,d.id DESC LIMIT 1) AS draftId`).first<{mailChecked:number;customer:number;records:number;source:number;test:number;draft:number;sent:number;opportunityId:string|null;draftId:string|null}>();
 return {mailConfigured,aiConfigured,...state};
}
