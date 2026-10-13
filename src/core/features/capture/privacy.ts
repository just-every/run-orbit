import {payloadHash} from '../../platform/source-security';
import {createId} from '../../shared/ids';
import {identityMatch,identityPatterns} from '../records/erasure-identity';
import {privacyMatcher,suppressionContextFence} from '../records/suppression';
import {parseCalendar} from './ics';
import type {Fact} from './facts';

type Matcher=Awaited<ReturnType<typeof privacyMatcher>>;
type CapturePrivacyEvidence=Pick<Fact,'kind'|'eventId'|'body'|'headers'|'participants'|'occurredAt'>;
const mailboxAction='capture.erased_mailbox',itemAction='capture.erased_item';
const skipped={result:'skipped' as const,reason:'Evidence was removed by contact erasure'};
const erasureEpoch="SELECT COALESCE(MAX(rowid),0) FROM audit_entries WHERE action IN('capture.erased_item','capture.erased_mailbox')";
/** An event's phases and revisions are copies of the same occurrence. Other occurrences remain eligible. */
async function itemKeys(match:Matcher,kind:string,eventId:string,body:string){
 const event=kind==='event'?parseCalendar(body)[0]:undefined;
 const identity=event&& !('error' in event)?['calendar',event.uid,event.recurrenceId??'']:['message',eventId];
 return match(`capture-evidence-v1:${await payloadHash(JSON.stringify(identity))}`);
}
function mailboxes(fact:CapturePrivacyEvidence){
 // Include quoted history and Reply-To, exactly as the erasure scan does, not just the participant summary.
 // Walk out from each @: an allowed-character run without @ is never rescanned.
 // Each interval between @ signs is visited at most once from either end.
 const text=fact.headers+'\n'+fact.body,found:string[]=[];
 for(let at=text.indexOf('@');at!==-1;at=text.indexOf('@',at+1)){
  let start=at,end=at+1;
  while(start>0&&/[a-z0-9.!#$%&'*+/=?^_`{|}~-]/i.test(text[start-1]!))start--;
  if(start===at||text[start-1]==='@'||!/[a-z0-9]/i.test(text[end]??''))continue;
  while(end<text.length&&/[a-z0-9_.-]/i.test(text[end]!))end++;
  if(text[end]==='@')continue;
  // A sentence's single terminal period is a boundary; suffixes and repeated dots are not.
  if(text[end-1]==='.'&&text[end-2]!=='.')end--;
  found.push(text.slice(start,end));
 }
 return [...new Set([...found,...fact.participants.map(person=>person.email)].map(value=>value.toLowerCase()))];
}
export async function capturePrivacy(db:D1Database,fact:CapturePrivacyEvidence){
 const match=await privacyMatcher(db),keys=await itemKeys(match,fact.kind,fact.eventId,fact.body);
 const epoch=await db.prepare(erasureEpoch).first<number>('COALESCE(MAX(rowid),0)');
 const event=fact.kind==='event'?parseCalendar(fact.body)[0]:undefined;
 // Completion/cancellation time cannot make a pre-erasure calendar original new.
 const occurredAt=event&&!('error' in event)?event.created??event.stamp??fact.occurredAt:fact.occurredAt;
 const blocked=async()=>{
  if(!epoch)return false;
  if(await db.prepare('SELECT 1 FROM audit_entries WHERE action=? AND entity_id IN(SELECT value FROM json_each(?)) LIMIT 1').bind(itemAction,JSON.stringify(keys)).first())return true;
  const emails=mailboxes(fact);
  // Bound crypto concurrency and D1 parameters even for a maximum-size quoted original.
  for(let offset=0;offset<emails.length;offset+=32){
   const tokens=(await Promise.all(emails.slice(offset,offset+32).map(email=>match(email)))).flat();
   for(let index=0;index<tokens.length;index+=256)if(await db.prepare('SELECT 1 FROM audit_entries WHERE action=? AND entity_id IN(SELECT value FROM json_each(?)) AND occurred_at>=? LIMIT 1').bind(mailboxAction,JSON.stringify(tokens.slice(index,index+256)),occurredAt).first())return true;
  }
  return false;
 };
 return {keys,blocked,skipped,fences:()=>[
  ...suppressionContextFence(db,keys),
  // Any concurrent erasure invalidates the reads above; the whole evidence/effect batch rolls back.
  db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'capture_privacy_fence',NULL WHERE (${erasureEpoch})<>?`).bind(epoch),
 ]};
}

/** Anonymous keyed proofs commit with removal, never a mailbox, subject, original ID or snippet. */
export async function captureErasureStatements(db:D1Database,contactId:string,identities:string[],matcher?:Matcher){
 const statements:D1PreparedStatement[]=[];
 // Existing item keys need no new context; derive one only for a mailbox or legacy original.
 const match:Matcher=async value=>{if(!value?.trim())return [];matcher??=await privacyMatcher(db,statements);return matcher(value);};
 const proof=(action:string,token:string,condition='1=1',bindings:unknown[]=[])=>db.prepare(`INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT ?,NULL,?,'capture_privacy',?,'{}',strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE ${condition}`)
  .bind(createId(),action,token,...bindings);
 for(const email of identities)for(const token of await match(email))statements.push(proof(mailboxAction,token));
 // Current intake stores every matching-context proof beside its immutable signal.
 // Select in the deletion transaction so evidence committed during erasure preparation is covered too.
 statements.push(db.prepare(`INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at)
  SELECT lower(hex(randomblob(16))),NULL,?,'capture_privacy',p.value,'{}',strftime('%Y-%m-%dT%H:%M:%fZ','now')
  FROM signals s JOIN capture_items i ON i.signal_id=s.id,json_each(s.payload_json,'$.data.capturePrivacyKeys') p
  WHERE s.id IN(SELECT signal_id FROM record_erasure_signals WHERE contact_id=?) GROUP BY p.value`).bind(itemAction,contactId));
 // Upgrade existing immutable originals lazily, before they are removed. New intake always has keys.
 type Original={signal_id:string;kind:string;headers:string;body:string;source_event_id:string};
 const originals=new Map<string,Original>();
 const select="SELECT i.signal_id,i.kind,i.headers,i.body,s.source_event_id FROM capture_items i JOIN signals s ON s.id=i.signal_id WHERE COALESCE(json_array_length(s.payload_json,'$.data.capturePrivacyKeys'),0)=0 AND ";
 const collect=async(sql:string,bindings:unknown[])=>{for(const row of (await db.prepare(select+sql).bind(...bindings).all<Original>()).results)originals.set(row.signal_id,row);};
 await collect("EXISTS(SELECT 1 FROM signal_links WHERE signal_id=s.id AND record_type='contact' AND record_id=?)",[contactId]);
 for(const email of identities)await collect(`(${identityMatch('s.payload_json')} OR ${identityMatch('i.headers')} OR ${identityMatch('i.body')})`,[...identityPatterns(email),...identityPatterns(email),...identityPatterns(email)]);
 for(const original of originals.values())for(const token of await itemKeys(match,original.kind,original.source_event_id,original.body))
  statements.push(proof(itemAction,token,'? IN(SELECT signal_id FROM record_erasure_signals WHERE contact_id=?)',[original.signal_id,contactId]));
 return statements;
}
