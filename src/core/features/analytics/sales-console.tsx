import {useEffect,useMemo,useState} from 'react';
import {api} from '../fold-ui/workspace';
import type {SalesDefinition} from './sales-definition';
import type {SalesView} from './sales-view';
import {SalesResult} from './sales-result';
import {SalesReportEditor,type SalesSuite} from './sales-editor';
import {ReportSharing} from './report-sharing';
import './sales.css';

/** REPORT-001: the built-in sales suite, saved sales reports, their monthly results, sharing and history. */
type Definition={id:string;version:number;body_json:string;created_at:string};
type HistoryItem={kind:'sales';id:string;asOf:string;period:SalesView['period'];timezone:string;currency:string;freshness:string;access:SalesView['access'];definitions:{measure:string;title:string;definition:string;sources:string[]}[];missing:string[]};
const isSales=(item:Definition)=>{try{return JSON.parse(item.body_json).kind==='sales';}catch{return false;}};
function localMonth(timezone:string,shift:number){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit'}).formatToParts(new Date()).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));const index=parts.year!*12+parts.month!-1+shift;return `${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`;}
const monthName=(key:string)=>{const [year,month]=key.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(Date.UTC(year!,month!-1,1)));};

function SavedResults({base,items,busy,onReopen}:{base:string;items:HistoryItem[];busy:boolean;onReopen:(id:string)=>void}){
 return <section className="sales-history" aria-labelledby="sales-history-title"><h3 id="sales-history-title">Saved sales results</h3>
  {!items.length&&<p>No saved results yet. Preview this report, then save the reviewed result.</p>}
  <ol>{items.map(item=><li key={item.id}>
   <p><strong>{monthName(item.period.fromMonth)}{item.period.fromMonth!==item.period.throughMonth?` to ${monthName(item.period.throughMonth)}`:''}</strong> · {item.timezone} · {item.currency}. {item.freshness}</p>
   <p>{item.period.bucket}. {item.period.boundaries} {item.access.note}</p>
   <details><summary>Definitions and source fields</summary><ul>{item.definitions.map(entry=><li key={entry.measure}><strong>{entry.title}:</strong> {entry.definition} Source fields: {entry.sources.join(', ')}.</li>)}</ul></details>
   {item.missing.length>0&&<details><summary>Missing data</summary><ul>{item.missing.map(text=><li key={text}>{text}</li>)}</ul></details>}
   <div className="sales-actions"><button type="button" disabled={busy} onClick={()=>onReopen(item.id)}>Reopen sales result</button><a href={`${base}/snapshots/${encodeURIComponent(item.id)}/export`}>Export sales result</a></div>
  </li>)}</ol>
 </section>;
}

export function SalesReports({workspaceId}:{workspaceId:string}){
 const base=`/api/v2/workspaces/${encodeURIComponent(workspaceId)}/operations`;
 const [suite,setSuite]=useState<SalesSuite|null>(null),[definitions,setDefinitions]=useState<Definition[]>([]),[selected,setSelected]=useState('');
 const [from,setFrom]=useState(''),[through,setThrough]=useState(''),[view,setView]=useState<SalesView|null>(null),[history,setHistory]=useState<HistoryItem[]|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[refresh,setRefresh]=useState(0);
 const current=useMemo(()=>definitions.find(item=>`${item.id}:${item.version}`===selected),[definitions,selected]);
 const definition=useMemo(()=>current?JSON.parse(current.body_json) as SalesDefinition:null,[current]);
 useEffect(()=>{let active=true;Promise.all([api<SalesSuite>(`${base}/reports/suite`),api<{items:Definition[]}>(`${base}/metrics`)]).then(([loaded,list])=>{if(!active)return;setSuite(loaded);setDefinitions(list.items.filter(isSales));setFrom(value=>value||localMonth(loaded.timezone,-1));setThrough(value=>value||localMonth(loaded.timezone,0));}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Sales reports could not be loaded.');});return()=>{active=false;};},[base,refresh]);
 const loadHistory=(item:{id:string;version:number})=>api<{items:HistoryItem[]}>(`${base}/metrics/${encodeURIComponent(item.id)}/versions/${item.version}/snapshots`).then(result=>result.items);
 useEffect(()=>{let active=true;setHistory(null);if(!current)return()=>{active=false;};loadHistory(current).then(items=>{if(active)setHistory(items);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'Saved results could not be loaded.');});return()=>{active=false;};},[base,current]);
 async function run<T>(work:()=>Promise<T>,done?:(value:T)=>void|Promise<void>){setBusy(true);setError('');setStatus('');try{const value=await work();await done?.(value);}catch(cause){setError(cause instanceof Error?cause.message:String(cause));}finally{setBusy(false);}}
 const previewed=(result:SalesView)=>{setView(result);setStatus('This preview uses the records you may read now. It has not been saved.');};
 const preview=(id:string,version:number,first=from,last=through)=>run(()=>api<SalesView>(`${base}/reports/${encodeURIComponent(id)}/preview`,{version,from:first,through:last}),previewed);
 // Opening a built-in saves (or reuses) its exact definition, selects it and previews the chosen months.
 const open=(template:string)=>run(async()=>{const opened=await api<{id:string;version:number}>(`${base}/reports/suite/${encodeURIComponent(template)}`,{});const list=await api<{items:Definition[]}>(`${base}/metrics`);setDefinitions(list.items.filter(isSales));setSelected(`${opened.id}:${opened.version}`);return api<SalesView>(`${base}/reports/${encodeURIComponent(opened.id)}/preview`,{version:opened.version,from,through});},previewed);
 const save=()=>current&&view&&run(()=>api<SalesView>(`${base}/reports/${encodeURIComponent(current.id)}/snapshots`,{version:current.version,from:view.period.fromMonth,through:view.period.throughMonth,reviewHash:view.reviewHash}),async saved=>{setView(saved);setStatus('Saved. The saved result keeps these figures; later evidence appears beside it as late-arriving.');setHistory(await loadHistory(current));});
 const reopen=(id:string)=>run(()=>api<SalesView>(`${base}/snapshots/${encodeURIComponent(id)}`),reopened=>{setView(reopened);setStatus('Reopened under your access now.');});
 if(error&&!suite)return <section className="sales-reports" aria-labelledby="sales-reports-title"><h2 id="sales-reports-title">Sales reports</h2><p className="sales-message" role="alert">{error}</p></section>;
 if(!suite)return <p role="status">Loading sales reports…</p>;
 return <section className="sales-reports" aria-labelledby="sales-reports-title">
  <header className="sales-reports__intro"><h2 id="sales-reports-title">Sales reports</h2><p>Pipeline, outcomes, conversion, activities, tasks, bookings and follow-up outcomes by local calendar month in {suite.timezone}, in {suite.currency}. Every figure opens the records behind it and uses only what you may read.</p></header>
  {suite.canDefine?<details className="sales-suite" open={!definitions.length}><summary><h3>Built-in sales reports</h3></summary>
   <ul>{suite.templates.map(template=><li key={template.id}><h4>{template.definition.name}</h4><p>{template.definition.description}</p><button type="button" disabled={busy} onClick={()=>open(template.id)} aria-label={`Open ${template.definition.name}`}>Open</button></li>)}</ul>
  </details>:<p className="sales-note">Sales reports shared with you appear below. Built-in reports are opened by people whose profile defines reports.</p>}
  <div className="sales-reports__fields">
   <label>Sales report<select value={selected} onChange={event=>{setSelected(event.target.value);setView(null);setError('');setStatus('');}}><option value="">Choose a sales report</option>{definitions.map(item=><option key={`${item.id}:${item.version}`} value={`${item.id}:${item.version}`}>{JSON.parse(item.body_json).name} — version {item.version}</option>)}</select></label>
   <label>First month<input type="month" value={from} onChange={event=>setFrom(event.target.value)}/></label>
   <label>Last month<input type="month" value={through} onChange={event=>setThrough(event.target.value)}/></label>
   <button type="button" className="sales-primary" disabled={busy||!current||!from||!through} onClick={()=>current&&preview(current.id,current.version)}>{busy?'Working…':'Preview sales report'}</button>
  </div>
  {error&&<p className="sales-message" role="alert">{error}</p>}
  {status&&<p className="sales-message" role="status">{status}</p>}
  {current&&<ReportSharing base={base} id={current.id}/>}
  <SalesReportEditor base={base} suite={suite} selected={current?{id:current.id,version:current.version}:null} definition={definition} onSaved={(id,version)=>{setRefresh(value=>value+1);setSelected(`${id}:${version}`);setView(null);}}/>
  {view&&<SalesResult view={view}/>}
  {view&&!view.saved&&view.reviewHash&&current&&<button type="button" className="sales-primary" disabled={busy} onClick={save}>Save reviewed sales result</button>}
  {view&&view.saved&&current&&<button type="button" disabled={busy} onClick={()=>preview(current.id,current.version,view.period.fromMonth,view.period.throughMonth)}>Recompute as a separate result</button>}
  {current&&history&&<SavedResults base={base} items={history} busy={busy} onReopen={reopen}/>}
 </section>;
}
