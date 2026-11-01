import {useEffect,useState} from 'react';
import {recordsRequest} from '../operator/ui/records-api';
import {label} from '../operator/ui/formatters';
import {reportFieldLabel} from './report-field-labels';

const common=['id','created_at','updated_at'];
const fields:Record<string,string[]>={
 opportunity:['title','lifecycle','stage_id','owner_id','company_id','value_cents','expected_close_at','score','band','queue_state','queue_reason','last_contributing_signal_at','next_due_at','closed_at','closed_by','close_reason'],
 contact:['name','email','phone','job_title','timezone','company_id','contactability'],
 company:['name','primary_domain'],
};

/** `initial` is the open version's field when editing: a field outside the list opens as "Another field…" with its key. */
export function ReportField({name,title,type,numeric=false,value,onChange,initial}:{name:string;title:string;type:string;numeric?:boolean;value?:string;onChange?:(value:string)=>void;initial?:string}){
 const options=numeric?(type==='opportunity'?['value_cents','score']:[]):[...common,...fields[type]],listed=(field?:string)=>!field||field==='other'||options.includes(field);
 const [selected,setSelected]=useState(initial??''),raw=value??selected,choice=listed(raw)?raw:'other';
 return <div><label>{title}<select aria-label={title} name={choice==='other'?undefined:name} value={choice} onChange={event=>{setSelected(event.target.value);onChange?.(event.target.value);}}><option value="">None</option>{options.map(field=><option key={field} value={field}>{reportFieldLabel(field)}</option>)}<option value="other">Another field…</option></select></label>{choice==='other'&&<label>{title}: field key<input name={name} placeholder="Enter the field key" required defaultValue={listed(initial)?undefined:initial}/></label>}</div>;
}

export function ReportFilterValue({field,initial}:{field:string;initial?:string}){
 const [options,setOptions]=useState<{id:string;name:string}[]>([]),[error,setError]=useState('');
 const linked=field==='stage_id'||field==='owner_id';
 useEffect(()=>{let current=true;setOptions([]);setError('');if(linked)void recordsRequest<any>('settings').then(settings=>{if(current)setOptions(field==='stage_id'?settings.stages:settings.operators.filter((operator:any)=>operator.status==='active').map((operator:any)=>({id:operator.id,name:operator.display_name})));}).catch(reason=>{if(current)setError(reason.message);});return()=>{current=false;};},[field]);
 const values:Record<string,string[]>={lifecycle:['open','won','lost'],band:['low','medium','high'],queue_state:['now','next','none'],contactability:['contactable','do_not_contact']};
 return <label>Filter equals{linked?<select key={options.length} aria-label="Filter equals" name="filterValue" required defaultValue={initial}><option value="">Choose {field==='stage_id'?'a stage':'an owner'}</option>{options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select>:values[field]?<select aria-label="Filter equals" name="filterValue" defaultValue={initial}>{values[field].map(value=><option key={value} value={value}>{label(value)}</option>)}</select>:<input name="filterValue" required={Boolean(field)} defaultValue={initial}/>} {error&&<span role="alert">{error}</span>}</label>;
}
