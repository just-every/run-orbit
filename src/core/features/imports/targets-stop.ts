import { canonicalJson,type D1Database,type D1Sql,type TargetRow } from '../../../modules/import-kit/d1/index';
import {mailboxListSql} from './mailboxes';
const sql=(sql:string,...params:any[]):D1Sql=>({sql,params});
export interface StopValue {emails:string[];proofs:{id:string;mailboxDigest:string;present:number}[];contacts:{id:string;contactability:string;contactability_revision:number;prior:string;priorRevision:number;mailboxes:string[];mailboxDigests:string[]}[];at:string}
const active="proof.action='contact.suppressed' AND NOT EXISTS(SELECT 1 FROM audit_entries cleared,json_each(cleared.details_json,'$.proofs') item WHERE cleared.action='contact.suppression_cleared' AND cleared.entity_id=proof.entity_id AND item.value=proof.id)";
export async function stopRead(db:D1Database,destination:string,id:string):Promise<TargetRow|undefined>{
 const stored=await db.prepare('SELECT * FROM crm_import_stops WHERE id=?').bind(id).first();if(!stored)return;
 const value=JSON.parse(stored.value_json) as StopValue;
 const proofs=(await db.prepare(`SELECT id,entity_id FROM audit_entries proof WHERE ${active} AND id IN(SELECT json_extract(value,'$.id') FROM json_each(?))`).bind(JSON.stringify(value.proofs)).all()).results;
 for(const proof of value.proofs)proof.present=proofs.some(p=>p.id===proof.id&&p.entity_id===proof.mailboxDigest)?1:0;
 const contacts=(await db.prepare(`SELECT c.id,c.contactability,c.contactability_revision,${mailboxListSql('c')} AS mailboxes_json FROM contacts c WHERE c.id IN(SELECT json_extract(value,'$.id') FROM json_each(?))`).bind(JSON.stringify(value.contacts)).all()).results;
 for(const contact of value.contacts){const current=contacts.find(c=>c.id===contact.id);contact.contactability=current?.contactability??'deleted';contact.contactability_revision=current?.contactability_revision??-1;contact.mailboxes=current?JSON.parse(current.mailboxes_json):[];}
 return {destination,targetKind:'suppression',targetId:id,revision:stored.revision,value:value as any};
}
export function stopMatches(row:TargetRow|null,id:string){
 if(!row)return sql('NOT EXISTS(SELECT 1 FROM crm_import_stops WHERE id=?)',id);
 const value=row.value as unknown as StopValue;
 return sql(`EXISTS(SELECT 1 FROM crm_import_stops s CROSS JOIN (SELECT ? AS body) snapshot WHERE s.id=? AND s.revision=?
 AND json_extract(s.value_json,'$.emails')=json_extract(snapshot.body,'$.emails') AND json_extract(s.value_json,'$.at')=json_extract(snapshot.body,'$.at')
 AND json_array_length(s.value_json,'$.proofs')=json_array_length(snapshot.body,'$.proofs') AND json_array_length(s.value_json,'$.contacts')=json_array_length(snapshot.body,'$.contacts')
 AND NOT EXISTS(SELECT 1 FROM json_each(snapshot.body,'$.proofs') expected LEFT JOIN json_each(s.value_json,'$.proofs') stored ON stored.key=expected.key WHERE json_extract(stored.value,'$.id') IS NOT json_extract(expected.value,'$.id') OR json_extract(stored.value,'$.mailboxDigest') IS NOT json_extract(expected.value,'$.mailboxDigest') OR (EXISTS(SELECT 1 FROM audit_entries proof WHERE proof.id=json_extract(expected.value,'$.id') AND proof.entity_id=json_extract(expected.value,'$.mailboxDigest') AND ${active}))<>json_extract(expected.value,'$.present'))
 AND NOT EXISTS(SELECT 1 FROM json_each(snapshot.body,'$.contacts') expected LEFT JOIN json_each(s.value_json,'$.contacts') stored ON stored.key=expected.key LEFT JOIN contacts c ON c.id=json_extract(expected.value,'$.id') WHERE json_extract(stored.value,'$.id') IS NOT json_extract(expected.value,'$.id') OR json_extract(stored.value,'$.prior') IS NOT json_extract(expected.value,'$.prior') OR json_extract(stored.value,'$.priorRevision') IS NOT json_extract(expected.value,'$.priorRevision') OR json_extract(stored.value,'$.mailboxDigests') IS NOT json_extract(expected.value,'$.mailboxDigests') OR ${mailboxListSql('c')} IS NOT json_extract(expected.value,'$.mailboxes') OR COALESCE(c.contactability,'deleted')<>json_extract(expected.value,'$.contactability') OR COALESCE(c.contactability_revision,-1)<>json_extract(expected.value,'$.contactability_revision')))`,canonicalJson(value),id,row.revision);
}
export function stopWrite(target:TargetRow){
 const value=target.value as unknown as StopValue,emails=JSON.stringify(value.emails),contacts=JSON.stringify(value.contacts),proofs=JSON.stringify(value.proofs),contexts=JSON.stringify([...new Set(value.proofs.map(p=>p.mailboxDigest.slice(0,32)))]);
 const recipients="SELECT id FROM contacts WHERE lower(trim(email)) IN(SELECT value FROM json_each(?)) OR id IN(SELECT survivor_id FROM record_aliases WHERE record_type='contact' AND lower(trim(identity_key)) IN(SELECT value FROM json_each(?)))";
 return [
 sql("INSERT INTO runtime_controls(name,value) SELECT 'crm_privacy_fence',NULL WHERE EXISTS(SELECT 1 FROM privacy_matching_contexts WHERE context_id NOT IN(SELECT value FROM json_each(?)))",contexts),
 sql(`INSERT INTO runtime_controls(name,value) SELECT 'crm_recipient_fence',NULL WHERE (SELECT json_group_array(json_array(id,contactability,contactability_revision)) FROM (SELECT id,contactability,contactability_revision FROM contacts WHERE id IN(${recipients}) ORDER BY id))<>?`,emails,emails,JSON.stringify(value.contacts.map(c=>[c.id,c.prior,c.priorRevision]))),
 sql(`INSERT INTO runtime_controls(name,value) SELECT 'crm_mailbox_fence',NULL WHERE EXISTS(SELECT 1 FROM json_each(?) expected LEFT JOIN contacts c ON c.id=json_extract(expected.value,'$.id') WHERE c.id IS NULL OR ${mailboxListSql('c')} IS NOT json_extract(expected.value,'$.mailboxes'))`,contacts),
 sql("INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT json_extract(value,'$.id'),NULL,'contact.suppressed','mailbox',json_extract(value,'$.mailboxDigest'),'{}',? FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING",value.at,proofs),
 sql("UPDATE contacts SET contactability='do_not_contact' WHERE id IN(SELECT json_extract(value,'$.id') FROM json_each(?))",contacts),
 sql(`UPDATE drafts SET is_stale=1,stale_reason='Imported suppression' WHERE recipient_contact_id IN(${recipients})`,emails,emails),
 sql(`UPDATE outbound_messages SET state='cancelled',failure='Imported suppression' WHERE state IN('scheduled','queued') AND contact_id IN(${recipients})`,emails,emails),
 sql('INSERT INTO crm_import_stops VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,value_json=excluded.value_json',target.targetId,target.revision,canonicalJson(value))];
}
export function stopRemove(id:string){
 // Independent proofs belong to this contact's current primary/alias identities, not every mailbox in the atomic import group.
 const independent=`EXISTS(SELECT 1 FROM audit_entries proof WHERE ${active} AND proof.entity_id IN(SELECT value FROM json_each(j.value,'$.mailboxDigests')))`;
 return [
 sql("INSERT INTO runtime_controls(name,value) SELECT 'crm_privacy_fence',NULL WHERE EXISTS(SELECT 1 FROM privacy_matching_contexts WHERE context_id NOT IN(SELECT substr(json_extract(j.value,'$.mailboxDigest'),1,32) FROM crm_import_stops s,json_each(s.value_json,'$.proofs') j WHERE s.id=?))",id),
 sql("DELETE FROM audit_entries WHERE id IN(SELECT json_extract(value,'$.id') FROM crm_import_stops s,json_each(s.value_json,'$.proofs') WHERE s.id=?)",id),
 sql(`UPDATE contacts SET contactability=(SELECT json_extract(j.value,'$.prior') FROM crm_import_stops s,json_each(s.value_json,'$.contacts') j WHERE s.id=? AND json_extract(j.value,'$.id')=contacts.id) WHERE EXISTS(SELECT 1 FROM crm_import_stops s,json_each(s.value_json,'$.contacts') j WHERE s.id=? AND json_extract(j.value,'$.id')=contacts.id AND json_extract(j.value,'$.contactability_revision')=contacts.contactability_revision AND NOT ${independent})`,id,id),
 sql(`INSERT INTO runtime_controls(name,value) SELECT 'crm_stop_undo_fence',NULL WHERE EXISTS(SELECT 1 FROM crm_import_stops s,json_each(s.value_json,'$.contacts') j LEFT JOIN contacts c ON c.id=json_extract(j.value,'$.id') WHERE s.id=? AND (c.id IS NULL OR ${mailboxListSql('c')} IS NOT json_extract(j.value,'$.mailboxes') OR CASE WHEN ${independent} THEN c.contactability<>json_extract(j.value,'$.contactability') OR c.contactability_revision<>json_extract(j.value,'$.contactability_revision') ELSE c.contactability<>json_extract(j.value,'$.prior') OR c.contactability_revision<>json_extract(j.value,'$.contactability_revision')+1 END))`,id),
 sql('DELETE FROM crm_import_stops WHERE id=?',id)];
}
