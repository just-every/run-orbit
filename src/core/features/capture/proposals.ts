import {createId} from '../../shared/ids';
import {calendarIdentity,existingCalendarProposals,personProposal,proposalKey,type CalendarIdentity} from './proposal-identity';
import {contactEmailKey} from '../records/identity';
import {contactStopStatements} from '../records/suppression-effects';
import {audit} from '../records/shared';
import {IngestionRepository} from '../ingestion/repository';
import type {SignalEvent} from '../ingestion/contracts';
import {CaptureError} from './contracts';
import {linkTargets} from './targets';

export type ProposalKind='link_signal'|'create_contact'|'set_field'|'next_action'|'do_not_contact';
export interface ProposalDraft {kind:ProposalKind;recordType:'contact'|'company'|'opportunity';recordId:string;field?:string;value:string|null;current:string|null;details:Record<string,unknown>}
interface ProposalRow {id:string;signal_id:string;kind:ProposalKind;record_type:'contact'|'company'|'opportunity';record_id:string;field:string|null;current_value:string|null;proposed_value:string|null;details_json:string;status:string}

/**
 * A proposal is keyed by its evidence and its change, so the same evidence never
 * offers the same change twice: a declined proposal stays declined.
 */
export async function proposalStatements(db:D1Database,sourceId:string,signalId:string,eventId:string,evidence:Record<string,unknown>,drafts:ProposalDraft[],at:string,calendar?:CalendarIdentity){
 const prior=calendar?await existingCalendarProposals(db,sourceId,calendar):new Map<string,string>();
 return Promise.all(drafts.map(async draft=>{
  const identity=calendar&&personProposal(draft.kind)?calendarIdentity(calendar):eventId,key=await proposalKey(sourceId,identity,draft);
  return db.prepare("INSERT INTO capture_proposals(id,proposal_key,signal_id,kind,record_type,record_id,field,current_value,proposed_value,details_json,status,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,'pending',? WHERE NOT EXISTS(SELECT 1 FROM capture_proposals WHERE id=?) ON CONFLICT(proposal_key) DO NOTHING")
   .bind(createId(),key,signalId,draft.kind,draft.recordType,draft.recordId,draft.field??null,draft.current,draft.value,JSON.stringify({...draft.details,evidence:{...evidence,quote:draft.details.quote??evidence.quote}}),at,prior.get(key)??null);
 }));
}

export async function listProposals(db:D1Database,filter:{status:'pending'|'accepted'|'declined';recordType?:'contact'|'company'|'opportunity';recordId?:string}){
 const scope=filter.recordType&&filter.recordId?` AND ((p.record_type=? AND p.record_id=?) OR json_extract(p.details_json,'$.companyId')=? OR EXISTS(SELECT 1 FROM json_each(p.details_json,'$.contactIds') WHERE value=?))`:'';
 const rows=(await db.prepare(`SELECT p.id,p.kind,p.record_type,p.record_id,p.field,p.current_value,p.proposed_value,p.details_json,p.status,p.decided_at,p.decided_value,p.created_at,
   s.type AS signal_type,s.occurred_at,cs.name AS source_name,cs.state AS source_state
   FROM capture_proposals p JOIN signals s ON s.id=p.signal_id LEFT JOIN capture_sources cs ON cs.id=s.source_id
   WHERE p.status=?${scope} ORDER BY s.occurred_at DESC,p.id LIMIT 200`).bind(filter.status,...(scope?[filter.recordType,filter.recordId,filter.recordId,filter.recordId]:[])).all<Record<string,unknown>&{details_json:string}>()).results;
 return rows.map(({details_json,...row})=>({...row,details:JSON.parse(details_json)}));
}

const recordsOf=(contactId:string|null,companyId:string|null)=>[...(contactId?[['contact',contactId]]:[]),...(companyId?[['company',companyId]]:[])] as [string,string][];
/** One timeline entry, attributed to the accepting person and to the capture source. */
function entry(db:D1Database,kind:string,actor:string,source:string,payload:unknown,records:[string,string][],at:string){
 const id=createId();
 return [db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,?,?,?,'operator',?,?,?)").bind(id,kind,at,at,actor,source,JSON.stringify(payload)),
  ...records.map(([type,record])=>db.prepare('INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) VALUES(?,?,?)').bind(id,type,record))];
}
const fence=(db:D1Database,name:string,sql:string,...bindings:unknown[])=>db.prepare(`INSERT INTO runtime_controls(name,value) SELECT '${name}',NULL WHERE NOT (${sql})`).bind(...bindings);

/** Apply one reviewed change. Nothing changes unless the record still has the value the person reviewed. */
export async function acceptProposal(db:D1Database,id:string,actor:string,edit?:string){
 const proposal=await db.prepare('SELECT * FROM capture_proposals WHERE id=?').bind(id).first<ProposalRow>();
 if(!proposal)throw new CaptureError(404,'Proposal not found.');
 if(proposal.status!=='pending')throw new CaptureError(409,'This proposal was already reviewed.');
 const signal=await db.prepare('SELECT id,source_id,source_event_id,type,subject,occurred_at,payload_json FROM signals WHERE id=?').bind(proposal.signal_id).first<{id:string;source_id:string;source_event_id:string;type:string;subject:string;occurred_at:string;payload_json:string}>();
 if(!signal)throw new CaptureError(409,'The captured evidence for this proposal no longer exists.');
 const details=JSON.parse(proposal.details_json) as Record<string,any>,evidence={...details.evidence,proposalId:id},at=new Date().toISOString();
 const statements:D1PreparedStatement[]=[fence(db,'capture_proposal_pending',"EXISTS(SELECT 1 FROM capture_proposals WHERE id=? AND status='pending')",id)];
 let decided:string|null=proposal.proposed_value;
 if(proposal.kind==='link_signal'){
  if(await db.prepare('SELECT 1 FROM signal_links WHERE signal_id=?').bind(signal.id).first())throw new CaptureError(409,'This evidence is already linked.');
  const contacts=[];for(const contact of details.contactIds as string[])if(await db.prepare('SELECT id FROM contacts WHERE id=?').bind(contact).first())contacts.push(contact);
  const company=details.companyId&&await db.prepare('SELECT id FROM companies WHERE id=?').bind(details.companyId).first()?details.companyId as string:null;
  const targets=await linkTargets(db,contacts,company,'Operator accepted captured evidence');
  if(!targets.length)throw new CaptureError(409,'The records this evidence names no longer exist.');
  const event={...JSON.parse(signal.payload_json),eventId:signal.source_event_id,type:signal.type,subject:signal.subject,occurredAt:signal.occurred_at} as SignalEvent;
  statements.push(fence(db,'capture_signal_unlinked','NOT EXISTS(SELECT 1 FROM signal_links WHERE signal_id=?)',signal.id),...await new IngestionRepository(db).linkStatements(signal.id,event,targets,actor,at,'operator',signal.source_id,evidence));
 }else if(proposal.kind==='create_contact'){
  const email=proposal.proposed_value!,key=contactEmailKey(email),name=(edit??details.name??'').trim()||null;
  if(name&&name.length>200)throw new CaptureError(400,'Enter a name of at most 200 characters.');
  const holder=await db.prepare("SELECT id FROM contacts WHERE email_key=? UNION SELECT survivor_id AS id FROM record_aliases WHERE record_type='contact' AND identity_key=?").bind(key,key).first<{id:string}>();
  if(holder)throw new CaptureError(409,`Another contact already holds ${email}.`);
  const company=await db.prepare('SELECT id FROM companies WHERE id=?').bind(proposal.record_id).first<{id:string}>();
  const contact=createId();decided=JSON.stringify({name,email});
  // A captured contact is never made contactable (RECORD-012, OUT-001): an operator clears that after real permission.
  statements.push(db.prepare("INSERT INTO contacts(id,company_id,name,email,email_key,contactability,created_at,updated_at) VALUES(?,?,?,?,?,'do_not_contact',?,?)").bind(contact,company?.id??null,name,email,key,at,at),
   ...entry(db,'capture.contact_created',actor,signal.source_id,{contactId:contact,name,email,contactability:'do_not_contact',...evidence},recordsOf(contact,company?.id??null),at),audit(db,actor,'record.created','contact',contact,{source:'capture',proposalId:id}));
 }else if(proposal.kind==='set_field'){
  const field=proposal.field;if(field!=='name'&&field!=='phone')throw new CaptureError(400,'This field cannot be set from captured evidence.');
  decided=(edit??proposal.proposed_value??'').trim();if(!decided||decided.length>(field==='name'?200:64))throw new CaptureError(400,`Enter a ${field} of at most ${field==='name'?200:64} characters.`);
  statements.push(fence(db,'capture_value_current',`EXISTS(SELECT 1 FROM contacts WHERE id=? AND ${field} IS ?)`,proposal.record_id,proposal.current_value),
   db.prepare(`UPDATE contacts SET ${field}=?,updated_at=? WHERE id=?`).bind(decided,at,proposal.record_id),
   db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Contact changed',updated_at=? WHERE recipient_contact_id=?").bind(at,proposal.record_id),
   ...entry(db,'capture.field_set',actor,signal.source_id,{field,previous:proposal.current_value,current:decided,...evidence},recordsOf(proposal.record_id,details.companyId??null),at),audit(db,actor,'record.updated','contact',proposal.record_id,{source:'capture',proposalId:id,field}));
 }else if(proposal.kind==='next_action'){
  const current=JSON.parse(proposal.current_value!) as {state:string;reason:string|null},next=JSON.parse(proposal.proposed_value!) as {state:'now'|'next';reason:string;dueAt:string|null};
  statements.push(fence(db,'capture_queue_current',"EXISTS(SELECT 1 FROM opportunities WHERE id=? AND lifecycle='open' AND queue_state=? AND queue_reason IS ?)",proposal.record_id,current.state,current.reason),
   db.prepare('UPDATE opportunities SET queue_state=?,queue_reason=?,next_due_at=?,updated_at=? WHERE id=?').bind(next.state,next.reason,next.dueAt,at,proposal.record_id),
   ...entry(db,'queue.moved',actor,signal.source_id,{previous:current,current:next,reason:next.reason,...evidence},[['opportunity',proposal.record_id],...recordsOf(null,details.companyId??null)],at),audit(db,actor,'queue.moved','opportunity',proposal.record_id,{source:'capture',proposalId:id}));
 }else{
  if(!await db.prepare('SELECT id FROM contacts WHERE id=?').bind(proposal.record_id).first())throw new CaptureError(409,'This contact no longer exists.');
  statements.push(...await contactStopStatements(db,proposal.record_id),
   ...entry(db,'capture.do_not_contact',actor,signal.source_id,{contactId:proposal.record_id,...evidence},recordsOf(proposal.record_id,details.companyId??null),at),audit(db,actor,'contactability.set','contact',proposal.record_id,{source:'capture',proposalId:id}));
 }
 statements.push(db.prepare("UPDATE capture_proposals SET status='accepted',decided_by=?,decided_at=?,decided_value=? WHERE id=? AND status='pending'").bind(actor,at,decided,id),audit(db,actor,'capture.accepted','capture_proposal',id,{kind:proposal.kind}));
 try{await db.batch(statements);}catch(error){
  if(/NOT NULL constraint failed: runtime_controls|UNIQUE constraint failed/.test(String(error)))throw new CaptureError(409,'The record or this proposal changed since you reviewed it. Reload and review again.');
  throw error;
 }
 return {accepted:true};
}

export async function declineProposal(db:D1Database,id:string,actor:string){
 const at=new Date().toISOString();
 try{await db.batch([fence(db,'capture_proposal_pending',"EXISTS(SELECT 1 FROM capture_proposals WHERE id=? AND status='pending')",id),
  db.prepare("UPDATE capture_proposals SET status='declined',decided_by=?,decided_at=? WHERE id=? AND status='pending'").bind(actor,at,id),audit(db,actor,'capture.declined','capture_proposal',id)]);}
 catch(error){if(/NOT NULL constraint failed: runtime_controls/.test(String(error)))throw new CaptureError(409,'This proposal was already reviewed or does not exist.');throw error;}
 return {declined:true};
}
