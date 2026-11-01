import {useEffect,useState,type ReactNode} from 'react';
import type {MetricSnapshot} from '../../shared/expansion-contracts';
import {api} from '../fold-ui/workspace';
import type {SalesView} from '../analytics/sales-view';
import {ReportDetails,reportValue} from '../analytics/report-details';
import {DashboardModal} from '../dashboards/modal';
import {formatDate,formatDay} from '../operator/ui/formatters';
import {definitionBody,type Definition} from './catalog';
import {monthName} from './period';
import {CurrentRow,Row} from './rows';

/** An opened report's one advanced place: the dashboard's drawer, titled "Report options" or "Inputs and history", holding
 * its saved results, sharing, versions and edit sections. Nothing in it is laid open on the page. */
export const failure=(cause:unknown)=>cause instanceof Error?cause.message:String(cause);
export function OptionsDrawer({title,returnFocus,onClose,children}:{title:string;returnFocus:HTMLElement|null;onClose:()=>void;children:ReactNode}){
 return <DashboardModal title={title} drawer returnFocus={returnFocus} onClose={onClose}><div className="reports-drawer">{children}</div></DashboardModal>;
}
export function OptionsSection({title,children}:{title:string;children:ReactNode}){return <section><h3>{title}</h3>{children}</section>;}

type HistoryItem={kind:'sales';id:string;asOf:string;period:SalesView['period'];timezone:string;currency:string;freshness:string;access:SalesView['access'];definitions:{measure:string;title:string;definition:string;sources:string[]}[];missing:string[]};
/** The open version's saved sales results (the 20 newest): reopen or export each, and recompute the one shown. */
export function SalesSavedResults({base,id,version,shown,onReopen,onRecompute}:{base:string;id:string;version:number;shown:SalesView|null;onReopen:(id:string)=>void;onRecompute:()=>void}){
 const [items,setItems]=useState<HistoryItem[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;api<{items:HistoryItem[]}>(`${base}/metrics/${encodeURIComponent(id)}/versions/${version}/snapshots`).then(result=>{if(active)setItems(result.items);}).catch(cause=>{if(active)setError(failure(cause));});return()=>{active=false;};},[base,id,version]);
 return <section className="sales-history" aria-labelledby="sales-history-title"><h3 id="sales-history-title">Saved sales results</h3>
  {error&&<p className="reports-refusal" role="alert">{error}</p>}
  {items&&!items.length&&<p>No saved results yet. Preview this report, then save the reviewed result.</p>}
  {items?.length===20&&<p className="reports-quiet">The 20 newest results of this version.</p>}
  {items&&items.length>0&&<ol>{items.map(item=><li key={item.id}>
   <p><strong>{monthName(item.period.fromMonth)}{item.period.fromMonth!==item.period.throughMonth?` to ${monthName(item.period.throughMonth)}`:''}</strong> · {item.timezone} · {item.currency}. {item.freshness}</p>
   <p>{item.period.bucket}. {item.period.boundaries} {item.access.note}</p>
   <details><summary>Definitions and source fields</summary><ul>{item.definitions.map(entry=><li key={entry.measure}><strong>{entry.title}:</strong> {entry.definition} Source fields: {entry.sources.join(', ')}.</li>)}</ul></details>
   {item.missing.length>0&&<details><summary>Missing data</summary><ul>{item.missing.map(text=><li key={text}>{text}</li>)}</ul></details>}
   <div className="sales-actions"><button type="button" onClick={()=>onReopen(item.id)}>Reopen sales result</button><a href={`${base}/snapshots/${encodeURIComponent(item.id)}/export`}>Export sales result</a>{shown?.saved&&shown.id===item.id&&<button type="button" onClick={onRecompute}>Recompute as a separate result</button>}</div>
  </li>)}</ol>}
 </section>;
}

/** The open version's saved custom results: reopen or export each; results current access hides are counted, never shown. */
export function CustomSavedResults({base,id,version,onReopen}:{base:string;id:string;version:number;onReopen:(id:string)=>void}){
 const [history,setHistory]=useState<{items:MetricSnapshot[];unavailable:number}|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;api<{items:MetricSnapshot[];unavailable:number}>(`${base}/metrics/${encodeURIComponent(id)}/versions/${version}/snapshots`).then(result=>{if(active)setHistory(result);}).catch(cause=>{if(active)setError(failure(cause));});return()=>{active=false;};},[base,id,version]);
 return <section className="analytics-console__history" aria-label="Saved report history"><h3>Saved report history</h3>
  {error&&<p className="reports-refusal" role="alert">{error}</p>}
  {history&&history.unavailable>0&&<p>{history.unavailable} older results are hidden because current source access no longer permits them.</p>}
  {history&&!history.items.length&&!history.unavailable&&<p>No saved results yet. Preview a report, then save it after review.</p>}
  {history?.items.map(item=><article key={item.id}>
   <p>As of {formatDate(item.asOf)}</p><div className="sales-actions"><button type="button" onClick={()=>onReopen(item.id)}>Reopen saved report</button><a href={`${base}/snapshots/${encodeURIComponent(item.id)}/export`}>Export saved report</a></div>
   <p>Result: {reportValue(item)}</p>
   <ReportDetails report={item}/>
  </article>)}
 </section>;
}

/** Every version of this report the viewer can see, newest first: the open one marked, the others one row away. */
export function Versions({id,versions,open}:{id:string;versions:Definition[];open:number|null}){
 const current=versions[0]?definitionBody(versions[0]).name:undefined;
 return <OptionsSection title="Versions"><ul className="reports-list">{versions.map(item=>{const name=definitionBody(item).name,line=[formatDay(item.created_at),typeof name==='string'&&name!==current?name:''].filter(Boolean).join(' · ');
  return item.version===open?<CurrentRow key={item.version} name={`Version ${item.version}`} line={`${line} · Open now`}/>:<Row key={item.version} target={{to:'/app/reports/$id',params:{id},search:{version:item.version}}} replace name={`Version ${item.version}`} line={line}/>;})}</ul></OptionsSection>;
}
