import type {ReactNode} from 'react';
import type {Cell,Group,Section} from '../analytics/sales-measures';
import type {SalesView} from '../analytics/sales-view';
import {cellValue} from '../analytics/sales-format';
import {pipelineColor,plural} from './display';
export type CellDrill=(cell:Cell,label:string,text?:string)=>ReactNode;
/** REPORT-001's table, inside the tile: hairline rows, tabular figures, every figure a drill button. */
export function TileTable({groups,caption,heading,button,keys}:{groups:Group[];caption:string;heading:string;button:CellDrill;keys?:string[]}){
 if(!groups.length)return null;const cells=(group:Group)=>keys?group.cells.filter(c=>keys.includes(c.key)):group.cells;
 return <div className="sales-table dash-table" role="region" aria-label={caption} tabIndex={0}><table><caption className="sr-only">{caption}</caption><thead><tr><th scope="col">{heading}</th>{cells(groups[0]!).map(c=><th scope="col" key={c.key}>{c.label}</th>)}</tr></thead><tbody>{groups.map(group=><tr key={group.key}><th scope="row">{/^(Won|Lost) · /.test(group.label)&&<i className={`dash-dot ${group.label.startsWith('Won')?'dash-dot--won':'dash-dot--lost'}`}/>}{group.label}</th>{cells(group).map(c=><td key={c.key} data-key={c.key} data-label={c.label}>{button(c,group.label)}</td>)}</tr>)}</tbody></table></div>;
}
/** A single figure, its drillable second line and the same report's own breakdown. */
export function NumberBody({report,section,button}:{report:SalesView;section:Section;button:CellDrill}){
 const primary=section.totals.find(c=>c.format==='money'||c.format==='percent')??section.totals[0],total=(key:string)=>section.totals.find(c=>c.key===key),color=pipelineColor(report),order=(key:string)=>{const index=report.filters.pipelines.findIndex(p=>p.id===key);return index<0?999:index;};
 if(!primary)return null;
 const count=section.measure==='pipeline'?total('deals'):section.measure==='revenue'?total('won'):section.totals.find(c=>c!==primary&&c.format==='count'),won=total('won'),lost=total('lost');
 const second=section.measure==='win_rate'&&won?button(primary,section.title,`${cellValue(won,report.currency)} won of ${primary.rows.length} closed`):count?button(count,section.title,section.measure==='pipeline'?`${cellValue(count,report.currency)} open ${plural(count.value,'deal','deals')}`:section.measure==='revenue'?`${cellValue(count,report.currency)} won ${plural(count.value,'deal','deals')}`:`${cellValue(count,report.currency)} ${count.label.toLowerCase()}`):null;
 return <><div className="dash-number">{button(primary,section.title)}</div>{second&&<div className="dash-secondary">{second}</div>}
  {section.measure==='pipeline'&&<ul className="dash-breakdown">{[...section.tables.find(t=>t.key==='pipeline')?.groups??[]].sort((a,b)=>order(a.key)-order(b.key)).map(g=>{const value=g.cells.find(c=>c.format==='money'),deals=g.cells.find(c=>c.format==='count');return <li key={g.key}><i className="dash-dot" style={{background:color(g.key)}}/>{g.label} {value?cellValue(value,report.currency):''} · {deals?`${cellValue(deals,report.currency)} ${plural(deals.value,'deal','deals')}`:''}</li>;})}</ul>}
  {section.measure==='win_rate'&&won&&lost&&<p className="dash-breakdown">{button(won,section.title,`${cellValue(won,report.currency)} won`)} · {button(lost,section.title,`${cellValue(lost,report.currency)} lost`)}</p>}
  {section.measure==='revenue'&&<TileTable groups={section.months} caption={`${section.title} by month`} heading="Month" keys={['revenue']} button={button}/>}
 </>;
}
