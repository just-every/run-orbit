import {useEffect,useState} from 'react';
import {api} from '../fold-ui/workspace';
import {Row} from '../reports/rows';
import type {Dashboards} from './repository';
import './dashboards.css';
type Directory=Awaited<ReturnType<Dashboards['list']>>;
/** Creates an empty dashboard for this month in the workspace zone and opens it. */
export async function createDashboard(workspace:string,name:string){
 const base=`/api/v2/workspaces/${encodeURIComponent(workspace)}/dashboards`;
 const {timezone}=await api<{timezone:string}>(`/api/v2/workspaces/${encodeURIComponent(workspace)}/operations/reports/suite`),parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit'}).formatToParts(new Date()).filter(part=>part.type!=='literal').map(part=>[part.type,part.value])),id=crypto.randomUUID(),month=`${parts.year}-${parts.month}`;
 await api(`${base}/${id}`,{version:0,definition:{name,filters:{ownerIds:[],pipelineIds:[],from:month,through:month,field:null},tiles:[]}},'PUT');window.location.assign(`/app/dashboards/${encodeURIComponent(id)}`);
}
/** Every dashboard the viewer can open, their default first, and the default change on each row. */
export function useDashboardDirectory(workspace:string){
 const base=`/api/v2/workspaces/${encodeURIComponent(workspace)}/dashboards`;
 const [data,setData]=useState<Directory|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;api<Directory>(base).then(value=>{if(active)setData(value);}).catch(e=>active&&setError(e.message));return()=>{active=false;};},[base]);
 const setDefault=async(id:string,enabled:boolean)=>{try{await api(`${base}/${encodeURIComponent(id)}/default`,{enabled},'PUT');setData(await api(base));}catch(e){setError(e instanceof Error?e.message:String(e));}};
 return {data,error,setDefault};
}
/** Reports' Dashboards section in the shared row: the default's quiet line says so, and its default button shows on hover and focus. */
export function DashboardDirectory({directory:{data,error,setDefault},onCreate}:{directory:ReturnType<typeof useDashboardDirectory>;onCreate:()=>void}){
 return <section className="reports-section" aria-labelledby="dashboards-heading"><h2 id="dashboards-heading">Dashboards</h2>{error&&<p role="alert" className="operator-state operator-state--error">{error}</p>}
  {data&&(!data.items.length?<p className="reports-empty"><span>No dashboards yet</span>{data.canDefine&&<> · <button type="button" className="reports-text-button" onClick={onCreate}>Create a dashboard</button></>}</p>
   :<ul className="reports-list">{data.items.map(item=><Row key={item.id} target={{to:'/app/dashboards/$id',params:{id:item.id}}} name={item.name} line={item.isDefault?'Your default':undefined} action={<button type="button" className="reports-text-button reports-row__action" onClick={()=>void setDefault(item.id,!item.isDefault)}>{item.isDefault?'Remove as my default':'Make this my default'}</button>}/>)}</ul>)}
 </section>;
}
