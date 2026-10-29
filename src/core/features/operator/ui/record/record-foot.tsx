import {useRef,useState} from 'react';
import {useNavigate} from '@tanstack/react-router';
import {InlineConfirm} from '../autosave/inline-confirm';
import {formatDateTime,formatDay,formatTime} from '../formatters';
import {recordsRequest,type RecordKind} from '../records-api';
import {listPath} from '../records-query';

type Asking={kind:'won'|'lost'}|{kind:'delete'}|null;
const noun:Record<RecordKind,string>={opportunity:'opportunity',contact:'contact',company:'company'};

/** "Created 29 Oct 2026, 4:41 pm · updated 7:05 pm": the update's day only when it differs. */
export function CreatedLine({created,updated}:{created?:string;updated?:string}){
 if(!created)return null;
 const sameDay=updated&&formatDay(updated)===formatDay(created);
 return <p className="r-created">Created {formatDateTime(created)}{updated&&updated!==created?` · updated ${sameDay?formatTime(updated):formatDateTime(updated)}`:''}</p>;
}

/** The record's foot: a deal closes as won or lost (asking once, with why) or reopens; any record deletes, asking once
 * in the same place. Never a dialog. */
export function RecordFoot({kind,id,name,record,deleteSentence,onChanged}:{kind:RecordKind;id:string;name:string;record:Record<string,any>;deleteSentence:string;onChanged:()=>void}){
 const navigate=useNavigate(),opener=useRef<HTMLButtonElement|null>(null),[asking,setAsking]=useState<Asking>(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const close=(state:'won'|'lost'|'open')=>run(async()=>{await recordsRequest(`records/opportunity/${id}/lifecycle`,'POST',{state,reason:state==='open'?'':reason});setAsking(null);setReason('');onChanged();});
 const remove=()=>run(async()=>{await recordsRequest(`records/${kind}/${id}`,'DELETE',{confirmed:true});await navigate({to:listPath[kind],replace:true,ignoreBlocker:true});});
 // Keeping things as they were returns focus to the button that asked.
 const keep=()=>{setAsking(null);setError('');requestAnimationFrame(()=>opener.current?.focus());};
 const ask=(next:Asking)=>(event:React.MouseEvent<HTMLButtonElement>)=>{opener.current=event.currentTarget;setAsking(next);setError('');};
 const closed=kind==='opportunity'&&record.lifecycle!=='open';
 return <div className="r-foot">
  {closed?<p className="r-closed">{record.lifecycle==='won'?'Won':'Lost'}{record.closed_at?` ${formatDay(record.closed_at)}`:''}{record.close_reason?` · ${record.close_reason}`:''}</p>:null}
  <div className="r-foot-actions">
   {kind==='opportunity'&&!closed?<><button type="button" className="r-pill" aria-expanded={asking?.kind==='won'} onClick={ask({kind:'won'})}>Close as won</button><button type="button" className="r-pill" aria-expanded={asking?.kind==='lost'} onClick={ask({kind:'lost'})}>Close as lost</button></>:null}
   {closed?<button type="button" className="r-pill" disabled={busy} onClick={()=>void close('open')}>Reopen</button>:null}
   <button type="button" className="operator-text-button r-danger" aria-expanded={asking?.kind==='delete'} onClick={ask({kind:'delete'})}>Delete {noun[kind]}</button>
  </div>
  {asking&&asking.kind!=='delete'?<InlineConfirm focusAction={false} sentence={`Close ${name} as ${asking.kind}? Its scheduled follow-ups stop.`} action={`Close as ${asking.kind}`} keep="Cancel" busy={busy} error={error} onConfirm={()=>void close(asking.kind)} onKeep={keep}>
   <label>Why it closed<textarea autoFocus rows={2} maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label>
  </InlineConfirm>:null}
  {asking?.kind==='delete'?<InlineConfirm sentence={deleteSentence} action="Delete" keep="Keep it" busy={busy} error={error} onConfirm={()=>void remove()} onKeep={keep}/>:null}
  {!asking&&error?<p className="r-fail" role="alert">{error}</p>:null}
  <CreatedLine created={record.created_at} updated={record.updated_at}/>
 </div>;
}
