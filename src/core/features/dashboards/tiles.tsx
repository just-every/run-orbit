import type {CSSProperties} from 'react';
import {CellButton,LateEvidence,type Drill} from '../analytics/sales-result';
import type {Cell,Group,Section} from '../analytics/sales-measures';
import type {SalesView} from '../analytics/sales-view';
import {cellValue} from '../analytics/sales-format';
import {usd,percent} from '../forecast/results';
import type {ForecastResult} from '../forecast/types';
import type {TileResult} from './repository';
import {DashboardBasis} from './basis';
export const unavailableText="This tile's source was deleted, is no longer shared with you, or needs access you don't have. Nothing from it is shown.";
export type OpenDrill=(view:SalesView,cell:Cell,title:string,notes:string[])=>void;
function StageMatrix({view,section,button}:{view:SalesView;section:Section;button:(cell:Cell,title:string)=>React.ReactNode}){
 const pipelines=section.tables.find(t=>t.key==='pipeline')?.groups??[],groups=section.tables.find(t=>t.key==='stage')?.groups??[],stages=[...new Set(view.stages.filter(s=>pipelines.some(p=>p.key===s.pipelineId)).sort((a,b)=>a.position-b.position).map(s=>s.name))];
 const max=Math.max(1,...groups.map(g=>g.cells.find(c=>c.key==='value')?.value??0));
 return <><div className="dash-matrix" style={{'--stage-count':stages.length} as CSSProperties}><div className="dash-matrix__head"><span>Stage</span>{stages.map(name=><span key={name}>{name}</span>)}</div>{pipelines.map((pipeline,index)=><div className="dash-matrix__pipeline" key={pipeline.key} style={{'--pipeline-color':index<3?`var(--ob-chart-${index+1})`:'var(--ob-ink)'} as CSSProperties}><h4><i className="dash-dot"/>{pipeline.label}<span className="dash-matrix__total">{pipeline.cells.map(c=>cellValue(c,view.currency)).join(' · ')}</span></h4>{stages.map(name=>{const stage=view.stages.find(s=>s.pipelineId===pipeline.key&&s.name===name),group=stage?groups.find(g=>g.key===stage.id):null,count=group?.cells.find(c=>c.key==='deals'),amount=group?.cells.find(c=>c.key==='value');return <div className={`dash-matrix__cell${!stage?' dash-matrix__absent':''}`} key={name}><span className="dash-matrix__stage">{name}</span>{stage&&<><div className="dash-bar"><span style={{width:`${Math.max(0,(amount?.value??0)/max*100)}%`}}/></div>{count?button(count,`${name} · ${pipeline.label}`):<span>—</span>}<span className="dash-matrix__amount">{amount?cellValue(amount,view.currency):'Not available'}</span></>}</div>;})}</div>)}</div><p className="dash-meta">Deals open when computed. Bars compare value; the period does not filter open pipeline.</p></>;
}
function TileTable({groups,caption,button}:{groups:Group[];caption:string;button:(cell:Cell,title:string)=>React.ReactNode}){
 if(!groups.length)return null;
 return <div className="sales-table dash-table"><table><caption>{caption}</caption><thead><tr><th scope="col">{caption}</th>{groups[0]!.cells.map(c=><th scope="col" key={c.key}>{c.label}</th>)}</tr></thead><tbody>{groups.map(group=><tr key={group.key}><th scope="row">{group.label.startsWith('Won ·')||group.label.startsWith('Lost ·')?<><i className={`dash-dot ${group.label.startsWith('Won')?'dash-dot--won':'dash-dot--lost'}`}/>{group.label}</>:group.label}</th>{group.cells.map(c=><td key={c.key} data-label={c.label}>{button(c,group.label)}</td>)}</tr>)}</tbody></table></div>;
}
function ForecastTile({result}:{result:ForecastResult}){
 const quota=result.quotaTotals.quarterly;
 return <><dl className="dash-forecast"><div><dt>Quota</dt><dd>{usd(quota.amountCents)}</dd></div><div><dt>Weighted expected value</dt><dd>{usd(result.totals.weightedExpectedCents)}</dd></div><div><dt>Closed-won bookings</dt><dd>{usd(result.totals.wonBookingsCents)}</dd><dd className="dash-meta">{percent(quota.attainmentPercent)} attainment</dd></div><div><dt>Open unweighted value</dt><dd>{usd(result.totals.openUnweightedCents)}</dd></div></dl><h4>Per rep (quarterly quota)</h4>{result.quotaAttainment.filter(q=>q.quota.period==='quarterly').map(q=><div className="dash-rep" key={q.quota.id}><span>{result.inputs.operators.find(p=>p.id===q.quota.operatorId)?.name??'Former operator'}</span><div className="dash-bar"><span style={{width:`${Math.max(0,Math.min(100,q.attainmentPercent??0))}%`}}/></div><span>{percent(q.attainmentPercent)}</span></div>)}<p className="dash-meta">Weighted expected value = open deal amount × reviewed probability. Engagement scores do not affect it.</p></>;
}
export function DashboardTileView({result,access,limited,exportUrl,openDrill,drill,retry}:{result:TileResult;access:string;limited:boolean;exportUrl:string;openDrill:OpenDrill;drill:Drill|null;retry:()=>void}){
 const style={'--tile-width':result.width,'--tile-height':result.height} as CSSProperties;
 if(result.status==='unavailable')return <article className="operator-surface dash-tile dash-tile--unavailable" style={style}><span aria-hidden="true">▧</span><h3>Source unavailable</h3><p>{unavailableText}</p></article>;
 if(result.status==='error')return <article className="operator-surface dash-tile" style={style}><h3>Tile could not be computed</h3><div className="operator-state operator-state--error" role="alert">{result.message} <button onClick={retry}>Try again</button></div></article>;
 const {tile,report,forecast,notes}=result,section=report?.sections[0],prefix=`tile-${tile.id}`,title=tile.kind==='chart'&&tile.measure==='pipeline'?'Open pipeline by stage, two pipelines':forecast?'Forecast vs quota':section?.title??report?.name??'Sales report';
 const button=(cell:Cell,label:string)=>{const title=`${cell.label} · ${label}`,id=`${prefix}-${label}-${cell.key}`;return <CellButton cell={cell} group={label} currency={report!.currency} open={drill?.id===id} onOpen={()=>openDrill(report!,cell,title,notes)}/>;};
 const primary=section?.totals.find(c=>c.format==='money'||c.format==='percent')??section?.totals[0];
 const table=section?.measure==='revenue'?section.months:section?.measure==='stage_age'?section.tables.find(t=>t.key==='stage')?.groups:section?.tables[0]?.groups;
 const money=Boolean(section?.totals.some(c=>c.format==='money'));
 return <article className={`operator-surface dash-tile dash-tile--${tile.kind} dash-tile--${tile.measure}`} style={style} aria-labelledby={`${prefix}-title`}><header className="dash-tile__header"><h3 id={`${prefix}-title`}>{title} <span className="assistance-badge">v{report?.definitionVersion??tile.version}</span></h3><a href={exportUrl}>↓ CSV</a></header><p className="dash-meta">{report?(tile.measure==='pipeline'||tile.measure==='stage_age'?'Open now':`${report.period.fromMonth} to ${report.period.throughMonth}`):`${forecast?.from} to ${forecast?.through}`} · {report?.freshness??`Computed ${forecast?.result.asOf}`}</p>
  {forecast&&<ForecastTile result={forecast.result}/>}
  {report&&section&&<>
   {tile.kind==='chart'&&tile.measure==='pipeline'?<StageMatrix view={report} section={section} button={button}/>:<>
    {tile.kind==='number'&&primary&&<div className="dash-number">{button(primary,section.title)}</div>}
    {tile.kind==='number'&&<div className="dash-secondary">{section.totals.filter(c=>c!==primary&&c.format==='count').map(c=><span key={c.key}>{button(c,section.title)} {c.label.toLowerCase()} </span>)}</div>}
    {tile.kind==='number'&&tile.measure==='pipeline'&&<ul className="dash-breakdown">{section.tables.find(t=>t.key==='pipeline')?.groups.map((g,i)=><li key={g.key}><i className="dash-dot" style={{background:`var(--ob-chart-${Math.min(3,i+1)})`}}/>{g.label} {g.cells.map(c=>cellValue(c,report.currency)).join(' · ')}</li>)}</ul>}
    {tile.kind!=='number'&&table&&<TileTable groups={table} caption={section.measure==='revenue'?'Month':section.tables[0]?.title??section.title} button={button}/>}
    {tile.kind==='number'&&tile.measure==='revenue'&&table&&<TileTable groups={table} caption="Month" button={button}/>}
   </>}
  </>}
  <div className="dash-notes">{notes.map(note=><p className="sales-note" key={note}>ⓘ {note}</p>)}{section?.withheld&&<p className="sales-note">ⓘ {section.withheld}</p>}{limited&&money&&<p className="sales-note">ⓘ Only amounts you may read are included.</p>}{section?.missing.map(note=><p className="sales-note" key={note}>ⓘ {note}</p>)}</div>
  {report&&<details><summary>Basis</summary><DashboardBasis view={report} notes={notes} access={access}/></details>}
  {forecast&&<details><summary>Basis</summary><p>{forecast.result.basis}</p><p>USD · {forecast.from} to {forecast.through} (excluded) · {forecast.result.asOf}</p><p>{access}</p>{notes.map(note=><p key={note}>{note}</p>)}<p>Sales forecast and scheduled revenue are not recognized accounting revenue.</p></details>}
  {report?.late&&<LateEvidence view={report} late={report.late} prefix={prefix}/>}
 </article>;
}
