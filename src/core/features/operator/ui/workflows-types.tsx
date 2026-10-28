export type WorkflowCondition = {field:string;operator:'equals'|'not_equals'|'empty'|'not_empty'|'lt'|'gt';value?:unknown};
export type WorkflowAction = {kind:'set'|'copy'|'stamp'|'clear'|'add'|'subtract'|'move_stage'|'create_record'|'assign_owner'|'create_task'|'remind_task'|'notify'|'webhook';target?:string;field?:string;value?:unknown;sourceField?:string;sourceTarget?:string;offsetDays?:number;clock?:'trigger'|'run';title?:string;recordType?:'opportunity'|'company'|'contact';values?:Record<string,unknown>;stage?:string;pipelineId?:string;operatorIds?:string[];mode?:'fixed'|'account_owner'|'round_robin';url?:string;body?:string};
export type WorkflowDefinition = {trigger:{kind:'record_created'|'record_changed'|'activity_logged'|'form_submitted'|'schedule'|'enrichment';recordType:'opportunity'|'contact'|'company';staleDays?:number};conditions:WorkflowCondition[];actions:WorkflowAction[];delayMinutes?:number;order?:number};
export type Workflow = {id:string;name:string;version:number;status:string;definition:WorkflowDefinition;activatedAt?:string|null;activeVersion?:number|null;needsReactivation?:boolean};
export type WorkflowRun = {id:string;workflowId:string;workflowName:string;version:number;recordId:string;status:string;reason?:string|null;dueAt?:string|null;attempts:unknown;outcome?:unknown;[key:string]:unknown};
export type WorkflowApproval = {id:string;recordId:string;field:string;before:unknown;after:unknown;evidence:unknown;status:string};
export type WorkflowData = {workflows:Workflow[];runs:WorkflowRun[];approvals:WorkflowApproval[]};
export type WorkflowPreview = {previewId:string;records:{recordId:string;label:string;changes:{field:string;before:unknown;after:unknown;needsApproval:boolean}[];effects:unknown[];errors?:string[]}[];counts:Record<string,unknown>;historical?:{eventId:string;recordId:string;occurredAt:string}[];asOf?:string};
export type WorkflowPeople = {id:string;display_name:string;status:string;collaborator?:number}[];
export type WorkflowMetadata = {operators:WorkflowPeople;stages:{id:string;name:string;pipeline_id:string}[];pipelines:{id:string;name:string}[]};

export async function workflowRequest<T>(path='',body?:unknown):Promise<T> {
 const response=await fetch(`/api/workflows${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 const result=await response.json() as T&{error?:string};
 if(!response.ok)throw new Error(result.error??`Workflow request failed (${response.status}).`);
 return result;
}
export const workflowLabel=(text:string)=>text.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());
export const workflowValue=(value:unknown):string=>value===null?'Empty':value===undefined?'Not recorded':typeof value==='object'?JSON.stringify(value,null,2):String(value);
export const workflowTime=(value?:string|null)=>value?new Date(value).toLocaleString():'Not scheduled';
export const newWorkflowDefinition=():WorkflowDefinition=>({trigger:{kind:'record_changed',recordType:'opportunity'},conditions:[],actions:[{kind:'set',target:'trigger',field:'',value:''}],delayMinutes:0,order:0});

export function WorkflowValueInput({value,onChange,label='Value'}:{value:unknown;onChange:(value:unknown)=>void;label?:string}) {
 const kind=typeof value==='number'?'number':typeof value==='boolean'?'boolean':'text';
 return <div className="workflows-value"><label>{label} type<select value={kind} onChange={event=>onChange(event.target.value==='number'?0:event.target.value==='boolean'?false:'')}><option value="text">Text</option><option value="number">Number</option><option value="boolean">Yes / no</option></select></label><label>{label}{kind==='boolean'?<select value={String(value)} onChange={event=>onChange(event.target.value==='true')}><option value="true">Yes</option><option value="false">No</option></select>:<input type={kind==='number'?'number':'text'} step={kind==='number'?'any':undefined} value={value==null?'':String(value)} onChange={event=>onChange(kind==='number'?Number(event.target.value):event.target.value)}/>}</label></div>;
}

export function WorkflowField({value,onChange,label='Field'}:{value?:string;onChange:(field:string)=>void;label?:string}) {
 return <label>{label}<input required list="workflow-field-options" value={value??''} placeholder="Choose a field or enter custom:field_key" onChange={event=>onChange(event.target.value)}/></label>;
}
export function WorkflowFields(){return <datalist id="workflow-field-options">{[['title','Deal title'],['name','Name'],['email','Email'],['phone','Phone'],['job_title','Job title'],['timezone','Time zone'],['primary_domain','Company domain'],['owner_id','Owner'],['stage_id','Deal stage'],['lifecycle','Deal open / won / lost'],['value_cents','Deal amount in cents'],['expected_close_at','Deal close date'],['contactability','Contact permission'],['custom:','Custom field key']].map(([value,label])=><option value={value} label={label} key={value}/>)}</datalist>;}
