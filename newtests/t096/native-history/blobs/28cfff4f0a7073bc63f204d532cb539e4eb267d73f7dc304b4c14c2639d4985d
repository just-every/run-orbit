import { createId } from '../../shared/ids';
import { WorkbenchError } from '../workbench/repository';
export async function confirmDraftReview(db:D1Database,id:string,actor:string,input:{revision:number;reviewedUpdatedAt:string;recipientContactId:string;recipientEmail:string;subject:string;body:string}){
 const at=new Date().toISOString(),entry=createId();
 const result=await db.batch([
  db.prepare(`UPDATE drafts SET recipient_contact_id=?,recipient_email=?,subject=?,body=?,revision=revision+1,is_stale=0,stale_reason=NULL,recommendation_id=(SELECT id FROM recommendations WHERE opportunity_id=drafts.opportunity_id AND is_current=1),updated_at=? WHERE id=? AND revision=? AND updated_at=? AND is_stale=1 AND EXISTS(SELECT 1 FROM contacts c JOIN opportunity_contacts oc ON oc.contact_id=c.id JOIN opportunities o ON o.id=oc.opportunity_id WHERE c.id=? AND oc.opportunity_id=drafts.opportunity_id AND c.contactability='contactable' AND lower(trim(c.email))=lower(trim(?)) AND o.lifecycle='open')`).bind(input.recipientContactId,input.recipientEmail.trim().toLowerCase(),input.subject,input.body,at,id,input.revision,input.reviewedUpdatedAt,input.recipientContactId,input.recipientEmail),
  db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) SELECT ?,'draft.reviewed',?,?,'operator',?,'outreach',? WHERE EXISTS(SELECT 1 FROM drafts WHERE id=? AND revision=? AND updated_at=?)").bind(entry,at,at,actor,JSON.stringify({draftId:id,reviewedUpdatedAt:input.reviewedUpdatedAt}),id,input.revision+1,at),
  db.prepare("INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) SELECT ?,'opportunity',opportunity_id FROM drafts WHERE id=? AND revision=? AND updated_at=?").bind(entry,id,input.revision+1,at)
 ]);if(result[0]!.meta.changes!==1)throw new WorkbenchError(409,'The draft or recipient changed again, or this contact must not be contacted. Reload before confirming.');
 return {reviewed:true,revision:input.revision+1};
}
