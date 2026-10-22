import {useEffect,useState} from 'react';
import {api} from '../fold-ui/workspace';
import type {Dashboards} from './repository';
import './dashboards.css';
type Directory=Awaited<ReturnType<Dashboards['list']>>;
export function DashboardDirectory({workspace}:{workspace:string}){
 const base=`/api/v2/workspaces/${encodeURIComponent(workspace)}/dashboards`;
 const [data,setData]=useState<Directory|null>(null),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;api<Directory>(base).then(value=>{if(active)setData(value);}).catch(e=>active&&setError(e.message));return()=>{active=false;};},[base]);
 const create=async()=>{setBusy(true);try{const id=crypto.randomUUID(),month=new Date().toISOString().slice(0,7);await api(`${base}/${id}`,{version:0,definition:{name,filters:{ownerIds:[],pipelineIds:[],from:month,through:month,field:null},tiles:[]}},'PUT');window.location.assign(`/app/dashboards/${encodeURIComponent(id)}`);}catch(e){setError(e instanceof Error?e.message:String(e));setBusy(false);}};
 return <section className="operator-surface dash-directory" aria-labelledby="dashboards-heading"><h2 id="dashboards-heading">Dashboards</h2>{error&&<p role="alert" className="operator-state operator-state--error">{error}</p>}{data?<>{!data.items.length?<p>No dashboards yet</p>:<ul>{data.items.map(item=><li key={item.id}><a href={`/app/dashboards/${encodeURIComponent(item.id)}`}>{item.name}</a> · version {item.version}{item.isDefault&&<span className="ob-chip">Your default</span>}<button className="dash-text-button" onClick={async()=>{try{await api(`${base}/${encodeURIComponent(item.id)}/default`,{enabled:!item.isDefault},'PUT');setData(await api(base));}catch(e){setError(e instanceof Error?e.message:String(e));}}}>{item.isDefault?'Remove as my default':'Make this my default'}</button></li>)}</ul>}{data.canDefine&&<form onSubmit={e=>{e.preventDefault();void create();}}><label>Dashboard name<input value={name} maxLength={120} required onChange={e=>setName(e.target.value)}/></label><button className="ob-pill" disabled={busy}>Create a dashboard</button></form>}</>:<p role="status">Loading dashboards…</p>}</section>;
}
