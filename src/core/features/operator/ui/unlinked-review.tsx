import {useState,type FormEvent} from 'react';
import {label,formatDate} from './formatters';
import {RecordSelection} from './record-selection';
import {recordsRequest,type RecordKind} from './records-api';
export interface Unlinked {id:string;source_id:string;source_name:string|null;type:string;subject:string;occurred_at:string;reason:string;email:string|null;domain:string|null;name:string|null}
const linkSignal=(id:string,type:RecordKind,record:string)=>recordsRequest(`sources/unlinked/${id}/link`,'POST',{type,id:record});
/** Who an event came from, as the source sent it: the details an operator matches a record by. */
const sender=(signal:Unlinked)=>[signal.name,signal.email,signal.domain&&!signal.email?`domain ${signal.domain}`:null].filter(Boolean).join(' · ');

/** Events without a record: show who sent each one, then link it to an existing record or a new contact made from it. */
export function UnlinkedReview({signals,onChange}:{signals:Unlinked[]|undefined;onChange:()=>void}){
 const [selection,setSelection]=useState<Unlinked|null>(null),[recordKind,setRecordKind]=useState<RecordKind>('contact'),[saving,setSaving]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
 async function run(work:()=>Promise<string>){setSaving(true);setError('');setStatus('');try{setStatus(await work());setSelection(null);onChange();}catch(e){setError(e instanceof Error?e.message:'The event could not be linked.');}finally{setSaving(false);}}
 function link(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!selection)return;const values=new FormData(event.currentTarget),chosen=selection;void run(async()=>{await linkSignal(chosen.id,values.get('type') as RecordKind,String(values.get('id')));return `Linked “${chosen.subject||label(chosen.type)}”.`;});}
 function createContact(signal:Unlinked){void run(async()=>{const contact=await recordsRequest<{id:string}>('records/contact','POST',{name:signal.name||signal.email,email:signal.email});await linkSignal(signal.id,'contact',contact.id);return `Created the contact ${signal.name||signal.email} and linked this event to them.`;});}
 return <section className="operator-surface operator-detail__section"><h2>Events without a record</h2><p>Events stay out of scores until you link them to a record.</p>
  {error&&<p role="alert">{error}</p>}{status&&<p role="status">{status}</p>}
  {signals?.length===0&&<p>All customer events are linked.</p>}
  {signals?.map(signal=><article className="operator-timeline__entry" key={signal.id} id={`unlinked-${signal.id}`}><h3>{signal.subject||label(signal.type)}</h3><p>From: {sender(signal)||'The source sent no email or name'}</p><p>{signal.source_name??'Connected source'} · {formatDate(signal.occurred_at)}</p><p>{signal.reason}</p>
   <button className="orbit-button orbit-button--secondary" onClick={()=>setSelection(signal)}>Link to an existing record</button>
   {signal.email&&<button className="orbit-button orbit-button--secondary" disabled={saving} onClick={()=>createContact(signal)}>Create a contact from this</button>}</article>)}
  {selection&&<form className="workbench-form" onSubmit={link}><h3>Link {selection.subject||label(selection.type)}</h3><p>From: {sender(selection)||'The source sent no email or name'}</p><label>Record type<select name="type" value={recordKind} onChange={e=>setRecordKind(e.target.value as RecordKind)}><option value="contact">Contact</option><option value="company">Company</option><option value="opportunity">Opportunity</option></select></label><RecordSelection kind={recordKind}/><button className="orbit-button orbit-button--primary" disabled={saving}>Confirm link</button><button type="button" className="orbit-button orbit-button--quiet" onClick={()=>setSelection(null)}>Cancel</button></form>}
 </section>;
}
