import {useState} from 'react';
import type {Cell,Group,Section} from '../analytics/sales-measures';
import type {RowView,SalesView} from '../analytics/sales-view';
import {CellButton,DrillList,LateEvidence,type Drill} from '../analytics/sales-result';
import {DashboardModal} from '../dashboards/modal';
import {formatTime} from '../operator/ui/formatters';

/** A sales result on its report page: each measure's figures lead unboxed (one key figure in tangerine), the breakdowns read
 * in ruled columns, the basis folds into one quiet line, and the records behind a figure open in the dashboard's drawer. */
const pages:Record<string,string>={opportunity:'/app/opportunities',contact:'/app/contacts',company:'/app/companies'};
/** A full operator's records open on their own pages; anyone else's stay in their shared records. */
function recordLinks(rows:Record<string,RowView>,full:boolean){
 if(!full)return rows;
 return Object.fromEntries(Object.entries(rows).map(([key,row])=>{
  const link=row.href?new URL(row.href,'https://orbit.invalid'):null,kind=link?.searchParams.get('kind')??'',id=link?.searchParams.get('id');
  return [key,link?.pathname==='/app/shared-records'&&id&&pages[kind]?{...row,href:`${pages[kind]}/${encodeURIComponent(id)}`}:row];
 }));
}
/** A count opens with the amounts of the money figure beside it, when both count the same records. */
function siblingAmounts(cell:Cell,cells:Cell[]){
 const money=cell.format==='count'?cells.find(other=>other.format==='money'):undefined,values=money?.values;
 return values&&money.rows.length===cell.rows.length&&cell.rows.every(key=>key in values)?values:undefined;
}
type Open=(cell:Cell,group:string|null,id:string,cells:Cell[])=>void;

function SectionBlock({section,currency,lead,multi,keyCell,opened,open,prefix}:{section:Section;currency:string;lead:boolean;multi:boolean;keyCell:Cell|undefined;opened:string|null;open:Open;prefix:string}){
 const id=(key:string)=>`${prefix}-${section.measure}-${key}`.replace(/[^a-zA-Z0-9_-]/g,'-');
 const grid=(key:string,title:string,groups:Group[])=>{if(!groups.length)return null;const cells=groups[0]!.cells;
  return <div className={`sales-table${key==='month'?' reports-table--month':''}`} role="region" aria-label={`${section.title} by ${title.toLowerCase()}`} tabIndex={0} key={key}><table><caption>By {title.toLowerCase()}</caption><thead><tr><th scope="col">{title}</th>{cells.map(cell=><th scope="col" key={cell.key}>{cell.label}</th>)}</tr></thead><tbody>{groups.map(group=><tr key={group.key}><th scope="row">{group.label}</th>{group.cells.map(cell=>{const cellId=id(`${key}-${group.key}-${cell.key}`);return <td key={cell.key}><CellButton cell={cell} group={group.label} currency={currency} open={opened===cellId} onOpen={()=>open(cell,group.label,cellId,group.cells)}/></td>;})}</tr>)}</tbody></table></div>;};
 const tables=[...section.tables.map(table=>grid(table.key,table.title,table.groups)),grid('month','Month',section.months)].filter(Boolean);
 return <article className={`sales-section${lead?' reports-lead':''}`} {...multi?{'aria-labelledby':id('title')}:{'aria-label':section.title}}>
  {multi&&<h2 id={id('title')}>{section.title}</h2>}
  <dl className="sales-totals">{section.totals.map(cell=>{const cellId=id(`total-${cell.key}`),classes=[cell.success===false&&'sales-not-success',cell===keyCell&&'reports-key'].filter(Boolean).join(' ');
   return <div key={cell.key} className={classes||undefined}><dt>{cell.label}</dt><dd><CellButton cell={cell} group={null} currency={currency} open={opened===cellId} onOpen={()=>open(cell,null,cellId,section.totals)}/>{cell.note&&<span className="sales-cell-note">{cell.note}</span>}</dd></div>;})}</dl>
  {tables.length>0&&<div className="reports-tables">{tables}</div>}
  <p className="sales-definition">{section.definition}</p>
  {section.withheld&&<p className="sales-note">{section.withheld}</p>}
  {section.missing.map(text=><p className="sales-note" key={text}>Missing data: {text}</p>)}
 </article>;
}

/** One quiet line that opens to today's disclosed basis, word for word, and each measure's source fields. */
function Basis({view,busy,period}:{view:SalesView;busy:boolean;period:string}){
 const first=view.period.months[0],last=view.period.months.at(-1),pipelines=view.filters.pipelines.length,reps=view.definition.repIds.length,multi=view.sections.length>1;
 const summary=busy?'Computing…':['Basis',period,view.timezone,view.currency,pipelines?`${pipelines} ${pipelines===1?'pipeline':'pipelines'}`:'All pipelines',reps?`${reps} ${reps===1?'rep':'reps'}`:'All reps',
  ...view.access.limited?['Limited to your access']:[],...view.missing.length?['Missing data']:[],...view.saved?['Saved result']:[`Computed ${formatTime(view.asOf,view.timezone)}`,'Not saved']].join(' · ');
 return <details className="reports-basis"><summary>{summary}</summary>
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
  {view.sections.map(section=><p className="sales-sources" key={section.measure}>{multi?`${section.title}. `:''}Source fields: {section.sources.join(', ')}.</p>)}
 </details>;
}

export function SalesResultView({view,busy,full,period}:{view:SalesView;busy:boolean;full:boolean;period:string}){
 const [drill,setDrill]=useState<{drill:Drill;from:HTMLElement|null}|null>(null);
 const prefix=view.saved?'saved':'preview',lead=view.sections[0],keyCell=lead?.totals.find(cell=>cell.format==='money')??lead?.totals[0];
 const open:Open=(cell,group,id,cells)=>{const amounts=siblingAmounts(cell,cells);setDrill({drill:{id,title:group?`${cell.label} · ${group}`:cell.label,cell,...amounts?{amounts}:{}},from:document.activeElement instanceof HTMLElement?document.activeElement:null});};
 return <article className="sales-result" aria-busy={busy}>
  {view.sections.map((section,index)=><SectionBlock key={section.measure} section={section} currency={view.currency} lead={index===0} multi={view.sections.length>1} keyCell={index===0?keyCell:undefined} opened={drill?.drill.id??null} open={open} prefix={prefix}/>)}
  <Basis view={view} busy={busy} period={period}/>
  {view.late&&<LateEvidence view={view} late={{...view.late,rows:recordLinks(view.late.rows,full)}} prefix={prefix} level={3}/>}
  {drill&&<DashboardModal title={`Records behind ${drill.drill.title}`} drawer returnFocus={drill.from} onClose={()=>setDrill(null)}><DrillList drill={drill.drill} rows={recordLinks(view.rows,full)} currency={view.currency} timezone={view.timezone} table/></DashboardModal>}
 </article>;
}
