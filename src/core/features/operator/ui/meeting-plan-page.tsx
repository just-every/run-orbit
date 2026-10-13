import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {useParams} from '@tanstack/react-router';
import './today.css';
import {formatCurrency,formatDateTime} from './formatters';
import {operatorApi,type WorkspacePresentation} from './operator-api';
import {OperatorShell,OperatorState} from './operator-shell';
import {useOperatorResource} from './use-operator-resource';
import {linePrefix,todayRequest,type MeetingPlan} from './today-api';

type Cited={id:string;title:string;occurredAt:string;href:string;evidence:{id:string}};

/** Turns one cited plan line into an internal next action; it never sends anything. */
function NextAction({signalId,line,onAdded}:{signalId:string;line:Cited;onAdded:()=>void}){
 const [open,setOpen]=useState(false),[error,setError]=useState(''),[done,setDone]=useState<string|null>(null),[busy,setBusy]=useState(false);
 // Keyboard focus follows the swap: into the form when it opens, back to the button on cancel, to the added action's link.
 const button=useRef<HTMLButtonElement>(null),title=useRef<HTMLInputElement>(null),added=useRef<HTMLAnchorElement>(null),returning=useRef(false);
 useEffect(()=>{if(open)title.current?.focus();else if(returning.current){returning.current=false;button.current?.focus();}},[open]);
 useEffect(()=>{if(done)added.current?.focus();},[done]);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError('');
  try{const due=String(data.get('dueAt')??'');const result=await todayRequest<{observed:{target:string}}>(`/meetings/${signalId}/actions`,{body:{title:String(data.get('title')),dueAt:due?new Date(due).toISOString():null,evidenceId:line.evidence.id}});const [,opportunity,,handoff]=result.observed.target.split('/');setDone(`/app/opportunities/${opportunity}#handoff-${handoff}`);setOpen(false);onAdded();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(done)return <a ref={added} className="plan-line__done" href={done}>Next action added</a>;
 if(!open)return <button ref={button} type="button" className="plan-line__action" onClick={()=>setOpen(true)} aria-label={`Make next action from ${line.title}`}>Make next action</button>;
 return <form className="plan-next-action" onSubmit={submit}><label>Next action<input ref={title} name="title" required maxLength={300} defaultValue={line.title}/></label><label>Due (your time, optional)<input name="dueAt" type="datetime-local"/></label><div><button className="operator-button" disabled={busy}>Add next action</button><button type="button" className="operator-text-button" onClick={()=>{returning.current=true;setOpen(false);}}>Cancel</button></div>{error&&<OperatorState kind="error">{error}</OperatorState>}</form>;
}

function PlanNotes({plan,signalId,onSaved}:{plan:MeetingPlan;signalId:string;onSaved:()=>void}){
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError('');setMessage('');
  try{await todayRequest(`/meetings/${signalId}/plan`,{method:'PUT',body:{agenda:String(data.get('agenda')),prep:String(data.get('prep'))}});setMessage('Plan saved as a note.');onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const where=plan.noteTarget?.type??'record';
 return <form className="plan-notes" onSubmit={save} key={plan.note?.entryId??'new'}>
  <section className="operator-surface operator-detail__section"><h2><label htmlFor="plan-agenda">Agenda</label></h2><textarea id="plan-agenda" name="agenda" maxLength={20000} rows={6} defaultValue={plan.note?.agenda??''} placeholder="Add meeting agenda items…"/></section>
  <section className="operator-surface operator-detail__section"><h2><label htmlFor="plan-prep">Prep notes</label></h2><textarea id="plan-prep" name="prep" maxLength={20000} rows={6} defaultValue={plan.note?.prep??''} placeholder="Add notes to prepare for the meeting…"/></section>
  <div className="plan-notes__save"><button className="operator-button" disabled={busy}>Save plan as note</button><p>Saved as a note on the {where}. Nothing is sent to the customer.</p>{plan.note&&<a href={plan.note.href}>View the saved note</a>}{message&&<OperatorState>{message}</OperatorState>}{error&&<OperatorState kind="error">{error}</OperatorState>}</div>
 </form>;
}

function CreateContact({email,companyId,onCreated}:{email:string;companyId:string|null;onCreated:()=>void}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function create(){setBusy(true);setError('');try{const response=await fetch('/api/v1/records/contact',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({email,...(companyId?{company_id:companyId}:{})})});if(!response.ok)throw new Error(((await response.json().catch(()=>({}))) as {error?:string}).error??'The contact could not be created.');onCreated();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <><button type="button" className="operator-button" disabled={busy} onClick={()=>void create()} aria-label={`Create contact ${email}`}>Create contact</button>{error&&<OperatorState kind="error">{error}</OperatorState>}</>;
}

function when(plan:MeetingPlan,presentation:WorkspacePresentation){
 const {start,end}=plan.meeting;
 if(!start)return 'The source gave no meeting time';
 return end?`${formatDateTime(start,presentation)} – ${formatDateTime(end,presentation)}`:formatDateTime(start,presentation);
}

export function MeetingPlanPage(){
 const {id}=useParams({from:'/app/meetings/$id'});
 const load=useCallback(async()=>{const [{plan},{presentation}]=await Promise.all([todayRequest<{plan:MeetingPlan}>(`/meetings/${id}`),operatorApi.readWorkspacePresentation()]);return {plan,presentation};},[id]);
 const resource=useOperatorResource(`meeting:${id}`,load),back=<a href="/app">← Today</a>;
 if(resource.error)return <OperatorShell eyebrow="Meeting plan" title="Meeting" action={back}><OperatorState kind="error">{resource.error.message}</OperatorState></OperatorShell>;
 if(!resource.data)return <OperatorShell eyebrow="Meeting plan" title="Meeting" action={back}><OperatorState>Loading meeting plan…</OperatorState></OperatorShell>;
 const {plan,presentation}=resource.data,canAct=Boolean(plan.primaryOpportunityId),reload=resource.reload;
 return <OperatorShell eyebrow="Meeting plan" title={plan.meeting.subject} action={back}>
  <section className="operator-detail meeting-plan" data-testid="meeting-plan">
   <p className="meeting-plan__when">{when(plan,presentation)} · {plan.meeting.status==='booked'?'Booked':plan.meeting.status==='cancelled'?'Cancelled':'Completed'} · from {plan.meeting.source} · <a href={plan.meeting.href}>recorded {formatDateTime(plan.meeting.occurredAt,presentation)}</a></p>
   <section className="operator-surface operator-detail__section" aria-labelledby="plan-attendees"><h2 id="plan-attendees">Attendees</h2>
    <ul className="plan-list">
     {plan.attendees.map(person=><li key={person.contact.id} className="plan-line"><div className="plan-line__what"><a href={person.contact.href}><strong>{person.contact.name??person.email??'Unnamed contact'}</strong></a><span>{[person.contact.jobTitle,person.company?.name,...person.opportunities.map(o=>o.title)].filter(Boolean).join(' · ')||'No company or opportunity'}{person.contact.contactability==='do_not_contact'?' · Do not contact':''}</span></div></li>)}
     {plan.unresolved.map(person=><li key={person.email} className="plan-line plan-line--unresolved"><div className="plan-line__what"><strong>{person.email}</strong><span>— no record. Orbit links only by this exact address and never guesses.</span></div><div className="plan-line__buttons"><CreateContact email={person.email} companyId={person.company?.id??null} onCreated={reload}/><a className="plan-link-button" href={person.company?`/app/records?kind=company&record=${person.company.id}`:'/app/records?kind=contact'}>Link by exact email</a></div></li>)}
     {!plan.attendees.length&&!plan.unresolved.length&&<li className="plan-line">The source named no attendees.</li>}
    </ul>
   </section>
   <section className="operator-surface operator-detail__section" aria-labelledby="plan-opportunity"><h2 id="plan-opportunity">Opportunity</h2>
    {plan.opportunities.length?<><ul className="plan-list">{plan.opportunities.map(o=><li key={o.id} className="plan-opportunity"><a href={o.href}><strong>{o.title}</strong></a><span>{formatCurrency(o.valueCents,presentation)} {o.lifecycle==='open'?'open':o.lifecycle}</span><span>Stage <b>{o.stage}</b></span><span>Owner <b>{o.owner??'Unassigned'}</b></span></li>)}</ul><p>Open value: {formatCurrency(plan.openValueCents,presentation)}</p></>:<p>No opportunity is linked to this meeting or its attendees.</p>}
   </section>
   <section className="operator-surface operator-detail__section" aria-labelledby="plan-interactions"><h2 id="plan-interactions">Last interactions</h2>
    {plan.interactions.length?<ul className="plan-list">{plan.interactions.map(line=><li key={line.id} className="plan-line"><div className="plan-line__what"><a href={line.href}>{line.title}</a><span>{line.detail}</span></div><time dateTime={line.occurredAt}>{formatDateTime(line.occurredAt,presentation)}</time>{canAct&&<NextAction signalId={id} line={line} onAdded={reload}/>}</li>)}</ul>:<p>No interactions are recorded yet.</p>}
   </section>
   <section className="operator-surface operator-detail__section" aria-labelledby="plan-promises"><h2 id="plan-promises">Outstanding promises</h2>
    {plan.promises.length?<ul className="plan-list">{plan.promises.map(line=><li key={line.id} className="plan-line"><div className="plan-line__what"><a href={line.href}>{linePrefix(line)}: {line.title}</a><span>{line.detail}</span></div><time dateTime={line.occurredAt}>{line.dueAt?`Due ${formatDateTime(line.dueAt,presentation)}`:formatDateTime(line.occurredAt,presentation)}</time>{canAct&&<NextAction signalId={id} line={line} onAdded={reload}/>}</li>)}</ul>:<p>Nothing is owed on these records.</p>}
    {!canAct&&<p>Link this meeting to an opportunity to turn a line into a next action.</p>}
   </section>
   <PlanNotes plan={plan} signalId={id} onSaved={reload}/>
  </section>
 </OperatorShell>;
}
