import { useState } from 'react';
import { recordsRequest } from './records-api';

export function PipelineStageFields({settings,stageId,onChange}:{settings:any;stageId:string;onChange:(id:string)=>void}) {
 const current=settings.stages.find((s:any)=>s.id===stageId),pipelineId=current?.pipeline_id??settings.pipelines[0]?.id;
 return <><label>Pipeline<select aria-label="Pipeline" value={pipelineId??''} onChange={e=>onChange(settings.stages.find((s:any)=>s.pipeline_id===e.target.value)?.id??'')}>{settings.pipelines.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Pipeline stage<select aria-label="Pipeline stage" required value={stageId} onChange={e=>onChange(e.target.value)}>{settings.stages.filter((s:any)=>s.pipeline_id===pipelineId).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></>;
}
export function MovePipeline({record,settings,onChanged}:{record:any;settings:any;onChanged:()=>Promise<void>}) {
 const [stage,setStage]=useState(record.stage_id),[review,setReview]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!settings)return <p role="status">Loading pipeline choices…</p>;
 const current=settings.stages.find((s:any)=>s.id===record.stage_id),destination=settings.stages.find((s:any)=>s.id===stage);
 const description=(s:any)=>`${settings.pipelines.find((p:any)=>p.id===s?.pipeline_id)?.name??'Pipeline unavailable'} / ${s?.name??'Stage unavailable'}`;
 async function move(){setBusy(true);setError('');try{await recordsRequest(`records/opportunity/${record.id}/move`,'POST',{stageId:stage,reviewedStageId:record.stage_id});setReview(false);await onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="workbench-form"><h3>Move deal</h3><p>Current: {description(current)}</p><PipelineStageFields settings={settings} stageId={stage} onChange={id=>{setStage(id);setReview(false);}}/>{destination?<p>Win probability {destination.probability}% · Stale after {destination.stale_interval_days??settings.workspace.stale_interval_days} days{destination.required_fields.length?` · Required: ${destination.required_fields.join(', ')}`:''}</p>:null}<button disabled={busy||stage===record.stage_id} onClick={()=>setReview(true)}>Review move</button>{review?<div role="group" aria-label="Review deal move"><p>Move from {description(current)} to {description(destination)}?</p><p>The deal’s status and owner stay the same. Required destination fields are checked before moving.</p><button className="operator-button" disabled={busy} onClick={()=>void move()}>Confirm move</button> <button onClick={()=>setReview(false)}>Cancel move</button></div>:null}{error?<p role="alert">{error}</p>:null}</section>;
}
