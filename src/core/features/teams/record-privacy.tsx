import {useEffect,useState} from 'react';
import {recordsRequest} from '../operator/ui/records-api';
type Visibility='workspace'|'restricted';
type PrivacyRecord={id:string;kind:string;name:string;visibility:Visibility};
/** Privacy changes record access only; the record's owner remains independent. */
export function RecordPrivacy({busy,change}:{busy:boolean;change:(kind:string,id:string,visibility:Visibility)=>Promise<boolean>}){
 const [query,setQuery]=useState(''),[records,setRecords]=useState<PrivacyRecord[]>([]),[selected,setSelected]=useState<PrivacyRecord>(),[error,setError]=useState('');
 useEffect(()=>{let current=true;const timer=setTimeout(()=>{void recordsRequest<{records:PrivacyRecord[]}>('settings/teams/records?q='+encodeURIComponent(query)).then(result=>{if(current){setRecords(result.records);setError('');}}).catch(e=>{if(current)setError((e as Error).message);});},200);return()=>{current=false;clearTimeout(timer);};},[query]);
 const choices=selected&&!records.some(r=>r.id===selected.id&&r.kind===selected.kind)?[selected,...records]:records;
 return <details className="sales-teams__item"><summary>Manage record privacy</summary><fieldset disabled={busy} className="sales-teams__form">
  <label>Find a record to protect<input value={query} onChange={e=>setQuery(e.target.value)}/></label>
  {error&&<p role="alert">{error}</p>}
  <label>Record privacy selection<select value={selected?selected.kind+':'+selected.id:''} onChange={e=>setSelected(choices.find(r=>r.kind+':'+r.id===e.target.value))}><option value="">Choose a record</option>{choices.map(r=><option key={r.kind+':'+r.id} value={r.kind+':'+r.id}>{r.name} · {r.kind==='company'?'Company':r.kind==='contact'?'Contact':r.kind==='opportunity'?'Deal':'Custom record'}</option>)}</select></label>
  {selected&&<><label>Record visibility<select value={selected.visibility} onChange={e=>{const visibility=e.target.value as Visibility;setSelected({...selected,visibility});void change(selected.kind,selected.id,visibility).then(saved=>{if(saved)setRecords(rows=>rows.map(r=>r.id===selected.id&&r.kind===selected.kind?{...r,visibility}:r));});}}><option value="workspace">Workspace access</option><option value="restricted">Private to owner and explicit shares</option></select></label><p>Sales administrators retain recovery access. Each viewer's role and field permissions still apply.</p></>}
 </fieldset></details>;
}
