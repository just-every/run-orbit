import type {CSSProperties} from 'react';
import type {Section} from '../analytics/sales-measures';
import type {SalesView} from '../analytics/sales-view';
import {cellValue} from '../analytics/sales-format';
import {pipelineColor,plural} from './display';
import type {CellDrill} from './tile-bodies';
/** Open pipeline as stage × pipeline: bar length encodes value against the tile's largest cell; a stage a pipeline lacks stays empty. */
export function StageMatrix({view,section,button}:{view:SalesView;section:Section;button:CellDrill}){
 const order=view.filters.pipelines.map(p=>p.id),rank=(key:string)=>order.indexOf(key)<0?999:order.indexOf(key),pipelines=[...(section.tables.find(t=>t.key==='pipeline')?.groups??[])].sort((a,b)=>rank(a.key)-rank(b.key)),groups=section.tables.find(t=>t.key==='stage')?.groups??[],color=pipelineColor(view);
 const stages=[...new Set(pipelines.flatMap(pipeline=>view.stages.filter(s=>s.pipelineId===pipeline.key).sort((a,b)=>a.position-b.position).map(s=>s.name)))];
 const max=Math.max(1,...groups.map(g=>g.cells.find(c=>c.key==='value')?.value??0));
 return <><div className="dash-matrix" style={{'--stage-count':stages.length} as CSSProperties}><div className="dash-matrix__head"><span>Stage</span>{stages.map(name=><span key={name}>{name}</span>)}</div>
  {pipelines.map(pipeline=>{const deals=pipeline.cells.find(c=>c.format==='count'),value=pipeline.cells.find(c=>c.format==='money');return <div className="dash-matrix__pipeline" key={pipeline.key} style={{'--pipeline-color':color(pipeline.key)} as CSSProperties}><h3><i className="dash-dot"/><span className="dash-matrix__name">{pipeline.label}</span><span className="dash-matrix__total">{deals?`${cellValue(deals,view.currency)} ${plural(deals.value,'deal','deals')}`:''}{value?` · ${cellValue(value,view.currency)}`:''}</span></h3>
   {stages.map(name=>{const stage=view.stages.find(s=>s.pipelineId===pipeline.key&&s.name===name),group=stage?groups.find(g=>g.key===stage.id):null,count=group?.cells.find(c=>c.key==='deals'),amount=group?.cells.find(c=>c.key==='value');return stage?<div className="dash-matrix__cell" key={name}><span className="dash-matrix__stage">{name}</span><div className="dash-bar"><span style={{width:`${Math.max(0,(amount?.value??0)/max*100)}%`}}/></div>{count?button(count,`${name} · ${pipeline.label}`):<span>Not available</span>}<span className="dash-matrix__amount">{amount?cellValue(amount,view.currency):'Not available'}</span></div>:<div className="dash-matrix__cell dash-matrix__absent" key={name} aria-hidden="true"/>;})}
  </div>;})}
 </div><p className="dash-meta">Deals open when computed. Bars compare value; the period does not filter open pipeline.</p></>;
}
