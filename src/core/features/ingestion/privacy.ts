import {privacyMatcher,suppressionContextFence} from '../records/suppression';
import {audit} from '../records/shared';
import {payloadHash} from '../../platform/source-security';
import {IngestionError,type SignalEvent} from './contracts';
import {bookingEvidence} from './booking-webhooks';
type Matcher=Awaited<ReturnType<typeof privacyMatcher>>;
const proofAction='booking.erased-id';
// Provider IDs are case-sensitive. Hash the exact tuple before using the shared normalized matcher.
const identity=async(source:string,provider:string,id:string)=>`booking-id-v1:${await payloadHash(JSON.stringify([source,provider,id]))}`;
const erased=`EXISTS(SELECT 1 FROM audit_entries a,json_each(a.details_json,'$.tokens') t WHERE a.action='${proofAction}' AND t.value IN(SELECT value FROM json_each(?)))`;
/** New and reviewed evidence joins its privacy fence to the same atomic signal batch. */
export async function bookingIngressPrivacy(db:D1Database,event:SignalEvent,source:string){
 const booking=bookingEvidence(event);if(!booking)return [];
 const statements:D1PreparedStatement[]=[],match=await privacyMatcher(db,statements),tokens=(await Promise.all([booking.providerId,...(booking.relatedId?[booking.relatedId]:[])].map(async id=>match(await identity(source,booking.provider,id))))).flat();
 if(await db.prepare(`SELECT 1 WHERE ${erased}`).bind(JSON.stringify(tokens)).first())throw new IngestionError(403,'This booking evidence was erased. No record was created.');
 return [...statements,...suppressionContextFence(db,tokens),db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'booking_erasure_fence',NULL WHERE ${erased}`).bind(JSON.stringify(tokens))];
}
const chain=`WITH RECURSIVE edges AS (
 SELECT s.id AS signal_id,s.source_id AS source,CASE WHEN s.source_event_id LIKE 'calcom:%' THEN 'calcom' ELSE 'calendly' END AS provider,
 coalesce(json_extract(s.payload_json,'$.payload.uid'),json_extract(s.payload_json,'$.uid'),json_extract(s.payload_json,'$.payload.uri')) AS uid,
 coalesce(json_extract(s.payload_json,'$.payload.rescheduleUid'),json_extract(s.payload_json,'$.payload.old_invitee')) AS old_uid,
 json_extract(s.payload_json,'$.payload.new_invitee') AS new_uid
 FROM signals s WHERE s.source_event_id LIKE 'calcom:%' OR s.source_event_id LIKE 'calendly:%'
), ids(source,provider,uid) AS (
 SELECT e.source,e.provider,e.uid FROM edges e JOIN signal_links l ON l.signal_id=e.signal_id WHERE l.record_type='contact' AND l.record_id=? AND e.uid IS NOT NULL
 UNION SELECT e.source,e.provider,j.value FROM edges e JOIN ids r ON r.source=e.source AND r.provider=e.provider AND r.uid IN(e.uid,e.old_uid,e.new_uid),json_each(json_array(e.uid,e.old_uid,e.new_uid)) j WHERE j.type='text'
)`;
const ordered=`SELECT source,provider,uid FROM ids ORDER BY source,provider,uid`;
/** Erase the entire connected provider identity chain, including held changes naming another attendee. */
export async function bookingContactErasure(db:D1Database,contactId:string,matcher?:Matcher){
 const statements:D1PreparedStatement[]=[],rows=(await db.prepare(`${chain} ${ordered}`).bind(contactId).all<{source:string;provider:string;uid:string}>()).results;
 if(!rows.length)return statements;
 const match=matcher??await privacyMatcher(db,statements),tokens=(await Promise.all(rows.map(async row=>match(await identity(row.source,row.provider,row.uid))))).flat();
 const snapshot=JSON.stringify(rows.map(row=>[row.source,row.provider,row.uid]));
 statements.push(...suppressionContextFence(db,tokens),db.prepare(`${chain} INSERT INTO runtime_controls(name,value) SELECT 'booking_privacy_chain_changed',NULL WHERE (SELECT json_group_array(json_array(source,provider,uid)) FROM (${ordered}))<>?`).bind(contactId,snapshot),
 db.prepare(`${chain} INSERT OR IGNORE INTO record_erasure_signals SELECT ?,e.signal_id FROM edges e WHERE EXISTS(SELECT 1 FROM ids r WHERE r.source=e.source AND r.provider=e.provider AND r.uid IN(e.uid,e.old_uid,e.new_uid))`).bind(contactId,contactId),
 audit(db,null,proofAction,'booking','erased',{tokens}));
 return statements;
}
