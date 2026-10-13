import { WorkbenchError } from '../workbench/repository';
import {outreachInstructions as instructions} from "../../app/mounts/assistance";
export async function buildPreview(db:D1Database,opportunityId:string,contactId:string|undefined,feature:'draft'|'explanation') {
 const opportunity=await db.prepare('SELECT id,title,lifecycle,stage_id,owner_id,value_cents,expected_close_at,score,band,updated_at FROM opportunities WHERE id=?').bind(opportunityId).first();
 if(!opportunity||opportunity.lifecycle!=='open')throw new WorkbenchError(404,'Open opportunity not found.');
 const recommendation=await db.prepare('SELECT id,action_type,policy_version FROM recommendations WHERE opportunity_id=? AND is_current=1').bind(opportunityId).first<{id:string;action_type:string;policy_version:string}>();
 if(!recommendation)throw new WorkbenchError(409,'This opportunity has no current recommendation.');
 const contact=contactId?await db.prepare('SELECT c.* FROM contacts c JOIN opportunity_contacts oc ON oc.contact_id=c.id WHERE oc.opportunity_id=? AND c.id=?').bind(opportunityId,contactId).first():await db.prepare('SELECT c.* FROM contacts c JOIN opportunity_contacts oc ON oc.contact_id=c.id WHERE oc.opportunity_id=? AND oc.is_primary=1').bind(opportunityId).first();
 if(feature==='draft'&&(!contact||contact.contactability!=='contactable'||!contact.email))throw new WorkbenchError(409,'Choose a contactable linked recipient with an email.');
 const [company,evidence,messages,replies,workspace]=await Promise.all([
  contact?.company_id?db.prepare('SELECT id,name,primary_domain FROM companies WHERE id=?').bind(contact.company_id).first():null,
  db.prepare('SELECT s.id,s.type,s.subject,s.occurred_at,s.confidence,s.source_id FROM signals s JOIN recommendation_evidence e ON e.signal_id=s.id WHERE e.recommendation_id=? ORDER BY s.id').bind(recommendation.id).all(),
  contact?db.prepare('SELECT m.subject,m.body,m.state,m.created_at FROM outbound_messages m JOIN drafts d ON d.id=m.draft_id WHERE d.recipient_contact_id=? ORDER BY m.created_at,m.id').bind(contact.id).all():{results:[]},
  contact?db.prepare("SELECT s.id,s.subject,s.occurred_at,s.source_id FROM signals s JOIN signal_links l ON l.signal_id=s.id WHERE l.record_type='contact' AND l.record_id=? AND s.type='email.replied' ORDER BY s.occurred_at,s.id").bind(contact.id).all():{results:[]},
  db.prepare('SELECT name,currency FROM workspace_settings LIMIT 1').first()
 ]);
 return {instructions,feature,workspace,opportunity,recommendation,contact,company,evidence:evidence.results,messages:messages.results,replies:replies.results};
}
