import type {CustomerRecord} from './records-api';
import {opportunityMeta} from './records-list';
export function PipelineBoard({records,settings,pipelineId,onOpen}:{records:CustomerRecord[];settings:any;pipelineId:string;onOpen:(id:string)=>void}) {
 const pipelines=settings.pipelines.filter((pipeline:any)=>!pipelineId||pipeline.id===pipelineId);
 const owners=new Map<string|null,number>();for(const record of records)owners.set(record.owner_id??null,(owners.get(record.owner_id??null)??0)+1);
 const rankedOwners=[...owners].sort((a,b)=>b[1]-a[1]),commonOwner=rankedOwners.length===1||rankedOwners[0]?.[1]>rankedOwners[1]?.[1]?rankedOwners[0]?.[0]:undefined;
 return <div className="pipeline-boards">{pipelines.map((pipeline:any)=>{
  const stages=settings.stages.filter((stage:any)=>stage.pipeline_id===pipeline.id),probabilities=new Set(stages.map((stage:any)=>stage.probability));
  return <section key={pipeline.id} aria-label={`${pipeline.name} board`}><h2>{pipeline.name}</h2><div className="pipeline-board">{stages.map((stage:any)=>{
   const deals=records.filter(record=>record.stage_id===stage.id);
   return <section className="operator-surface pipeline-column" key={stage.id}><h3>{stage.name}</h3><p>{deals.length} shown{probabilities.size>1?` · ${stage.probability}% probability`:''}</p>{deals.map(deal=><button className="pipeline-deal" key={deal.id} onClick={()=>onOpen(deal.id)}><strong>{deal.title}</strong><span>{opportunityMeta(deal,settings)}</span>{owners.size>1&&(deal.owner_id??null)!==commonOwner?<span>{settings.operators.find((operator:any)=>operator.id===deal.owner_id)?.display_name??'Unassigned'}</span>:null}</button>)}{!deals.length?<p>No matching deals</p>:null}</section>;
  })}</div></section>;
 })}<p>Board and list show the same first 50 matching records. Narrow the filters or search to find other deals.</p></div>;
}
