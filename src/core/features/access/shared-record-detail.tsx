import {useEffect,useId,useState} from 'react';
import {DataValue,storedValue} from '../operator/ui/data-value';
import type {RecordProjection} from '../../shared/expansion-contracts';
import {api} from '../fold-ui/workspace';
import {grantFieldLabel} from './grant-fields';
export type SharedRecord=RecordProjection&{editableFields:string[]};
type Save=(field:string,value:unknown)=>Promise<void>;
/** Fields a collaborator edits through a plain text or number box; references and contactability have their own controls. */
const scalar=(value:unknown)=>value===null||['string','number'].includes(typeof value);
const order=['name','title','email','phone','job_title','company_id','primary_domain','stage_id','value_cents','expected_close_at','timezone','contactability'];
const rank=(field:string)=>order.includes(field)?order.indexOf(field):order.length;

/** Each permitted field under its own label. Only fields the server reports editable get a control. */
export function SharedRecordDetail({base,record,save}:{base:string;record:SharedRecord;save:Save}){
 const fields=Object.entries(record.fields).sort(([a],[b])=>rank(a)-rank(b)),editable=fields.filter(([field])=>record.editableFields.includes(field)).map(([field])=>grantFieldLabel(field));
 return <section aria-label="Shared record details"><h3>{String(record.fields.name??record.fields.title??'Shared record')}</h3><p className="fold-hint">{editable.length?`You may change: ${editable.join(', ')}. The other fields here are read-only.`:'You may see these fields; none of them can be changed.'}</p>{fields.map(([field,value])=><div className="fold-row" key={field} data-field={field}><SharedField base={base} field={field} value={value} editable={record.editableFields.includes(field)} revision={record.ref.revision} save={save}/></div>)}</section>;
}

function SharedField({base,field,value,editable,revision,save}:{base:string;field:string;value:unknown;editable:boolean;revision:number;save:Save}){
 const label=grantFieldLabel(field);
 if(field==='company_id')return <CompanyField base={base} value={value} editable={editable} revision={revision} save={save}/>;
 if(field==='contactability')return editable&&value!=='do_not_contact'?<form onSubmit={event=>{event.preventDefault();void save(field,'do_not_contact');}}><p><strong>{label}:</strong> Contactable</p><button>Mark Do not contact</button></form>:<p><strong>{label}:</strong> {value==='do_not_contact'?'Do not contact':'Contactable'}</p>;
 if(!editable||!scalar(value))return <p><strong>{label}:</strong> <DataValue value={storedValue(field,value)}/></p>;
 const numeric=typeof value==='number';
 return <form onSubmit={event=>{event.preventDefault();const text=String(new FormData(event.currentTarget).get('value'));void save(field,numeric?Number(text):text===''?null:text);}}><label>{label}<input name="value" type={numeric?'number':'text'} defaultValue={value===null?'':String(value)} key={`${revision}:${field}`}/></label><button>Save {label.toLowerCase()}</button></form>;
}

/** A contact's or deal's company reads as the company's name, which the owner shares with the Company field. */
function CompanyField({base,value,editable,revision,save}:{base:string;value:unknown;editable:boolean;revision:number;save:Save}){
 const id=useId(),[name,setName]=useState(''),[choices,setChoices]=useState<RecordProjection[]>([]);
 useEffect(()=>{let live=true;setName('');if(typeof value==='string')api<RecordProjection>(`${base}/company/${encodeURIComponent(value)}`).then(company=>{if(live)setName(String(company.fields.name??''));}).catch(()=>{if(live)setName('');});return()=>{live=false;};},[base,value,revision]);
 useEffect(()=>{let live=true;if(editable)api<{items:RecordProjection[]}>(`${base}?kind=company`).then(result=>{if(live)setChoices(result.items);}).catch(()=>{if(live)setChoices([]);});return()=>{live=false;};},[base,editable,revision]);
 const current=typeof value==='string'?name||'A company not shared with you':'No company';
 if(!editable)return <p><strong>Company:</strong> {current}</p>;
 return <form onSubmit={event=>{event.preventDefault();const id=String(new FormData(event.currentTarget).get('value'));void save('company_id',id||null);}}><label htmlFor={id}>Company</label><select id={id} name="value" defaultValue={typeof value==='string'?value:''} key={`${revision}:${choices.length}`}><option value="">No company</option>{typeof value==='string'&&!choices.some(item=>item.ref.id===value)?<option value={value}>{current}</option>:null}{choices.map(item=><option key={item.ref.id} value={item.ref.id}>{String(item.fields.name??'Unnamed company')}</option>)}</select><button>Save company</button></form>;
}
