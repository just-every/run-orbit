import {BookingActivity} from './booking-activity';
import {useRef,useState} from 'react';
import type {OpportunityDetail,WorkspacePresentation} from './operator-api';
import {ManualEntry} from './manual-entry';
import {DataValue} from './data-value';
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
   const signalType=opportunity.signals.find(signal=>signal.id===entry.id)?.type;
   return <li key={entry.id} id={`entry-${entry.id}`}><strong>{payload.booking&&typeof payload.subject==='string'?payload.subject:mailEvidenceTitle(entry.kind,signalType)}</strong>
    <MailEvidenceNote kind={entry.kind} signalType={signalType}/>
    {typeof payload.text==='string'&&<p style={{whiteSpace:'pre-wrap'}}>{payload.text}</p>}
    {typeof payload.subject==='string'&&<p>{payload.subject}</p>}
    <BookingActivity value={payload.booking} presentation={presentation}/>
    {typeof payload.outcome==='string'&&<p>Outcome: {label(payload.outcome)}</p>}
    {typeof payload.note==='string'&&payload.note&&<p style={{whiteSpace:'pre-wrap'}}>{payload.note}</p>}
    <span>Source: {entry.kind.startsWith('provider.')?'SendGrid provider report':entry.kind==='message.accepted'?'Mail provider acceptance receipt':entry.sourceName} · Occurred {formatDateTime(entry.occurredAt,presentation)} · Recorded {formatDateTime(entry.recordedAt,presentation)}</span>
    <details><summary>Recorded details</summary><DataValue value={entry.payload}/></details>
    {entry.kind.startsWith('manual.')&&<div className="workbench-actions">
     <button type="button" onClick={event=>{trigger.current=event.currentTarget;setEditing(entry);}}>Edit entry</button>
     <DeleteTimelineEntry kind="opportunity" recordId={opportunity.id} entryId={entry.id} onDeleted={()=>{if(editing?.id===entry.id)setEditing(null);reload();}}/>
    </div>}
   </li>;
  })}</ol>:<p>No activity recorded yet.</p>}
  <ScrollToHash ready={opportunity.timeline.length>0}/>
  {editing&&<><ManualEntry key={editing.id} kind="opportunity" id={opportunity.id} contacts={opportunity.contacts.map(c=>({...c,name:c.name??undefined}))} entry={{...editing,occurred_at:editing.occurredAt,payload_json:JSON.stringify(editing.payload)}} onSaved={()=>{finishEditing();reload();}}/><button type="button" onClick={finishEditing}>Cancel editing</button></>}
 </section>;
}
