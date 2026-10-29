import {EntryPrivacy} from './entry-privacy';
import {useRef,useState} from 'react';
import type {OpportunityDetail,WorkspacePresentation} from './operator-api';
import {ManualEntry} from './manual-entry';
import {AuditValue} from './audit-value';
import {DeleteTimelineEntry} from './delete-timeline-entry';
import {ScrollToHash} from './hash-target';
import {formatDateTime,label} from './formatters';
import {mailEvidenceTitle,MailEvidenceNote} from './mail-evidence';

export function OpportunityTimeline({opportunity,presentation,reload}:{opportunity:OpportunityDetail;presentation:WorkspacePresentation;reload:()=>void}){
 const[editing,setEditing]=useState<OpportunityDetail['timeline'][number]|null>(null),trigger=useRef<HTMLElement|null>(null);
 function finishEditing(){setEditing(null);trigger.current?.focus();}
 return <section className="operator-surface operator-detail__section" data-testid="opportunity-timeline"><h2>Timeline</h2>
  {opportunity.timeline.length?<ol className="operator-timeline">{opportunity.timeline.map(entry=>{
   const payload=entry.payload&&typeof entry.payload==='object'?entry.payload as Record<string,unknown>:{};
   const approvers=Array.isArray(payload.approvers)?payload.approvers.filter((person):person is {name:string}=>Boolean(person)&&typeof person==='object'&&typeof person.name==='string').map(person=>person.name):[];
   const signalType=opportunity.signals.find(signal=>signal.id===entry.id)?.type;
   return <li key={entry.id} id={`entry-${entry.id}`}><strong>{mailEvidenceTitle(entry.kind,signalType)}</strong>
    <MailEvidenceNote kind={entry.kind} signalType={signalType}/>
    {entry.actorType==='agent'&&<p>Prepared by {entry.actorName}{approvers.length?` · Approved by ${approvers.join(', ')}`:''}</p>}
    {typeof payload.text==='string'&&<p style={{whiteSpace:'pre-wrap'}}>{payload.text}</p>}
    {typeof payload.subject==='string'&&<p>{payload.subject}</p>}
    {typeof payload.outcome==='string'&&<p>Outcome: {label(payload.outcome)}</p>}
    {typeof payload.note==='string'&&payload.note&&<p style={{whiteSpace:'pre-wrap'}}>{payload.note}</p>}
    <span>Source: {entry.kind.startsWith('provider.')?'SendGrid provider report':entry.kind==='message.accepted'?'Mail provider acceptance receipt':entry.sourceName} · Occurred {formatDateTime(entry.occurredAt,presentation)} · Recorded {formatDateTime(entry.recordedAt,presentation)}</span>
    <details><summary>Recorded details</summary><AuditValue value={entry.payload}/></details>
    {entry.kind.startsWith('manual.')&&<EntryPrivacy source="entry" id={entry.id}/>}
    {entry.kind.startsWith('manual.')&&!['twilio','calendar-writeback'].includes(entry.sourceName)&&<div className="workbench-actions">
     <button type="button" onClick={event=>{trigger.current=event.currentTarget;setEditing(entry);}}>Edit entry</button>
     <DeleteTimelineEntry kind="opportunity" recordId={opportunity.id} entryId={entry.id} onDeleted={()=>{if(editing?.id===entry.id)setEditing(null);reload();}}/>
    </div>}
   </li>;
  })}</ol>:<p>No activity recorded yet.</p>}
  <ScrollToHash ready={opportunity.timeline.length>0}/>
  {editing&&<><ManualEntry key={editing.id} kind="opportunity" id={opportunity.id} contacts={opportunity.contacts.map(c=>({...c,name:c.name??undefined}))} entry={{...editing,occurred_at:editing.occurredAt,payload_json:JSON.stringify(editing.payload)}} onSaved={()=>{finishEditing();reload();}}/><button type="button" onClick={finishEditing}>Cancel editing</button></>}
 </section>;
}
