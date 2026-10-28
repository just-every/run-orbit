import {useEffect,useState} from 'react';
import {recordsRequest} from '../operator/ui/records-api';
import {FieldGrants} from './fields';
import type {ShareInput,TeamSettings} from './contracts';
export function ShareEditor({data,busy,create}:{data:TeamSettings;busy:boolean;create:(input:ShareInput)=>Promise<boolean>}){
 const [query,setQuery]=useState(''),[records,setRecords]=useState<{kind:string;id:string;name:string}[]>([]),[error,setError]=useState('');
 const [input,setInput]=useState<ShareInput>({kind:'',recordId:'',subjectKind:'user',subjectId:'',fields:[],canEdit:false});
 useEffect(()=>{const abort=new AbortController(),timer=setTimeout(()=>{void recordsRequest<{records:typeof records}>('settings/teams/records?q='+encodeURIComponent(query)).then(r=>{if(!abort.signal.aborted){setRecords(r.records);setError('');}}).catch(e=>{if(!abort.signal.aborted)setError((e as Error).message);});},200);return()=>{abort.abort();clearTimeout(timer);};},[query]);
 return <details className="sales-teams__item" open={!data.shares.length}><summary>Share a record</summary><form className="workbench-form" onSubmit={e=>{e.preventDefault();void create(input);}}><fieldset disabled={busy} className="sales-teams__form">
  <label>Find a record<input value={query} onChange={e=>setQuery(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}
  <label>Record<select required value={input.recordId?input.kind+':'+input.recordId:''} onChange={e=>{const [kind,recordId]=e.target.value.split(':');setInput({...input,kind,recordId});}}><option value="">Choose a record</option>{records.map(r=><option key={r.kind+':'+r.id} value={r.kind+':'+r.id}>{r.name} · {r.kind==='opportunity'?'Deal':r.kind==='contact'?'Contact':r.kind==='company'?'Company':'Custom record'}</option>)}</select></label>
  <label>Share with<select value={input.subjectKind} onChange={e=>setInput({...input,subjectKind:e.target.value as ShareInput['subjectKind'],subjectId:''})}><option value="user">A user</option><option value="team">A team</option></select></label>
  <label>{input.subjectKind==='team'?'Team':'User'}<select required value={input.subjectId} onChange={e=>setInput({...input,subjectId:e.target.value})}><option value="">Choose a recipient</option>{(input.subjectKind==='team'?data.teams.filter(t=>t.active):data.members).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  <FieldGrants value={input.fields} onChange={fields=>setInput({...input,fields})}/>
  <label><input type="checkbox" checked={input.canEdit} onChange={e=>setInput({...input,canEdit:e.target.checked})}/>Allow editing within this user's role and field permissions</label>
  <button type="submit" className="operator-button">Share record</button>
 </fieldset></form></details>;
}
