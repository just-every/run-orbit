import {useEffect,useRef,useState} from 'react';
import {api} from '../fold-ui/workspace';
import type {SalesView} from '../analytics/sales-view';
import type {Cell} from '../analytics/sales-measures';
import {ForecastResults} from '../forecast/results';
import type {ForecastResult} from '../forecast/types';
import {DrillList,type Drill} from '../analytics/sales-result';
import type {DashboardView} from './repository';
import type {DashboardFilters} from './schema';
import {dashboardLocal} from './display';
import {DashboardTitle} from './title';
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
import './dashboard-dialogs.css';
export function DashboardPage({workspace,id}:{workspace:string;id:string}){
 const base=`/api/v2/workspaces/${encodeURIComponent(workspace)}/dashboards/${encodeURIComponent(id)}`;
 const [view,setView]=useState<DashboardView|null>(null),[filters,setFilters]=useState<DashboardFilters|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0),[dialog,setDialog]=useState<'share'|'edit'|'schedule'|null>(null),[now,setNow]=useState(()=>Date.now());
 const generation=useRef(0),returnFocus=useRef<HTMLElement|null>(null);
 const [forecastDrill,setForecastDrill]=useState<ForecastResult|null>(null);
 const [drill,setDrill]=useState<{drill:Drill;view:SalesView;notes:string[]}|null>(null);
 useEffect(()=>{let active=true;generation.current++;setBusy(true);setError('');const load=async()=>{try{if(!view||view.id!==id){const outline=await api<DashboardView>(`${base}/outline`);if(active)setView(outline);}const result=filters?await api<DashboardView>(`${base}/compute`,filters):await api<DashboardView>(base);if(active)setView(result);}catch(e){if(active){setView(null);setDrill(null);setError(e instanceof Error?e.message:String(e));}}finally{if(active)setBusy(false);}};void load();return()=>{active=false;};},[base,filters,refresh]);
 // Relative freshness only: the text changes in place, nothing refetches or remounts.
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30_000);return()=>clearInterval(timer);},[]);
 const reload=()=>{setDrill(null);setRefresh(v=>v+1);};
 const openDrill=async(tileId:string,report:SalesView,cell:Cell,title:string,notes:string[],buttonId:string)=>{
  returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const stamp=generation.current,section=report.sections[0]!,table=section.tables.find(t=>t.groups.some(g=>g.cells.includes(cell))),group=table?.groups.find(g=>g.cells.includes(cell)),month=section.months.find(g=>g.cells.includes(cell));setBusy(true);
  try{const fresh=await api<DashboardView>(`${base}/compute`,filters??view!.filters);if(stamp!==generation.current)return;setView(fresh);const tile=fresh.tiles.find(t=>t.id===tileId);if(tile?.status!=='ready'||!tile.report){setDrill(null);return;}const nextSection=tile.report.sections[0]!,nextGroup=table?nextSection.tables.find(t=>t.key===table.key)?.groups.find(g=>g.key===group?.key):month?nextSection.months.find(g=>g.key===month.key):undefined,next=(table||month?nextGroup?.cells:nextSection.totals)?.find(c=>c.key===cell.key);if(!next){setDrill(null);setError('The figure changed. Review the current dashboard.');return;}const amounts=next.format==='count'?nextGroup?.cells.find(c=>c.format==='money')?.values:undefined;setDrill({view:tile.report,notes:tile.notes,drill:{id:buttonId,title,cell:next,...(amounts&&Object.keys(amounts).length?{amounts}:{})}});
  }catch(e){if(stamp===generation.current){setDrill(null);setView(null);setError(e instanceof Error?e.message:String(e));}}finally{if(stamp===generation.current)setBusy(false);}
 };
 const chosen=filters??view?.filters;
 const exportFilters=chosen?`?filters=${encodeURIComponent(JSON.stringify(chosen))}`:'';
 if(!view)return <section className="dashboard"><p className="operator-eyebrow"><a href="/app/reports">Reports</a> / Dashboards</p>{error?<div className="operator-state operator-state--error" role="alert">{error} <button type="button" className="dash-text-button" onClick={reload}>Try again</button></div>:<p role="status">Computing under your access…</p>}</section>;
 return <section className="dashboard">
  <DashboardTitle view={view} pdfUrl={`${base}/pdf${exportFilters}`} onShare={()=>setDialog('share')} onSchedule={()=>setDialog('schedule')} onEdit={()=>setDialog('edit')} onDefault={async enabled=>{await api(`${base}/default`,{enabled},'PUT');reload();}}/>
  {error&&<p role="alert" className="operator-state operator-state--error">{error}</p>}
  {view.tiles.length===0?<div className="operator-surface dash-empty"><h2>No tiles yet</h2><p>Add saved sales reports or forecast views as tiles: a chart, a table, a single number or a forecast against quota, up to 24.</p>{view.canEdit?<button type="button" className="ob-pill" onClick={()=>setDialog('edit')}>Add a tile</button>:<p>The owner hasn't added tiles yet.</p>}</div>:<>
   {chosen&&<DashboardFilterCard view={view} filters={chosen} setFilters={value=>{setDrill(null);setFilters(value);}}/>}
   <p role="status" className="dash-summary">{view.pending?'Computing under your access…':busy?'Updating…':`${view.tiles.length} tiles · ${view.takeEveryFilter} take every filter · ${view.unavailable} unavailable · computed ${dashboardLocal(view.computedAt,view.timezone)}`}</p>
   <div className={`dash-grid${busy&&!view.pending?' dash-grid--updating':''}`} aria-busy={busy} inert={busy&&!view.pending}>{view.tiles.map(tile=><DashboardTileView timezone={view.timezone} now={now} key={tile.id} result={tile} access={view.access} limited={view.limited} exportUrl={`${base}/tiles/${encodeURIComponent(tile.id)}/csv${exportFilters}`} openDrill={(report,cell,title,notes,buttonId)=>{void openDrill(tile.id,report,cell,title,notes,buttonId);}} openForecast={async()=>{try{const fresh=await api<DashboardView>(`${base}/compute`,chosen);setView(fresh);const result=fresh.tiles.find(t=>t.id===tile.id);if(result?.status==='ready'&&result.forecast)setForecastDrill(result.forecast.result);}catch(e){setForecastDrill(null);setError(e instanceof Error?e.message:String(e));}}} drill={drill?.drill??null} retry={reload}/>)}</div>
  </>}
  {dialog==='share'&&<DashboardSharing base={base} name={view.name} onClose={()=>setDialog(null)} onSaved={reload}/>}
  {dialog==='edit'&&<DashboardEditor base={base} workspace={workspace} filters={chosen!} timezone={view.timezone} onClose={()=>setDialog(null)} onSaved={reload}/>}
  {dialog==='schedule'&&<DashboardScheduleDialog base={base} onClose={()=>setDialog(null)}/>}
  {forecastDrill&&<DashboardModal title="Forecast against quota" drawer onClose={()=>setForecastDrill(null)}><ForecastResults result={forecastDrill} title="Forecast basis and deal detail"/></DashboardModal>}
  {drill&&<DashboardModal returnFocus={returnFocus.current} title={`Records behind ${drill.drill.title}`} drawer onClose={()=>setDrill(null)}><DrillList drill={drill.drill} rows={drill.view.rows} currency={drill.view.currency} timezone={drill.view.timezone} table/><h3 className="dash-drawer__basis">Basis</h3><DashboardBasis view={drill.view} notes={drill.notes} access={view.access}/></DashboardModal>}
 </section>;
}
