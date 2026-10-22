import {useEffect,useRef,useState} from 'react';
import type {Cell,Group,Section} from './sales-measures';
import type {RowView,SalesView} from './sales-view';
import {cellValue,recordNoun} from './sales-format';

/** A sales result: its disclosed basis, every figure, and the exact rows behind any figure on request. */
export type Drill={id:string;title:string;cell:Cell};
export function DrillList({drill,rows,currency}:{drill:Drill;rows:Record<string,RowView>;currency:string}){
 const {cell}=drill,listed=cell.rows.map(key=>rows[key]).filter((row):row is RowView=>Boolean(row)),numerator=new Set(cell.numerator??[]),panel=useRef<HTMLElement>(null);
 useEffect(()=>{panel.current?.focus();},[drill.id]);
 const amount=cell.format==='money'?cellValue({format:'money',value:listed.reduce((total,row)=>total+(cell.values?.[row.key]??0),0)},currency):null;
 const summary=cell.format==='percent'?`${numerator.size} of ${listed.length} ${recordNoun(listed.length)} meet the measure (${cellValue(cell,currency)}).`
  :cell.format==='days'?`${listed.length} ${recordNoun(listed.length)}, mean ${cellValue(cell,currency)}.`
  :`${listed.length} ${recordNoun(listed.length)}${amount?` totalling ${amount}`:''}.`;
 return <section className="sales-drill" id={drill.id} aria-label={`Records behind ${drill.title}`} tabIndex={-1} ref={panel}>
  <h5>Records behind {drill.title}</h5>
  <p role="status">{summary} They reconcile to the figure shown.</p>
  {cell.note&&<p>{cell.note}</p>}
  {listed.length>0&&<ol>{listed.map(row=><li key={row.key}>{row.href?<a href={row.href}>{row.label}</a>:row.label}<span> · {row.detail}</span>{cell.values?.[row.key]!==undefined&&<span> · {cell.format==='money'?cellValue({format:'money',value:cell.values[row.key]!},currency):cellValue({format:'days',value:cell.values[row.key]!},currency)}</span>}{cell.format==='percent'&&<span> · {numerator.has(row.key)?'counted in the rate':'in the base only'}</span>}</li>)}</ol>}
 </section>;
}
export function CellButton({cell,group,currency,open,onOpen}:{cell:Cell;group:string|null;currency:string;open:boolean;onOpen:()=>void}){
 const title=group?`${cell.label} · ${group}`:cell.label;
 return <button type="button" className="sales-cell" aria-expanded={open} aria-label={`${cellValue(cell,currency)} ${title}: show the records behind it`} onClick={onOpen}>{cellValue(cell,currency)}</button>;
}
function SectionView({section,view,prefix}:{section:Section;view:SalesView;prefix:string}){
 const [drill,setDrill]=useState<Drill|null>(null),currency=view.currency;
 const id=(key:string)=>`${prefix}-${section.measure}-${key}`.replace(/[^a-zA-Z0-9_-]/g,'-');
 const toggle=(cell:Cell,group:string|null,key:string)=>setDrill(current=>current?.id===id(key)?null:{id:id(key),title:group?`${cell.label} · ${group}`:cell.label,cell});
 const grid=(key:string,title:string,groups:Group[])=>{if(!groups.length)return null;const cells=groups[0]!.cells;
  return <div className="sales-table" role="region" aria-label={`${section.title} by ${title.toLowerCase()}`} tabIndex={0} key={key}><table><caption>{section.title} by {title.toLowerCase()}</caption><thead><tr><th scope="col">{title}</th>{cells.map(cell=><th scope="col" key={cell.key}>{cell.label}</th>)}</tr></thead><tbody>{groups.map(group=><tr key={group.key}><th scope="row">{group.label}</th>{group.cells.map(cell=><td key={cell.key}><CellButton cell={cell} group={group.label} currency={currency} open={drill?.id===id(`${key}-${group.key}-${cell.key}`)} onOpen={()=>toggle(cell,group.label,`${key}-${group.key}-${cell.key}`)}/></td>)}</tr>)}</tbody></table></div>;};
 return <article className="sales-section" aria-labelledby={id('title')}>
  <h4 id={id('title')}>{section.title}</h4>
  <p className="sales-definition">{section.definition}</p>
  <dl className="sales-totals">{section.totals.map(cell=><div key={cell.key} className={cell.success===false?'sales-not-success':undefined}><dt>{cell.label}</dt><dd><CellButton cell={cell} group={null} currency={currency} open={drill?.id===id(`total-${cell.key}`)} onOpen={()=>toggle(cell,null,`total-${cell.key}`)}/>{cell.note&&<span className="sales-cell-note">{cell.note}</span>}</dd></div>)}</dl>
  {section.withheld&&<p className="sales-note">{section.withheld}</p>}
  {section.tables.map(table=>grid(table.key,table.title,table.groups))}
  {grid('month','Month',section.months)}
  {section.missing.map(text=><p className="sales-note" key={text}>Missing data: {text}</p>)}
  <p className="sales-sources">Source fields: {section.sources.join(', ')}.</p>
  {drill&&<DrillList drill={drill} rows={view.rows} currency={currency}/>}
 </article>;
}
const local=(at:string,timeZone:string)=>new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(at));
/** Late-arriving evidence per measure: each changed figure once, then the records behind those changes once. */
export function LateEvidence({view,late,prefix}:{view:SalesView;late:NonNullable<SalesView['late']>;prefix:string}){
 return <section className="sales-late" aria-labelledby={`${prefix}-late-title`}>
  <h4 id={`${prefix}-late-title`}>Late-arriving evidence</h4>
  <p>{late.note} Checked {local(late.computedAt,view.timezone)}.</p>
  {late.sections.length?late.sections.map(section=><div key={section.measure} className="sales-late__section"><h5>{section.title}</h5>
   <ul className="sales-late__figures" aria-label={`${section.title}: late changes`}>{section.cells.map(cell=><li key={`${cell.group}:${cell.key}`}>{cell.label}{cell.group?` · ${cell.group}`:''}: +{cellValue({format:cell.format,value:cell.value},view.currency)}</li>)}</ul>
   <ol aria-label={`${section.title}: late records`}>{[...new Set(section.cells.flatMap(cell=>cell.rows))].map(key=>{const row=late.rows[key];return row?<li key={key}>{row.href?<a href={row.href}>{row.label}</a>:row.label} · {row.detail}</li>:null;})}</ol>
  </div>):<p>No late-arriving evidence has been recorded for this period.</p>}
 </section>;
}
export function SalesResult({view}:{view:SalesView}){
 const prefix=view.saved?'saved':'preview',first=view.period.months[0],last=view.period.months.at(-1);
 return <article className="sales-result" aria-labelledby={`${prefix}-sales-result-title`}>
  <h3 id={`${prefix}-sales-result-title`}>{view.saved?'Saved sales result':'Sales report preview'}</h3>
  <p className="sales-result__name">{view.name} · version {view.definitionVersion}</p>
  <dl className="sales-basis" aria-label="Report basis">
   <div><dt>Period</dt><dd>{first?.label}{first!==last?` to ${last?.label}`:''} ({view.period.from} to {view.period.through})</dd></div>
   <div><dt>Timezone</dt><dd>{view.timezone}. {view.period.bucket}. {view.period.boundaries}</dd></div>
   <div><dt>Currency</dt><dd>{view.currency}, from each deal amount; no exchange rates or attribution.</dd></div>
   <div><dt>Filters and grouping</dt><dd>{view.filters.pipelines.length?`Pipelines: ${view.filters.pipelines.map(pipeline=>pipeline.name).join(', ')}.`:'All pipelines.'} {view.filters.reps===null?(view.definition.repIds.length?`${view.definition.repIds.length} chosen reps (names need workspace settings access).`:'All reps.'):view.filters.reps.length?`Reps: ${view.filters.reps.map(rep=>rep.name).join(', ')}.`:'All reps.'} Won, lost, revenue, win rate and sales cycle grouped by {view.filters.groupBy}.</dd></div>
   <div><dt>Access</dt><dd>{view.access.note}</dd></div>
   <div><dt>Freshness</dt><dd>{view.freshness}</dd></div>
   {view.missing.length>0&&<div><dt>Missing data</dt><dd><ul>{view.missing.map(text=><li key={text}>{text}</li>)}</ul></dd></div>}
  </dl>
  {view.sections.map(section=><SectionView key={section.measure} section={section} view={view} prefix={prefix}/>)}
  {view.late&&<LateEvidence view={view} late={view.late} prefix={prefix}/>}
 </article>;
}
