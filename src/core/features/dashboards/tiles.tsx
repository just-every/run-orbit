import {dashboardPeriod,dashboardFreshness,dashboardLocal,forecastPeriod} from './display';
import {DashboardIcon} from './icons';
import type {CSSProperties,ReactNode} from 'react';
import {CellButton,LateEvidence,type Drill} from '../analytics/sales-result';
import type {Cell} from '../analytics/sales-measures';
import type {SalesView} from '../analytics/sales-view';
import type {TileResult} from './repository';
import {DashboardBasis} from './basis';
import {NumberBody,TileTable} from './tile-bodies';
import {StageMatrix} from './stage-matrix';
import {ForecastTile,ForecastBasis} from './forecast-tile';
export const unavailableText="This tile's source was deleted, is no longer shared with you, or needs access you don't have. Nothing from it is shown.";
export type OpenDrill=(view:SalesView,cell:Cell,title:string,notes:string[],buttonId:string)=>void;
const slug=(text:string)=>text.replace(/[^a-zA-Z0-9_-]+/g,'-');
const badge=(version:number|string,forecast:boolean)=>forecast?(version==='live'?'Live':'Saved view'):version==='live'?'Live':`v${version}`;
function Frame({id,style,className='',title,version,meta,children,csv}:{id:string;style:CSSProperties;className?:string;title:string;version:string;meta:string;children:ReactNode;csv?:{url:string}}){
 return <article className={`operator-surface dash-tile ${className}`} style={style} aria-labelledby={`tile-${id}-title`}><header className="dash-tile__header"><h2 id={`tile-${id}-title`}>{title} <span className="assistance-badge">{version}</span></h2>{csv&&<a className="dash-csv" href={csv.url} aria-label={`CSV for ${title}`}><DashboardIcon kind="download"/>CSV</a>}</header><p className="dash-meta">{meta}</p>{children}</article>;
}
export function DashboardTileView({result,access,limited,exportUrl,openDrill,drill,retry,openForecast,timezone,now}:{result:TileResult;access:string;limited:boolean;exportUrl:string;openDrill:OpenDrill;drill:Drill|null;retry:()=>void;openForecast:()=>void;timezone:string;now:number}){
 const style={'--tile-width':result.width,'--tile-height':result.height,'--tile-mid-width':result.width>6?2:1} as CSSProperties;
 if(result.status==='unavailable')return <article className="dash-tile dash-tile--unavailable" style={style} aria-labelledby={`tile-${result.id}-title`}><DashboardIcon kind="unavailable"/><h2 id={`tile-${result.id}-title`}>Source unavailable</h2><p>{unavailableText}</p></article>;
 if(result.status==='loading')return <Frame id={result.id} style={style} className="dash-tile--loading" title={result.name} version={badge(result.version,result.name==='Forecast vs quota')} meta={result.period}><p role="status" className="dash-meta">Computing under your access…</p></Frame>;
 if(result.status==='error')return <Frame id={result.id} style={style} title={result.name} version={badge(result.version,result.name==='Forecast vs quota')} meta={result.period}><div className="operator-state operator-state--error dash-tile__error" role="alert"><p>Tile could not be computed. {result.message}</p><button type="button" className="dash-text-button" onClick={retry}>Try again</button></div></Frame>;
 const {tile,report,forecast,notes}=result,section=report?.sections[0],prefix=`tile-${tile.id}`;
 const title=forecast?'Forecast vs quota':tile.kind==='chart'&&tile.measure==='pipeline'?'Open pipeline by stage':section?.title??report?.name??'Sales report';
 const button=(cell:Cell,label:string,text?:string)=>{const id=slug(`${prefix}-${label}-${cell.key}${text?`-${text}`:''}`);return <CellButton text={text} cell={cell} group={label} currency={report!.currency} open={drill?.id===id} onOpen={()=>openDrill(report!,cell,tile.kind==='chart'&&tile.measure==='pipeline'?label:`${cell.label} · ${label}`,notes,id)}/>;};
 const meta=report?`${dashboardPeriod(report)} · ${dashboardFreshness(report,now)}`:forecast?`${forecastPeriod(forecast.from,forecast.through,timezone)} · ${tile.version==='live'?`Computed ${dashboardLocal(forecast.result.asOf,timezone)}`:`Saved result measured ${dashboardLocal(forecast.result.asOf,timezone,true)}`}`:'';
 const groups=section?.measure==='activities'&&!section.tables[0]?.groups.length?[{key:'totals',label:'Totals',cells:section.totals.filter(c=>c.key!=='sent')}]:section?.measure==='revenue'?section.months:section?.measure==='stage_age'?section.tables.find(t=>t.key==='stage')?.groups:section?.tables[0]?.groups;
 const lines=[...notes,...(section?.withheld?[section.withheld]:[]),...(limited&&section?.totals.some(c=>c.format==='money')?['Only amounts you may read are included.']:[]),...(section?.missing??[])];
 return <Frame id={tile.id} style={style} className={`dash-tile--${tile.kind} dash-tile--${tile.measure}`} title={title} version={report?`v${report.definitionVersion}`:badge(tile.version,true)} meta={meta} csv={{url:exportUrl}}>
  {forecast&&<ForecastTile result={forecast.result} onOpen={openForecast}/>}
  {report&&section&&(tile.kind==='chart'&&tile.measure==='pipeline'?<StageMatrix view={report} section={section} button={button}/>:tile.kind==='number'?<NumberBody report={report} section={section} button={button}/>:groups&&<TileTable groups={groups} caption={`${section.title}${section.measure==='revenue'?' by month':''}`} heading={section.measure==='revenue'?'Month':section.measure==='stage_age'?'Stage':section.tables[0]?.title??section.title} keys={section.measure==='revenue'?['revenue']:undefined} button={button}/>)}
  {report?.late&&<LateEvidence view={report} late={report.late} prefix={prefix} level={3}/>}
  {lines.length>0&&<div className="dash-notes">{lines.map(line=><p className="sales-note" key={line}><DashboardIcon kind="info"/>{line}</p>)}</div>}
  <details className="dash-basis-fold"><summary>Basis<DashboardIcon kind="chevron"/></summary>{report?<DashboardBasis view={report} notes={notes} access={access}/>:forecast?<ForecastBasis forecast={forecast} live={tile.version==='live'} notes={notes} access={access} timezone={timezone}/>:null}</details>
 </Frame>;
}
