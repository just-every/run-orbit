import {forecastErasureStatements} from '../forecast/privacy';
import {formAbuseErasure} from './form-abuse-erasure';
import {taskContactErasure} from '../tasks/privacy';
import {erasedMentions} from './mentions';
import {captureImportErasure,withdrawRelatedImportCopies,eraseImportedContact} from '../imports/erasure';
import {captureErasureStatements as capturePrivacyErasureStatements} from '../capture/privacy';
import {retainedEvidenceIdentityMatch,retainedEvidenceIdentityPatterns} from '../capture/privacy-evidence';
import { privacyMatcher, suppressionProof } from './suppression';
import { identityMatch, identityPatterns } from './erasure-identity';
import { executeArchiveErasure } from './archive-erasure';
import { captureErasureStatements } from './capture-erasure';
import { capturedValueErasureStatements } from './capture-value-erasure';
import { evaluationStatements } from '../workbench/evaluation-repository';
import { createId } from '../../shared/ids';
import { audit, RecordError, requireRecord, type RecordKind } from './shared';
import {relationshipContactErasure} from '../relationships/erasure';
import {messageContactErasure} from '../drafts/privacy';
export class DataRepository {
 constructor(readonly db:D1Database){}
 async remove(kind:RecordKind,id:string,actor:string,sessionId?:string){const capture=captureImportErasure(this.db),db=capture.db;const record=await requireRecord(db,kind,id);const statements:D1PreparedStatement[]=[];let contactEmails:string[]=[];
  statements.push(...forecastErasureStatements(db,kind,id,typeof record.email==='string'?[record.email]:[]));
  if(kind==='company')statements.push(db.prepare('DELETE FROM companies WHERE id=?').bind(id));
  if(kind==='opportunity'){
   // Preserve provider-accepted content as durable customer activities before removing opportunity FKs.
   const messages=(await db.prepare("SELECT * FROM outbound_messages WHERE opportunity_id=? AND state IN ('accepted','delivered','bounced','delivery-unknown')").bind(id).all<Record<string,any>>()).results;
   for(const message of messages){const entry=createId();statements.push(db.prepare("INSERT INTO timeline_entries VALUES(?,'outbound.archived',?,?,'operator',?,'mail',?)").bind(entry,message.created_at,new Date().toISOString(),message.operator_id,JSON.stringify(message)));if(message.contact_id)statements.push(db.prepare("INSERT INTO timeline_entry_records VALUES(?,'contact',?)").bind(entry,message.contact_id));if(record.company_id)statements.push(db.prepare("INSERT INTO timeline_entry_records VALUES(?,'company',?)").bind(entry,record.company_id));}

   statements.push(db.prepare('UPDATE ai_calls SET error=NULL WHERE opportunity_id=?').bind(id),db.prepare("INSERT OR IGNORE INTO timeline_entry_records SELECT r.timeline_entry_id,'contact',oc.contact_id FROM timeline_entry_records r JOIN opportunity_contacts oc ON oc.opportunity_id=r.record_id JOIN timeline_entries t ON t.id=r.timeline_entry_id WHERE r.record_type='opportunity' AND r.record_id=? AND t.kind LIKE '%accepted%'").bind(id),db.prepare('DELETE FROM outbound_messages WHERE opportunity_id=?').bind(id),db.prepare('DELETE FROM evaluation_job_runs WHERE opportunity_id=?').bind(id),db.prepare('DELETE FROM action_completions WHERE recommendation_id IN(SELECT id FROM recommendations WHERE opportunity_id=?)').bind(id),db.prepare('DELETE FROM ai_previews WHERE opportunity_id=?').bind(id),db.prepare('DELETE FROM notifications WHERE opportunity_id=?').bind(id),db.prepare('DELETE FROM opportunities WHERE id=?').bind(id));
  }
  if(kind==='contact'){
   const affected=(await db.prepare('SELECT opportunity_id FROM opportunity_contacts WHERE contact_id=?').bind(id).all<{opportunity_id:string}>()).results;
   // Remove every signal carrying this contact, including copies linked to other records.
   const signalIds="SELECT signal_id FROM record_erasure_signals WHERE contact_id=?";
   const aliases=(await db.prepare("SELECT identity_key FROM record_aliases WHERE record_type='contact' AND survivor_id=?").bind(id).all<{identity_key:string}>()).results.map(row=>row.identity_key);
   const identities=[...new Set([record.email,...aliases].filter((value):value is string=>typeof value==='string'&&value.length>0))];
   contactEmails=identities;
   statements.push(...messageContactErasure(db,identities));
   statements.push(...formAbuseErasure(db,identities));
   statements.push(...taskContactErasure(db,id,identities));
   statements.push(...relationshipContactErasure(db,id,identities));
   statements.push(...await capturedValueErasureStatements(db,id,identities));
   const match=identities.length?await privacyMatcher(db,statements):undefined;
   if(match)for(const email of identities)for(const token of await match(email))statements.push(suppressionProof(db,token,"EXISTS(SELECT 1 FROM contacts WHERE id=? AND contactability='do_not_contact')",[id]));
   statements.push(db.prepare("INSERT OR IGNORE INTO record_erasure_signals SELECT ?,signal_id FROM signal_links WHERE record_type='contact' AND record_id=?").bind(id,id));
   // A mailbox may appear only in a retained proposal excerpt or reviewed value. Erase the whole original.
   for(const value of identities)statements.push(db.prepare(`INSERT OR IGNORE INTO record_erasure_signals SELECT ?,s.id FROM signals s WHERE ${retainedEvidenceIdentityMatch}`).bind(id,...retainedEvidenceIdentityPatterns(value)));
   statements.push(...await capturePrivacyErasureStatements(db,id,identities,match));
   statements.push(db.prepare(`DELETE FROM unlinked_signals WHERE signal_id IN (${signalIds})`).bind(id));
   statements.push(db.prepare("UPDATE audit_entries SET entity_id='erased',details_json='{}' WHERE entity_type='contact' AND entity_id IN(SELECT retired_id FROM record_merge_claims WHERE record_type='contact' AND survivor_id=?)").bind(id),db.prepare("UPDATE audit_entries SET details_json='{}' WHERE EXISTS(SELECT 1 FROM record_merge_claims m WHERE m.record_type='contact' AND m.survivor_id=? AND instr(audit_entries.details_json,m.retired_id)>0)").bind(id));
   // Display names are not identities: unrelated customers may share them.
   // Attribute name-bearing content through contact/opportunity links instead.
   for(const opportunity of affected)statements.push(db.prepare('UPDATE ai_calls SET error=NULL WHERE opportunity_id=?').bind(opportunity.opportunity_id));
   for(const value of identities){const patterns=identityPatterns(value);statements.push(db.prepare(`DELETE FROM handoff_tasks WHERE ${identityMatch('title')} OR ${identityMatch('description')}`).bind(...patterns,...patterns),db.prepare(`UPDATE ai_calls SET error=NULL WHERE ${identityMatch('error')}`).bind(...patterns),db.prepare(`DELETE FROM ai_previews WHERE ${identityMatch('content_json')}`).bind(...patterns),db.prepare(`DELETE FROM unlinked_replies WHERE ${identityMatch('sender')}`).bind(...patterns),db.prepare(`DELETE FROM notifications WHERE ${identityMatch('message')}`).bind(...patterns),db.prepare(`UPDATE audit_entries SET details_json='{}' WHERE ${identityMatch('details_json')}`).bind(...patterns),db.prepare(`DELETE FROM timeline_entries WHERE ${identityMatch('payload_json')}`).bind(...patterns));}
   statements.push(db.prepare('DELETE FROM ai_previews WHERE recipient_contact_id=? OR instr(content_json,?)>0').bind(id,id),db.prepare('DELETE FROM notifications WHERE opportunity_id IN (SELECT opportunity_id FROM opportunity_contacts WHERE contact_id=?)').bind(id),db.prepare('DELETE FROM outbound_messages WHERE contact_id=? OR draft_id IN (SELECT id FROM drafts WHERE recipient_contact_id=?)').bind(id,id),db.prepare('DELETE FROM drafts WHERE recipient_contact_id=?').bind(id));
   statements.push(db.prepare(`DELETE FROM action_completions WHERE recommendation_id IN(SELECT recommendation_id FROM recommendation_evidence WHERE signal_id IN (${signalIds}))`).bind(id));
   statements.push(db.prepare(`DELETE FROM recommendations WHERE id IN(SELECT recommendation_id FROM recommendation_evidence WHERE signal_id IN (${signalIds}))`).bind(id),db.prepare(`DELETE FROM evaluations WHERE id IN(SELECT evaluation_id FROM evaluation_contributions WHERE signal_id IN (${signalIds}))`).bind(id));
   statements.push(db.prepare(`DELETE FROM timeline_entries WHERE id IN(SELECT timeline_entry_id FROM timeline_entry_records WHERE record_type='contact' AND record_id=?) OR json_extract(payload_json,'$.contactId')=? OR json_extract(payload_json,'$.signalId') IN (${signalIds}) OR EXISTS(SELECT 1 FROM json_each(timeline_entries.payload_json,'$.contactIds') WHERE value=?)`).bind(id,id,id,id));
   statements.push(...captureErasureStatements(db,id,actor));
   statements.push(db.prepare(`DELETE FROM signals WHERE id IN(${signalIds})`).bind(id),db.prepare("UPDATE audit_entries SET entity_id='erased',details_json='{}' WHERE (entity_type='contact' AND entity_id=?) OR instr(details_json,?)>0").bind(id,id),db.prepare('DELETE FROM contacts WHERE id=?').bind(id));
   statements.push(db.prepare("UPDATE opportunity_contacts SET is_primary=1 WHERE contact_id=(SELECT MIN(c.contact_id) FROM opportunity_contacts c WHERE c.opportunity_id=opportunity_contacts.opportunity_id) AND NOT EXISTS(SELECT 1 FROM opportunity_contacts p WHERE p.opportunity_id=opportunity_contacts.opportunity_id AND p.is_primary=1)"));
   statements.push(db.prepare('DELETE FROM record_erasure_signals WHERE contact_id=?').bind(id));
   for(const opportunity of affected)statements.push(...evaluationStatements(db,opportunity.opportunity_id,actor,'Contact erased'));
  }
  statements.push(db.prepare('DELETE FROM record_merge_claims WHERE record_type=? AND (survivor_id=? OR retired_id=?)').bind(kind,id,id),db.prepare('DELETE FROM record_aliases WHERE record_type=? AND survivor_id=?').bind(kind,id),db.prepare('DELETE FROM timeline_entry_records WHERE record_type=? AND record_id=?').bind(kind,id),erasedMentions(db),db.prepare('DELETE FROM signal_links WHERE record_type=? AND record_id=?').bind(kind,id),audit(db,actor,'record.deleted',kind,kind==='contact'?'erased':id));
  if(kind==='contact'){await withdrawRelatedImportCopies(db,actor,id,contactEmails,sessionId);await executeArchiveErasure(db,statements,all=>eraseImportedContact(db,actor,id,all.map(statement=>{const query=capture.queries.get(statement);if(!query)throw new Error('Untracked native erasure statement.');return query;}),sessionId,contactEmails));}else await db.batch(statements);return {deleted:true};
 }
}
