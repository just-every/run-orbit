import {Link} from '@tanstack/react-router';
import type {CustomerRecord} from './records-api';
import {ClosedDealBadge,opportunityMeta} from './records-list';
export function PipelineBoard({records,settings,pipelineId}:{records:CustomerRecord[];settings:any;pipelineId:string}) {
 const pipelines=settings.pipelines.filter((pipeline:any)=>!pipelineId||pipeline.id===pipelineId);
 return <div className="pipeline-boards">{pipelines.map((pipeline:any)=>{
  const stages=settings.stages.filter((stage:any)=>stage.pipeline_id===pipeline.id),probabilities=new Set(stages.map((stage:any)=>stage.probability));
  return <section key={pipeline.id} aria-label={`${pipeline.name} board`}><h2>{pipeline.name}</h2><div className="pipeline-board">{stages.map((stage:any)=>{
   const deals=records.filter(record=>record.stage_id===stage.id&&record.lifecycle==='open');
   return <section className="operator-surface pipeline-column" key={stage.id}><h3>{stage.name}</h3><p>{deals.length} shown{probabilities.size>1?` · ${stage.probability}% probability`:''}</p>{deals.map(deal=><Link className="pipeline-deal" key={deal.id} to="/app/opportunities/$id" params={{id:deal.id}}><strong>{deal.title}</strong><span>{opportunityMeta(deal,settings)}</span></Link>)}{!deals.length?<p>No matching deals</p>:null}</section>;
  })}{(['won','lost'] as const).map(state=>{
   const deals=records.filter(record=>record.lifecycle===state&&stages.some((stage:any)=>stage.id===record.stage_id));
   return deals.length?<section className="operator-surface pipeline-column" key={state} aria-label={`${state==='won'?'Won':'Lost'} deals`}><h3>{state==='won'?'Won':'Lost'}</h3><p>{deals.length} shown</p>{deals.map(deal=><Link className="pipeline-deal" key={deal.id} to="/app/opportunities/$id" params={{id:deal.id}}><strong>{deal.title}</strong><div><ClosedDealBadge record={deal}/></div><span>{opportunityMeta(deal,settings)}</span></Link>)}</section>:null;
  })}</div></section>;
 })}<p>Board and list show the same first 50 matching records. Narrow the filters or search to find other deals.</p></div>;
}
