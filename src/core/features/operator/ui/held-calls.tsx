import {useEffect,useState} from 'react';
import {recordsRequest} from './records-api';
import {OperatorState} from './operator-shell';

/** Calls from numbers no contact has: find the contact and confirm the match. Only the installation owner reviews them. */
export function HeldCalls({onChanged}:{onChanged:()=>void}){
 const [held,setHeld]=useState<any[]|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[contacts,setContacts]=useState<any[]>([]),[matches,setMatches]=useState<Record<string,string>>({});
 async function load(){setHeld((await recordsRequest<any>('calls/settings')).held);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 async function link(id:string){setBusy(true);setError('');setNotice('');try{await recordsRequest(`calls/held/${id}/link`,'POST',{contactId:matches[id]});setNotice('Call matched.');await load();onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="operator-surface workbench-form" aria-labelledby="held-calls"><h2 id="held-calls">Calls without a contact</h2>
  {error&&<OperatorState kind="error">{error}</OperatorState>}{notice&&<OperatorState>{notice}</OperatorState>}
  {held===null?!error&&<p>Loading calls…</p>:held.length?<><label>Find a contact<input type="search" onChange={async e=>{try{setContacts((await recordsRequest<any>('records/contact?q='+encodeURIComponent(e.target.value))).records);}catch(e){setError((e as Error).message);}}}/></label>
   {held.map((call:any)=><form key={call.id} id={`call-${call.id}`} className="workbench-form" onSubmit={e=>{e.preventDefault();void link(call.id);}}><p>{call.from_number} → {call.to_number} · {call.direction} · {call.status}</p><label>Match held call<select aria-label="Match held call" required value={matches[call.id]??''} onChange={e=>setMatches({...matches,[call.id]:e.target.value})}><option value="">Choose the reviewed contact</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name??c.email}</option>)}</select></label><button disabled={busy||!matches[call.id]}>Confirm call match</button></form>)}</>:<p>No calls wait for a contact.</p>}
 </section>;
}
