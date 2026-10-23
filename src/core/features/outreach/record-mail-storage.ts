/** Deal-less mail has its own nullable storage. Native/owner-added columns are never rebuilt.
 * This adapter lets both stores execute the same approval and submission implementation. */
const tables = ['drafts','outbound_messages','draft_opt_out','outbound_message_opt_out','outbound_opt_out_capabilities'] as const;
const names = new Map(tables.map(name=>[name,`record_mail_${name}`]));
const scoped = new WeakMap<D1Database,D1Database>();
const originals = new WeakMap<D1Database,D1Database>();
export function nativeMailDatabase(db:D1Database){return originals.get(db)??db;}
export function isRecordMailDatabase(db:D1Database){return originals.has(db);}
export function recordMailDatabase(db:D1Database):D1Database {
 if(originals.has(db))return db;
 const existing=scoped.get(db);if(existing)return existing;
 // SQL string literals are evidence/copy, never identifiers to rewrite.
 const rewrite=(sql:string)=>sql.split(/('(?:''|[^'])*')/g).map((part,index)=>index%2?part:part.replace(/\b[a-z_]+\b/g,word=>names.get(word as typeof tables[number])??word)).join('');
 const result=new Proxy(db,{get(target,key){if(key==='prepare')return(sql:string)=>target.prepare(rewrite(sql));const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
 scoped.set(db,result);originals.set(result,db);return result;
}
export async function draftMailDatabase(db:D1Database,id:string){
 if(isRecordMailDatabase(db))return db;
 return await db.prepare('SELECT 1 FROM record_mail_drafts WHERE id=?').bind(id).first()?recordMailDatabase(db):db;
}
export async function messageMailDatabase(db:D1Database,id:string){
 if(isRecordMailDatabase(db))return db;
 return await db.prepare('SELECT 1 FROM record_mail_outbound_messages WHERE id=?').bind(id).first()?recordMailDatabase(db):db;
}
/** A saved record draft cannot change its origin's recipient relationship during review. */
export function recordMailRecipientScope(db:D1Database,draft='d',contact='c'){
 return isRecordMailDatabase(db)?` AND EXISTS(SELECT 1 FROM record_mail_context x WHERE x.draft_id=${draft}.id AND (
 (x.origin_type='contact' AND x.origin_id=${contact}.id) OR
 (x.origin_type='company' AND (${contact}.company_id=x.origin_id OR EXISTS(SELECT 1 FROM contact_company_relationships r WHERE r.contact_id=${contact}.id AND r.company_id=x.origin_id))) OR
 (x.origin_type='opportunity' AND EXISTS(SELECT 1 FROM opportunity_contacts ocx WHERE ocx.opportunity_id=x.origin_id AND ocx.contact_id=${contact}.id))))`:'';
}
