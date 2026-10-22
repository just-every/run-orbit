import {useEffect,useState} from 'react';
import {api} from '../fold-ui/workspace';
import type {SalesView} from '../analytics/sales-view';
import type {Cell} from '../analytics/sales-measures';
import {DrillList,type Drill} from '../analytics/sales-result';
import type {DashboardView} from './repository';
import type {DashboardFilters} from './schema';
import {DashboardTileView} from './tiles';
import {DashboardFilterCard} from './filters';
import {DashboardModal} from './modal';
import {DashboardBasis} from './basis';
import {DashboardSharing} from './sharing';
import {DashboardEditor} from './editor';
import {DashboardScheduleDialog} from './schedule-dialog';
import '../analytics/sales.css';
import '../forecast/forecast.css';
import './dashboards.css';
export function DashboardPage({workspace,id}:{workspace:string;id:string}){
 const base=`/api/v2/workspaces/${encodeURIComponent(workspace)}/dashboards/${encodeURIComponent(id)}`;
 const [view,setView]=useState<DashboardView|null>(null),[filters,setFilters]=useState<DashboardFilters|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0),[dialog,setDialog]=useState<'share'|'edit'|'schedule'|null>(null);
 const [drill,setDrill]=useState<{drill:Drill;view:SalesView;notes:string[]}|null>(null);
 useEffect(()=>{let active=true;setBusy(true);setError('');const request=filters?api<DashboardView>(`${base}/compute`,filters):api<DashboardView>(base);request.then(result=>{if(active)setView(result);}).catch(e=>{if(active){setView(null);setDrill(null);setError(e.message);}}).finally(()=>active&&setBusy(false));return()=>{active=false;};},[base,filters,refresh]);
 const reload=()=>{setDrill(null);setRefresh(v=>v+1);};
 const openDrill=(report:SalesView,cell:Cell,title:string,notes:string[])=>setDrill({view:report,notes,drill:{id:`tile-${report.id}-${title}-${cell.key}`,title,cell}});
 const chosen=filters??view?.filters;
 const exportFilters=chosen?`?filters=${encodeURIComponent(JSON.stringify(chosen))}`:'';
 const pdf=<a href={`${base}/pdf${exportFilters}`} className="dash-outline">Export PDF</a>;
 const edit=view?.canEdit?<button className="dash-outline" onClick={()=>setDialog('edit')}>Edit tiles</button>:null;
 if(!view)return <section className="dashboard"><p className="operator-eyebrow"><a href="/app/reports">Reports</a> / Dashboards</p>{error?<div className="operator-state operator-state--error" role="alert">{error} <button onClick={reload}>Try again</button></div>:<p role="status">Computing under your access…</p>}</section>;
 return <section className="dashboard"><div className="operator-titlebar dash-title"><div><p className="operator-eyebrow"><a href="/app/reports">Reports</a> / Dashboards</p><h1>{view.name}</h1></div><div className="dash-actions">{view.canManage&&<button className="ob-pill" onClick={()=>setDialog('share')}>Share</button>}{view.canManage&&<button className="dash-outline" onClick={()=>setDialog('schedule')}>Schedule email</button>}<span className="dash-desktop-actions">{pdf}{edit}</span><details className="dash-more"><summary className="dash-outline">More</summary>{pdf}{edit}</details></div></div>
  <p className="dash-meta dash-title-meta">{view.owner?`Owner ${view.owner} · `:''}version {view.version} · {view.tiles.length} of 24 tiles · {view.timezone} · {view.currency} · Computed {new Intl.DateTimeFormat('en-US',{timeZone:view.timezone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(view.computedAt))} from current records</p>
  <div className="dash-access">{view.limited&&<span className="ob-chip">♙ Limited to your access</span>}<p>{view.access}</p></div><p className="dash-sharing">{view.canManage?<button className="dash-text-button" onClick={()=>setDialog('share')}>♧ {view.sharing}</button>:view.sharing}</p>
  <label className="dash-default"><span className="sr-only">Default dashboard</span><select aria-label="Default dashboard" value={view.isDefault?'yes':'no'} onChange={async e=>{try{await api(`${base}/default`,{enabled:e.target.value==='yes'},'PUT');reload();}catch(e){setError(e instanceof Error?e.message:String(e));}}}><option value={view.isDefault?'yes':'no'}>{view.isDefault?'Your default dashboard':'Make this my default'}</option><option value={view.isDefault?'no':'yes'}>{view.isDefault?'Remove as my default':'Set as my default'}</option></select></label>
  {error&&<p role="alert" className="operator-state operator-state--error">{error}</p>}
  {view.tiles.length===0?<div className="operator-surface dash-empty"><h2>No tiles yet</h2><p>Add saved sales reports or forecast views as tiles: a chart, a table, a single number or a forecast against quota, up to 24.</p>{view.canEdit?<button className="ob-pill" onClick={()=>setDialog('edit')}>Add a tile</button>:<p>The owner hasn't added tiles yet.</p>}</div>:<>{chosen&&<DashboardFilterCard view={view} filters={chosen} setFilters={value=>{setDrill(null);setFilters(value);}}/>}<p role="status" className="dash-summary">{busy?'Updating…':`${view.tiles.length} tiles · ${view.takeEveryFilter} take every filter · ${view.unavailable} unavailable · computed ${new Intl.DateTimeFormat('en-US',{timeZone:view.timezone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(view.computedAt))}`}</p><div className={`dash-grid${busy?' dash-grid--updating':''}`} aria-busy={busy}>{view.tiles.map(tile=><DashboardTileView key={tile.id} result={tile} access={view.access} limited={view.limited} exportUrl={`${base}/tiles/${encodeURIComponent(tile.id)}/csv${exportFilters}`} openDrill={openDrill} drill={drill?.drill??null} retry={reload}/>)}</div></>}
  {dialog==='share'&&<DashboardSharing base={base} name={view.name} onClose={()=>setDialog(null)} onSaved={reload}/>}
  {dialog==='edit'&&<DashboardEditor base={base} workspace={workspace} onClose={()=>setDialog(null)} onSaved={reload}/>}
  {dialog==='schedule'&&<DashboardScheduleDialog base={base} onClose={()=>setDialog(null)}/>}
  {drill&&<DashboardModal title={`Records behind ${drill.drill.title}`} drawer onClose={()=>setDrill(null)}><DrillList drill={drill.drill} rows={drill.view.rows} currency={drill.view.currency}/><DashboardBasis view={drill.view} notes={drill.notes} access={view.access}/></DashboardModal>}
 </section>;
}
