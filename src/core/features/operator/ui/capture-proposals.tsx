import {useCallback,useState} from 'react';
import {OperatorState} from './operator-shell';
import {useOperatorResource} from './use-operator-resource';

interface Evidence {source:string;sender:string|null;date:string;subject:string;quote:string[]}
export interface CaptureProposal {
 id:string;kind:'link_signal'|'create_contact'|'set_field'|'next_action'|'do_not_contact';record_type:string;record_id:string;field:string|null;
 current_value:string|null;proposed_value:string|null;signal_type:string;occurred_at:string;source_name:string|null;source_state:string|null;
 details:{evidence:Evidence;names?:string[];name?:string|null;companyName?:string;title?:string;contactIds?:string[]};
}
async function post(path:string,body:unknown){
 const response=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json().catch(()=>({})) as {error?:string};if(!response.ok)throw new Error(result.error??'Orbit could not apply that review.');
}
const queue=(value:string|null)=>{if(!value)return 'Not set';const parsed=JSON.parse(value) as {state:string;reason:string|null;dueAt?:string|null};return `${parsed.state==='none'?'Not in NOW or NEXT':parsed.state.toUpperCase()}${parsed.reason?` · ${parsed.reason}`:''}${parsed.dueAt?` · until ${new Date(parsed.dueAt).toLocaleString()}`:''}`;};
const kinds:Record<string,string>={'email.replied':'reply','email.sent':'sent message','email.bounced':'delivery report','meeting.booked':'booked meeting','meeting.completed':'completed meeting','meeting.cancelled':'cancelled meeting'};
const evidenceKind=(type:string)=>type.endsWith(':email.auto_replied')?'automatic reply':type.endsWith(':email.forwarded')?'forwarded message':kinds[type]??'evidence';
function title(proposal:CaptureProposal){
 const d=proposal.details;
 switch(proposal.kind){
  case 'link_signal':return `Link this ${evidenceKind(proposal.signal_type)} to ${(d.names??[]).join(', ')}`;
  case 'create_contact':return `Create contact ${proposal.proposed_value} at ${d.companyName}`;
  case 'set_field':return `Set ${proposal.field} from this message`;
  case 'next_action':return `Change the next action for ${d.title}`;
  default:return 'Set do-not-contact';
 }
}
/** Old and new side by side for every proposal that touches an existing value. */
function Change({proposal}:{proposal:CaptureProposal}){
 if(proposal.kind==='link_signal')return <p>Accepting appends this evidence to each named contact, their company and their opportunities, once.</p>;
 if(proposal.kind==='create_contact')return <p>New contact, created as do-not-contact: Orbit never makes a captured contact contactable. Name from the message: {proposal.details.name||'none given'}.</p>;
 const current=proposal.kind==='next_action'?queue(proposal.current_value):proposal.kind==='do_not_contact'?'Contactable':proposal.current_value??'Empty';
 const proposed=proposal.kind==='next_action'?queue(proposal.proposed_value):proposal.kind==='do_not_contact'?'Do not contact':proposal.proposed_value??'';
 return <table className="capture-change"><caption className="sr-only">Current and proposed value</caption><thead><tr><th scope="col">Current</th><th scope="col">Proposed</th></tr></thead><tbody><tr><td>{current}</td><td>{proposed}</td></tr></tbody></table>;
}
export function CaptureProposals({recordType,recordId,onChanged}:{recordType?:string;recordId?:string;onChanged?:()=>void}){
 const query=recordType&&recordId?`?${new URLSearchParams({recordType,recordId})}`:'';
 const load=useCallback(async()=>{const response=await fetch(`/api/v1/capture/proposals${query}`,{credentials:'same-origin'});if(!response.ok)throw new Error('Proposed changes could not load.');return await response.json() as {proposals:CaptureProposal[]};},[query]);
 const resource=useOperatorResource(`capture-proposals${query}`,load),[busy,setBusy]=useState(''),[editing,setEditing]=useState(''),[value,setValue]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState('');
 async function review(proposal:CaptureProposal,action:'accept'|'decline',edited?:string){
  setBusy(proposal.id);setError('');setStatus('');
  try{await post(`/api/v1/capture/proposals/${proposal.id}/${action}`,action==='accept'&&edited!==undefined?{value:edited}:{});setStatus(action==='accept'?`Accepted: ${title(proposal)}.`:`Declined: ${title(proposal)}. It will not be offered again for this evidence.`);setEditing('');resource.reload();onChanged?.();}
  catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 const proposals=resource.data?.proposals??[];
 return <section className="operator-surface operator-detail__section" aria-labelledby={`capture-proposals${recordId??''}`}><h2 id={`capture-proposals${recordId??''}`}>Proposed changes</h2>
  <p>Each change rests on the captured evidence shown with it. Nothing changes until a person accepts it.</p>
  {resource.loading&&<OperatorState>Loading proposed changes…</OperatorState>}{(error||resource.error)&&<OperatorState kind="error">{error||resource.error?.message}</OperatorState>}{status&&<OperatorState>{status}</OperatorState>}
  {resource.data&&!proposals.length&&<p>No proposed changes are waiting.</p>}
  {proposals.map(proposal=>{const e=proposal.details.evidence,editable=proposal.kind==='set_field'||proposal.kind==='create_contact';return <article className="operator-timeline__entry capture-proposal" key={proposal.id} aria-label={title(proposal)}>
   <h3>{title(proposal)}</h3>
   <p>From {e.sender??'unknown sender'} · {new Date(e.date).toLocaleString()} · {e.subject||'No subject'} · {e.source}{proposal.source_state==='disconnected'?' (disconnected source)':''}</p>
   {e.quote.length>0&&<blockquote className="capture-quote">{e.quote.map((line,index)=><p key={index}>{line}</p>)}</blockquote>}
   <Change proposal={proposal}/>
   {editing===proposal.id?<form className="workbench-form" onSubmit={event=>{event.preventDefault();void review(proposal,'accept',value);}}><label>{proposal.kind==='create_contact'?'Contact name':`New ${proposal.field}`}<input value={value} onChange={event=>setValue(event.target.value)} maxLength={200}/></label><div className="workbench-actions"><button className="orbit-button orbit-button--primary" disabled={busy===proposal.id}>Accept edited value</button><button type="button" className="orbit-button orbit-button--quiet" onClick={()=>setEditing('')}>Cancel editing</button></div></form>
   :<div className="workbench-actions"><button className="orbit-button orbit-button--primary" disabled={busy===proposal.id} onClick={()=>void review(proposal,'accept')}>Accept</button>{editable&&<button className="orbit-button orbit-button--secondary" disabled={busy===proposal.id} onClick={()=>{setEditing(proposal.id);setValue(proposal.kind==='create_contact'?proposal.details.name??'':proposal.proposed_value??'');}}>Edit</button>}<button className="orbit-button orbit-button--quiet" disabled={busy===proposal.id} onClick={()=>void review(proposal,'decline')}>Decline</button></div>}
  </article>;})}
 </section>;
}
