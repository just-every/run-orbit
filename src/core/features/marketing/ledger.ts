import {audit} from '../records/shared';
/**
 * Consent and Mailchimp member links are append-only audit entries on the contact: they travel in both archives,
 * keep who recorded what and when, and contact erasure empties them with the rest of the contact's audit trail.
 */
export interface Consent {state:'given'|'withdrawn';source:string;basis:string;at:string;by:string|null}
/** `reported` marks a status only a webhook stated; Orbit has not read it from Mailchimp, so a stopped contact's member is checked before it is trusted. */
export interface MemberLink {listId:string;memberId:string;uniqueEmailId:string|null;status:string;hash:string|null;reported?:boolean;retired?:boolean}
const consentActions=['marketing.consent-recorded','marketing.consent-withdrawn'];
async function latest<T>(db:D1Database,actions:string[],read:(action:string,details:any,row:{actor_id:string|null;occurred_at:string})=>T){
 const rows=(await db.prepare(`SELECT entity_id,action,details_json,actor_id,occurred_at FROM audit_entries WHERE entity_type='contact' AND action IN(${actions.map(()=>'?').join(',')}) ORDER BY occurred_at,rowid`).bind(...actions).all<{entity_id:string;action:string;details_json:string;actor_id:string|null;occurred_at:string}>()).results;
 const current=new Map<string,T>();
 for(const row of rows){let details:any={};try{details=JSON.parse(row.details_json);}catch{details={};}current.set(row.entity_id,read(row.action,details,row));}
 return current;
}
export function consents(db:D1Database){return latest<Consent>(db,consentActions,(action,details,row)=>({state:action==='marketing.consent-recorded'?'given':'withdrawn',source:String(details.source??''),basis:String(details.basis??''),at:row.occurred_at,by:row.actor_id}));}
export async function memberLinks(db:D1Database){
 const rows=(await db.prepare("SELECT entity_id,details_json FROM audit_entries WHERE entity_type='contact' AND action='mailchimp.member' ORDER BY occurred_at,rowid").all<{entity_id:string;details_json:string}>()).results;
 const contacts=new Map<string,Map<string,MemberLink>>();
 for(const row of rows){
  let link:MemberLink;try{link=JSON.parse(row.details_json);}catch{continue;}
  if(!/^[a-z0-9]{1,32}$/i.test(link.listId)||!/^[a-f0-9]{32}$/.test(link.memberId))continue;
  const links=contacts.get(row.entity_id)??new Map<string,MemberLink>();links.set(`${link.listId}:${link.memberId}`,link);contacts.set(row.entity_id,links);
 }
 return new Map([...contacts].map(([id,links])=>[id,[...links.values()]]));
}
/** Transfer original provenance in the merge transaction, then retain either participant's stricter current consent. */
export async function marketingContactMerge(db:D1Database,survivor:string,retired:string,actor:string){
 const consent=await consents(db),links=await memberLinks(db);
 const stopped=[survivor,retired].some(id=>consent.get(id)?.state==='withdrawn'||links.get(id)?.some(link=>!link.retired&&['unsubscribed','cleaned'].includes(link.status)));
 return [db.prepare("UPDATE audit_entries SET entity_id=? WHERE entity_type='contact' AND entity_id=? AND action IN('marketing.consent-recorded','marketing.consent-withdrawn','mailchimp.member')").bind(survivor,retired),...(stopped?[withdrawalStatement(db,actor,survivor,'Orbit merge','The stricter marketing stop from either merged contact is retained')]:[])];
}
export const consentStatement=(db:D1Database,actor:string,contactId:string,source:string,basis:string)=>audit(db,actor,'marketing.consent-recorded','contact',contactId,{source,basis});
export const withdrawalStatement=(db:D1Database,actor:string|null,contactId:string,source:string,basis:string)=>audit(db,actor,'marketing.consent-withdrawn','contact',contactId,{source,basis});
/** Mailchimp's member ID (the subscriber hash) and unique_email_id are the stable external IDs for the contact. */
export const linkStatement=(db:D1Database,actor:string|null,contactId:string,link:MemberLink)=>audit(db,actor,'mailchimp.member','contact',contactId,link);
