import {useEffect,useState} from 'react';
import {recordsRequest} from '../operator/ui/records-api';
import {label} from '../operator/ui/formatters';
import {reportFieldLabel} from './report-field-labels';

const common=['id','created_at','updated_at'];
const fields:Record<string,string[]>={
 opportunity:['title','lifecycle','stage_id','owner_id','company_id','value_cents','expected_close_at','score','band','queue_state','queue_reason','last_contributing_signal_at','next_due_at','closed_at','closed_by','close_reason'],
 contact:['owner_id','name','email','phone','job_title','timezone','company_id','contactability'],
 company:['owner_id','name','primary_domain'],
};

export function ReportField({name,title,type,numeric=false,value,onChange}:{name:string;title:string;type:string;numeric?:boolean;value?:string;onChange?:(value:string)=>void}){
 const [selected,setSelected]=useState('');
 const choice=value??selected,options=numeric?(type==='opportunity'?['value_cents','score']:[]):[...common,...fields[type]];
 return <div><label>{title}<select aria-label={title} name={choice==='other'?undefined:name} value={choice} onChange={event=>{setSelected(event.target.value);onChange?.(event.target.value);}}><option value="">None</option>{options.map(field=><option key={field} value={field}>{reportFieldLabel(field)}</option>)}<option value="other">Another field…</option></select></label>{choice==='other'&&<label>{title}: field key<input name={name} placeholder="Enter the field key" required/></label>}</div>;
}

export function ReportFilterValue({field}:{field:string}){
 const [options,setOptions]=useState<{id:string;name:string}[]>([]),[error,setError]=useState('');
 const linked=field==='stage_id'||field==='owner_id';
 useEffect(()=>{let current=true;setOptions([]);setError('');if(linked)void recordsRequest<any>('settings').then(settings=>{if(current)setOptions(field==='stage_id'?settings.stages:settings.operators.filter((operator:any)=>operator.status==='active').map((operator:any)=>({id:operator.id,name:operator.display_name})));}).catch(reason=>{if(current)setError(reason.message);});return()=>{current=false;};},[field]);
 const values:Record<string,string[]>={lifecycle:['open','won','lost'],band:['low','medium','high'],queue_state:['now','next','none'],contactability:['contactable','do_not_contact']};
 return <label>Filter equals{linked?<select aria-label="Filter equals" name="filterValue" required><option value="">Choose {field==='stage_id'?'a stage':'an owner'}</option>{field==='owner_id'&&<option value="unassigned">Unassigned</option>}{options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select>:values[field]?<select aria-label="Filter equals" name="filterValue">{values[field].map(value=><option key={value} value={value}>{label(value)}</option>)}</select>:<input name="filterValue" required={Boolean(field)}/>} {error&&<span role="alert">{error}</span>}</label>;
}
