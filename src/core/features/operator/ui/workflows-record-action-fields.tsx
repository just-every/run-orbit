import {WorkflowAction,WorkflowMetadata} from './workflows-types';

export function WorkflowStageChoice({action,metadata,onChange,label='Destination stage'}:{action:WorkflowAction;metadata:WorkflowMetadata;onChange:(patch:Partial<WorkflowAction>)=>void;label?:string}) {
 return <label>{label}<select required value={action.stage??''} onChange={event=>{const stage=metadata.stages.find(item=>item.id===event.target.value);onChange({stage:event.target.value,pipelineId:stage?.pipeline_id});}}><option value="">Choose a stage</option>{metadata.stages.map(stage=><option key={stage.id} value={stage.id}>{metadata.pipelines.find(pipeline=>pipeline.id===stage.pipeline_id)?.name} · {stage.name}</option>)}</select></label>;
}

export function WorkflowCreateDeal({action,metadata,onChange}:{action:WorkflowAction;metadata:WorkflowMetadata;onChange:(patch:Partial<WorkflowAction>)=>void}) {
 const values=action.values??{};
 const setValue=(key:string,value:unknown)=>onChange({recordType:'opportunity',values:{...values,[key]:value}});
 return <><label>New deal title<input required value={String(values.title??'')} onChange={event=>setValue('title',event.target.value)}/></label><WorkflowStageChoice action={action} metadata={metadata} onChange={onChange}/><label>New deal owner<select required value={String(values.owner_id??'')} onChange={event=>setValue('owner_id',event.target.value)}><option value="">Choose an operator</option>{metadata.operators.filter(person=>person.status==='active'&&!person.collaborator).map(person=><option key={person.id} value={person.id}>{person.display_name}</option>)}</select></label><label>Amount in cents<input type="number" min="0" step="1" value={Number(values.value_cents??0)} onChange={event=>setValue('value_cents',Number(event.target.value))}/></label><p className="workflows-note">The new deal inherits the target record’s company and contacts. A nonzero amount needs approval.</p></>;
}
