import {payloadHash} from '../../platform/source-security';
import {createId} from '../../shared/ids';
import {privacyMatcher,suppressionContextFence} from '../records/suppression';
import {CaptureProviderError,type CaptureItem} from './contracts';
import {readItem,type Read} from './facts';
import type {CaptureSource} from './intake';
import {captureFences} from './fences';

const keyHeader='X-ORBIT-PROVIDER-KEY: ';
async function identityKeys(db:D1Database,source:CaptureSource,identity:unknown[]){
 // Provider identities are case-sensitive. Hash the tuple before the mailbox
 // matcher's normalization, and domain-separate it from erasure/suppression.
 return (await privacyMatcher(db))(`capture-provider-v1:${await payloadHash(JSON.stringify([source.id,...identity]))}`);
}
/** Anonymous proofs and the running count commit together, under the intake fence.
 * Originals are never retained for skipped mail. Existing private archive matching
 * contexts make proofs portable; they contain no sender, subject or provider ID.
 */
export async function recordProviderSkip(db:D1Database,source:CaptureSource,item:CaptureItem,reason:string):Promise<boolean|null>{
 const identity=item.kind==='calendar'?(item.providerEvent?['calendar',item.providerEvent.calendarId,item.providerEvent.id]:null):item.providerMessageId?['message',item.providerMessageId]:null;
 if(!identity)return null;
 const keys=await identityKeys(db,source,identity),at=new Date().toISOString();
 const safeReason=reason.startsWith('Unknown time zone ')?'Unknown calendar time zone':reason;
 const unseen="NOT EXISTS(SELECT 1 FROM audit_entries WHERE entity_type='capture_skip' AND action='capture.skipped_item' AND entity_id IN(SELECT value FROM json_each(?)))";
 const fences=[...captureFences(db,source),...suppressionContextFence(db,keys)];
 const result=await db.batch([...fences,
  db.prepare(`UPDATE capture_sources SET skipped_count=skipped_count+1,updated_at=? WHERE id=? AND ${unseen}`).bind(at,source.id,JSON.stringify(keys)),
  db.prepare(`INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT ?,NULL,'capture.skipped_item','capture_skip',?,?,? WHERE ${unseen}`).bind(createId(),keys[0],JSON.stringify({reason:safeReason}),at,JSON.stringify(keys)),
 ]);
 return result[fences.length]!.meta.changes===1;
}
/** The private association lives with the captured original, so its existing
 * archive and contact-erasure lifecycle applies without a second evidence store.
 * Never accept association headers from imported files or provider-written text.
 */
export async function rememberProviderKeys(db:D1Database,source:CaptureSource,signalId:string,keys:string[]){
 await db.batch([...captureFences(db,source),...suppressionContextFence(db,keys),...keys.map(key=>
  db.prepare("UPDATE capture_items SET headers=headers||? WHERE signal_id=? AND source_id=? AND instr(headers,?)=0").bind(`\n${keyHeader}${key}\n`,signalId,source.id,`${keyHeader}${key}\n`))]);
}
export async function readProviderItem(db:D1Database,source:CaptureSource,item:CaptureItem):Promise<Read[]>{
 if(item.kind!=='calendar'||!item.providerEvent)return readItem(item);
 const event=item.providerEvent,keys=await identityKeys(db,source,['calendar',event.calendarId,event.id]);
 if(!event.deleted&&typeof event.seriesId==='string'&&event.seriesId)keys.push(...await identityKeys(db,source,['calendar',event.calendarId,event.seriesId]));
 let originals=[{raw:item.raw,keys}];
 if(event.deleted){
  const previous=(await db.prepare(`SELECT i.body,i.headers,s.type,s.source_event_id FROM capture_items i JOIN signals s ON s.id=i.signal_id
   WHERE s.source_id=? AND i.source_id=s.source_id AND i.kind='event' AND EXISTS(SELECT 1 FROM json_each(?) k WHERE instr(i.headers,?||k.value||char(10))>0)
   ORDER BY i.captured_at DESC,i.rowid DESC`).bind(source.id,JSON.stringify(keys),keyHeader).all<{body:string;headers:string;type:string;source_event_id:string}>()).results;
  if(!previous.length&&(!item.raw||event.outsideWindow))return [{skip:'Deleted calendar event was not previously captured in this calendar'}];
  if(!previous.length&&typeof event.seriesId==='string'&&event.seriesId)keys.push(...await identityKeys(db,source,['calendar',event.calendarId,event.seriesId]));
  if(previous.length)originals=[];const seen=new Set<string>();
  for(const stored of previous){
   const normalized=(await readItem({kind:'calendar',raw:stored.body}))[0];
   if(!normalized||!('fact' in normalized)||normalized.fact.kind!=='event')throw new CaptureProviderError('unavailable','The saved calendar occurrence could not be read.');
   const identity=JSON.stringify([normalized.fact.uid,normalized.fact.recurrenceId]);if(seen.has(identity))continue;seen.add(identity);
   let raw=stored.body;
   if(stored.type!=='meeting.cancelled'){
    // Preserve the occurrence's identity and people. Use the provider's revision
    // time when supplied; otherwise explicitly label Orbit's observation. Reuse
    // the saved cancellation on subsequent full or ID-only deletions.
    const at=event.modifiedAt??new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    raw=raw.replace(/^(?:STATUS|DTSTAMP|LAST-MODIFIED|X-ORBIT-PROVIDER-REVISION):[^\r\n]*\r?\n/gm,'').replace(/END:VEVENT\s*$/,`STATUS:CANCELLED\nDTSTAMP:${at}\nLAST-MODIFIED:${at}\n${event.modifiedAt?'':`X-ORBIT-DELETION-OBSERVED-AT:${at}\n`}X-ORBIT-PROVIDER-REVISION:removed-${stored.source_event_id}\nEND:VEVENT`);
   }
   originals.push({raw,keys:[...new Set([...keys,...[...stored.headers.matchAll(/^X-ORBIT-PROVIDER-KEY: ([a-f0-9]{32}:[a-f0-9]{64})$/gm)].map(match=>match[1]!)])]});
  }
 }
 const reads:Read[]=[];
 for(const original of originals)for(const read of await readItem({...item,raw:original.raw})){
  if('fact' in read&&read.fact.kind==='event'){
   read.fact.providerKeys=original.keys;
   read.fact.headers+=original.keys.map(key=>`\n${keyHeader}${key}\n`).join('');
  }
  reads.push(read);
 }
 return reads;
}
