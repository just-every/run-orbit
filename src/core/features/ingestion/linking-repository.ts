import {bookingEvidence} from './booking-webhooks';
import { companyDomainKey,contactEmailKey } from '../records/identity';
import type { SignalEvent } from './contracts';
export interface SignalTarget {type:'contact'|'company'|'opportunity';id:string;basis:string}
export async function resolveTarget(db:D1Database,event:SignalEvent,source?:string):Promise<SignalTarget|undefined> {
  const booking=bookingEvidence(event);
  if(booking&&!event.record){
   if(booking.attendees.length!==1)return;
   const prior=(await db.prepare('SELECT DISTINCT t.payload_json FROM booking_activity_ids b JOIN timeline_entries t ON t.id=b.timeline_id WHERE b.source_id=? AND b.provider=? AND b.provider_id IN(SELECT value FROM json_each(?))').bind(source??'',booking.provider,JSON.stringify([booking.providerId,booking.relatedId])).all<{payload_json:string}>()).results;
   if(prior.some(row=>(JSON.parse(row.payload_json).booking.attendees as {email:string}[]).some(a=>a.email.trim().toLowerCase()!==booking.attendees[0]!.email.trim().toLowerCase())))return;
  }
  if(['page.viewed','chat.started','content.downloaded'].includes(event.type)&&!event.identityBasis)return;
  if(event.record){const table={contact:'contacts',company:'companies',opportunity:'opportunities'}[event.record.type];if(await db.prepare(`SELECT id FROM ${table} WHERE id=?`).bind(event.record.id).first())return {...event.record,basis:'Explicit Orbit record ID'};return;}
  const settings=await db.prepare("SELECT free_mail_domains_json FROM workspace_settings WHERE id='workspace'").first<{free_mail_domains_json:string}>();
  const type=event.email?'contact':event.domain?'company':undefined;if(!type)return;
  const key=type==='contact'?contactEmailKey(event.email):companyDomainKey(event.domain,JSON.parse(settings?.free_mail_domains_json??'[]'));
  if(!key)return;
  const table=type==='contact'?'contacts':'companies',column=type==='contact'?'email_key':'primary_domain_key';
  const result=await db.prepare(`SELECT id FROM ${table} WHERE ${column}=? UNION SELECT survivor_id AS id FROM record_aliases WHERE record_type=? AND identity_key=?`).bind(key,type,key).all<{id:string}>();
  if(result.results.length===1)return {type,id:result.results[0]!.id,basis:'Exact normalized identity or retired alias'};
}
export async function targetsFor(db:D1Database,target:SignalTarget):Promise<SignalTarget[]> {
  if(target.type==='opportunity')return [target];
  const rows=target.type==='contact'?await db.prepare('SELECT opportunity_id AS id FROM opportunity_contacts WHERE contact_id=?').bind(target.id).all<{id:string}>():await db.prepare('SELECT id FROM opportunities WHERE company_id=?').bind(target.id).all<{id:string}>();
  return [target,...rows.results.map(row=>({type:'opportunity' as const,id:row.id,basis:target.basis}))];
}
