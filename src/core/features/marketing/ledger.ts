import {audit} from '../records/shared';
/**
 * Consent and Mailchimp member links are append-only audit entries on the contact: they travel in both archives,
 * keep who recorded what and when, and contact erasure empties them with the rest of the contact's audit trail.
 */
export interface Consent {state:'given'|'withdrawn';source:string;basis:string;at:string;by:string|null}
export interface MemberLink {listId:string;memberId:string;uniqueEmailId:string|null;status:string;hash:string|null}
const consentActions=['marketing.consent-recorded','marketing.consent-withdrawn'];
async function latest<T>(db:D1Database,actions:string[],read:(action:string,details:any,row:{actor_id:string|null;occurred_at:string})=>T){
 const rows=(await db.prepare(`SELECT entity_id,action,details_json,actor_id,occurred_at FROM audit_entries WHERE entity_type='contact' AND action IN(${actions.map(()=>'?').join(',')}) ORDER BY occurred_at,rowid`).bind(...actions).all<{entity_id:string;action:string;details_json:string;actor_id:string|null;occurred_at:string}>()).results;
 const current=new Map<string,T>();
 for(const row of rows){let details:any={};try{details=JSON.parse(row.details_json);}catch{details={};}current.set(row.entity_id,read(row.action,details,row));}
 return current;
}
export function consents(db:D1Database){return latest<Consent>(db,consentActions,(action,details,row)=>({state:action==='marketing.consent-recorded'?'given':'withdrawn',source:String(details.source??''),basis:String(details.basis??''),at:row.occurred_at,by:row.actor_id}));}
export function memberLinks(db:D1Database){return latest<MemberLink>(db,['mailchimp.member'],(_action,details)=>({listId:String(details.listId??''),memberId:String(details.memberId??''),uniqueEmailId:typeof details.uniqueEmailId==='string'?details.uniqueEmailId:null,status:String(details.status??''),hash:typeof details.hash==='string'?details.hash:null}));}
export const consentStatement=(db:D1Database,actor:string,contactId:string,source:string,basis:string)=>audit(db,actor,'marketing.consent-recorded','contact',contactId,{source,basis});
export const withdrawalStatement=(db:D1Database,actor:string|null,contactId:string,source:string,basis:string)=>audit(db,actor,'marketing.consent-withdrawn','contact',contactId,{source,basis});
/** Mailchimp's member ID (the subscriber hash) and unique_email_id are the stable external IDs for the contact. */
export const linkStatement=(db:D1Database,actor:string|null,contactId:string,link:MemberLink)=>audit(db,actor,'mailchimp.member','contact',contactId,link);
