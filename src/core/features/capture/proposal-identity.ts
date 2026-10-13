import {payloadHash} from '../../platform/source-security';
import type {ProposalDraft} from './proposals';

export interface CalendarIdentity {uid:string;recurrenceId:string|null}
export const personProposal=(kind:string)=>['create_contact','set_field','do_not_contact'].includes(kind);
export const calendarIdentity=(event:CalendarIdentity)=>JSON.stringify([event.uid,event.recurrenceId??'']);
export function proposalKey(source:string,identity:string,draft:Pick<ProposalDraft,'kind'|'recordType'|'recordId'|'field'|'value'>){
 return payloadHash(JSON.stringify([source,identity,draft.kind,draft.recordType,draft.recordId,draft.field??null,draft.value]));
}

/** Verify legacy identities against the durable event ID, independent of truncated display bodies. */
export async function existingCalendarProposals(db:D1Database,source:string,identity:CalendarIdentity){
 const rows=(await db.prepare(`SELECT p.id,p.kind,p.record_type,p.record_id,p.field,p.proposed_value,i.headers,i.body,s.source_event_id,s.type
  FROM capture_items i JOIN capture_proposals p ON p.signal_id=i.signal_id
  JOIN signals s ON s.id=i.signal_id AND s.source_id=i.source_id
  WHERE i.source_id=? AND i.kind='event' AND p.kind IN ('create_contact','set_field','do_not_contact')
   AND instr(char(10)||i.headers||char(10),?)>0`).bind(source,`\nUID: ${identity.uid}\n`).all<{
   id:string;kind:ProposalDraft['kind'];record_type:ProposalDraft['recordType'];record_id:string;field:string|null;proposed_value:string|null;headers:string;body:string;source_event_id:string;type:string;
  }>()).results;
 const existing=new Map<string,string>(),itemIdentity=calendarIdentity(identity);
 for(const row of rows){
  const sequence=/^SEQUENCE: ([^\n]+)$/m.exec(row.headers)?.[1],phase=/^meeting\.(booked|completed|cancelled)$/.exec(row.type)?.[1];
  if(sequence===undefined||!phase)continue;
  // Provider revisions now live in durable headers. Earlier provider captures
  // put the revision before their potentially truncated summary in the original.
  // The exact event hash still verifies the requested recurrence, never its absence.
  const revision=/^X-ORBIT-PROVIDER-REVISION: ?([^\n]+)$/m.exec(row.headers)?.[1]
   ?? /^X-ORBIT-PROVIDER-REVISION:([^\n]+)$/mi.exec(row.body.replace(/\r\n?/g,'\n').replace(/\n[ \t]/g,''))?.[1]?.trim();
  const values=[identity.uid,identity.recurrenceId??'',sequence,phase];
  const eventIds=await Promise.all([values,...(revision?[[...values,revision]]:[])].map(async parts=>`event:${await payloadHash(parts.join('\n'))}`));
  if(!eventIds.includes(row.source_event_id))continue;
  existing.set(await proposalKey(source,itemIdentity,{kind:row.kind,recordType:row.record_type,recordId:row.record_id,field:row.field??undefined,value:row.proposed_value}),row.id);
 }
 return existing;
}
