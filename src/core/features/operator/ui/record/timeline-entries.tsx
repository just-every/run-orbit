import type {ReactNode} from 'react';
import {AuditValue} from '../audit-value';
import {EntryPrivacy} from '../entry-privacy';
import {DeleteTimelineEntry} from '../delete-timeline-entry';
import {mailEvidenceTitle} from '../mail-evidence';
import {formatDateTime,label,sourceLabel} from '../formatters';
import type {RecordKind} from '../records-api';
import type {ActivityEntry} from './activity';
import {EntryEditor} from './entry-editor';
import {signalKind} from './next-action';

/** A timeline line as both record reads give it. */
export interface TimelineLine{id:string;kind:string;occurredAt:string;recordedAt:string;actorType:string;actorName:string|null;sourceName:string;signalType?:string|null;payload:Record<string,unknown>}

const words:Record<string,string>={'manual.note':'Note','manual.call':'Call','manual.meeting':'Meeting','stage.changed':'Moved','owner.changed':'Changed','record.updated':'Changed','record.created':'Created','lifecycle.changed':'Closed','message.accepted':'Sent','provider.delivered':'Delivered','provider.bounce':'Bounce','provider.open':'Opened','provider.click':'Clicked'};
const text=(value:unknown)=>typeof value==='string'?value:'';
const firstLine=(value:string)=>value.split('\n')[0]??'';
const restLines=(value:string)=>value.split('\n').slice(1).join('\n');
const quote=(value:string)=>value.length>160?`“${value.slice(0,157).trimEnd()}…”`:`“${value}”`;

/** The kind word, title and quiet line for one timeline entry, in the owner's words; evaluations stay in Recorded details.
 * contactNames names the record's people by id and by lowercased email. */
export function timelineEntry({line,kind,recordId,contactNames,reload,onChanged}:{line:TimelineLine;kind:RecordKind;recordId:string;contactNames:Map<string,string>;reload:()=>void;onChanged?:()=>void}):ActivityEntry|null{
 if(line.kind==='opportunity.evaluated'||line.kind==='draft.created')return null;
 const payload=line.payload,type=line.signalType??text(payload.type)??'',by=line.actorType==='operator'&&line.actorName?`Recorded by ${line.actorName}`:`From ${sourceLabel(line.actorName??line.sourceName)}`;
 let kindWord=words[line.kind]??(line.kind.includes('.')&&/^(email|meeting|form|page|content)\./.test(line.kind)?signalKind(line.kind):label(line.kind));
 let title:ReactNode=text(payload.subject)||firstLine(text(payload.text))||mailEvidenceTitle(line.kind,type||undefined),rest:ReactNode=null,tools:ReactNode=null;
 if(line.kind==='signal.recorded'){kindWord=signalKind(type||'email.replied');rest=by;}
 else if(/^(email|meeting|form|page|content)\./.test(line.kind)){rest=text(payload.body)?quote(text(payload.body)):by;}
 else if(line.kind==='message.accepted'){const recipient=text(payload.recipient);rest=`To ${contactNames.get(recipient.toLowerCase())??(recipient||'the recipient')} · accepted by the mail provider`;}
 else if(line.kind==='stage.changed'){title=`${text(payload.previousStageName)||'A stage'} → ${text(payload.currentStageName)||'a stage'}`;rest=by;}
 else if(line.kind==='lifecycle.changed'){const state=text(payload.state);kindWord=state==='won'?'Won':state==='lost'?'Lost':'Reopened';title=state==='open'?'Reopened':`Closed as ${state}`;rest=text(payload.reason)||by;}
 else if(line.kind==='record.updated'||line.kind==='record.created'||line.kind.startsWith('relationship.')){title=firstLine(text(payload.text))||label(line.kind);rest=[restLines(text(payload.text)),line.actorName?`By ${line.actorName}`:''].filter(Boolean).join('\n');kindWord=words[line.kind]??'Changed';}
 else if(line.kind.startsWith('manual.')){
  const minutes=Number(payload.durationMinutes??0),people=(Array.isArray(payload.contactIds)?payload.contactIds:[]).map(id=>contactNames.get(String(id))).filter(Boolean);
  rest=[restLines(text(payload.text)),[minutes?`${minutes} minutes`:'',people.length?`with ${people.join(', ')}`:''].filter(Boolean).join(' · ')].filter(Boolean).join('\n')||null;
  if(!['twilio','calendar-writeback'].includes(line.sourceName))tools=<><details><summary>Edit entry</summary><EntryEditor kind={kind} recordId={recordId} entry={{id:line.id,kind:line.kind,occurredAt:line.occurredAt,text:text(payload.text),durationMinutes:minutes,contactIds:Array.isArray(payload.contactIds)?payload.contactIds.map(String):[]}} onSaved={()=>onChanged?.()}/></details><DeleteTimelineEntry kind={kind} recordId={recordId} entryId={line.id} onDeleted={reload}/></>;
 }
 else rest=text(payload.note)||by;
 return {key:`timeline-${line.id}`,anchor:`entry-${line.id}`,kind:kindWord,title,line:rest,at:line.occurredAt,tools,
  details:<><p className="r-muted">Occurred {formatDateTime(line.occurredAt)} · recorded {formatDateTime(line.recordedAt)} · {line.actorName??label(line.actorType)} · {sourceLabel(line.sourceName)}</p><AuditValue value={payload}/>{line.kind.startsWith('manual.')?<EntryPrivacy source="entry" id={line.id}/>:null}</>};
}
