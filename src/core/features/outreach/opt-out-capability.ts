import { suppressionStatements } from '../records/suppression';

export const optOutPath='/unsubscribe/';
export function optOutOrigin(value?:string){
 try{const url=new URL(value??'');return url.protocol==='https:'&&!url.username&&!url.password&&url.href===url.origin+'/'?url.origin:undefined;}catch{return undefined;}
}
function newToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');}
/** Included in the approval transaction; a failed or duplicate approval issues nothing. */
export function capabilityStatement(db:D1Database,messageId:string,origin:string){
 return db.prepare(`INSERT INTO outbound_opt_out_capabilities(token,message_id,contact_id,origin,created_at)
 SELECT ?,m.id,m.contact_id,?,m.approved_at FROM outbound_messages m
 LEFT JOIN outbound_message_opt_out b ON b.message_id=m.id
 WHERE m.id=? AND (b.message_id IS NULL OR b.carries=1) ON CONFLICT(message_id) DO NOTHING`).bind(newToken(),origin,messageId);
}
/** Older approvals keep their bound opt-out state when the transport changes. */
export async function messageOptOutUrl(db:D1Database,messageId:string,origin:string){
 await capabilityStatement(db,messageId,origin).run();
 const capability=await db.prepare('SELECT token,origin FROM outbound_opt_out_capabilities WHERE message_id=?').bind(messageId).first<{token:string;origin:string}>();
 // Never silently redirect an approved capability to another installation.
 if(!capability||capability.origin!==origin)throw new Error('The approved opt-out link belongs to another installation origin. Review before sending.');
 return capability.origin+optOutPath+capability.token;
}
const validToken=/^[a-f0-9]{64}$/;
export async function findCapability(db:D1Database,token:string,origin:string){
 if(!validToken.test(token))return null;
 return db.prepare(`SELECT p.contact_id,c.email FROM outbound_opt_out_capabilities p JOIN contacts c ON c.id=p.contact_id
 WHERE p.token=? AND p.origin=?`).bind(token,origin).first<{contact_id:string;email:string|null}>();
}
/** Only the capability's contact is changed. The fence, suppression and stops commit together. */
export async function unsubscribe(db:D1Database,token:string,origin:string){
 const capability=await findCapability(db,token,origin);if(!capability)return false;
 const at=new Date().toISOString(),contact=capability.contact_id;
 const condition='EXISTS(SELECT 1 FROM outbound_opt_out_capabilities WHERE token=? AND origin=? AND contact_id=?)';
 const fence=db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'opt_out_capability',NULL WHERE NOT ${condition}`).bind(token,origin,contact);
 try{await db.batch([fence,
  ...await suppressionStatements(db,[capability.email]),
  db.prepare("UPDATE contacts SET contactability='do_not_contact',updated_at=? WHERE id=? AND contactability<>'do_not_contact'").bind(at,contact),
  db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Recipient opted out',updated_at=? WHERE recipient_contact_id=? AND is_stale=0 AND NOT EXISTS(SELECT 1 FROM outbound_messages m WHERE m.draft_id=drafts.id AND m.revision=drafts.revision AND m.state IN('accepted','delivered','bounced','delivery-unknown','reconciling'))").bind(at,contact),
  db.prepare("UPDATE outbound_messages SET state='cancelled',failure='Recipient opted out',updated_at=? WHERE contact_id=? AND state IN('scheduled','draft','queued')").bind(at,contact),
  db.prepare("INSERT OR IGNORE INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT 'opt-out:'||message_id,NULL,'contact.opted_out','contact',contact_id,'{}',? FROM outbound_opt_out_capabilities WHERE token=? AND origin=?").bind(at,token,origin),
  db.prepare("INSERT OR IGNORE INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) SELECT 'opt-out:'||message_id,'contact.opted_out',?,?,'feature',NULL,'outreach','{}' FROM outbound_opt_out_capabilities WHERE token=? AND origin=?").bind(at,at,token,origin),
  db.prepare("INSERT OR IGNORE INTO timeline_entry_records(timeline_entry_id,record_type,record_id) SELECT 'opt-out:'||message_id,'contact',contact_id FROM outbound_opt_out_capabilities WHERE token=? AND origin=?").bind(token,origin)
 ]);}catch(error){if(!await findCapability(db,token,origin))return false;throw error;}
 return true;
}
