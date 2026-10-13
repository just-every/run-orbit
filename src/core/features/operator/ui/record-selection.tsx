import {useEffect,useState} from 'react';
import {recordsRequest,type CustomerRecord,type RecordKind} from './records-api';
/** Search the real record inventory before explicitly choosing a link target. */
export function RecordSelection({kind,name='id'}:{kind:RecordKind;name?:string}){
 const [query,setQuery]=useState(''),[rows,setRows]=useState<CustomerRecord[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setSelected('');},[kind]);
 useEffect(()=>{let active=true;const timer=setTimeout(()=>{void recordsRequest<{records:CustomerRecord[]}>(`records/${kind}?${new URLSearchParams({q:query})}`).then(data=>{if(active){setRows(data.records);setError('');}}).catch(e=>{if(active)setError(e.message);});},200);return()=>{active=false;clearTimeout(timer);};},[kind,query]);
 return <><label>Find {kind}<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setSelected('');}} placeholder="Search name, email or recorded evidence"/></label><label>Select {kind}<select name={name} value={selected} onChange={e=>setSelected(e.target.value)} required><option value="">Choose a matching record</option>{rows.map(row=><option key={row.id} value={row.id}>{row.title??row.name??row.email??'Unnamed record'}{row.email&&row.name?` · ${row.email}`:''}</option>)}</select></label>{error&&<p role="alert">{error}</p>}</>;
}
