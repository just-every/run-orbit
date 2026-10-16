import {useEffect,useId,useState} from 'react';
import {DataValue,fieldLabel,storedValue} from '../operator/ui/data-value';
import {customFieldValue} from '../operator/ui/import-provenance';
import type {RecordProjection} from '../../shared/expansion-contracts';
import {api} from '../fold-ui/workspace';
import {fieldListLabel,fieldRank,grantFieldLabel} from './grant-fields';
export type SharedRecord=RecordProjection&{editableFields:string[]};
/** Saves one field; resolves true once the server confirmed it. */
type Save=(field:string,value:unknown,label:string)=>Promise<boolean>;
/** Fields a collaborator edits through a plain text or number box; references and contactability have their own controls. */
const scalar=(value:unknown)=>value===null||['string','number'].includes(typeof value);
const customPrefix='custom_fields_json.';

/** Each permitted field under its own label. Only fields the server reports editable get a control. */
export function SharedRecordDetail({base,record,save,feedback}:{base:string;record:SharedRecord;save:Save;feedback:React.ReactNode}){
 const fields=Object.entries(record.fields).sort(([a],[b])=>fieldRank(a)-fieldRank(b)),editable=fieldListLabel(record.editableFields);
 return <section aria-label="Shared record details"><h3>{String(record.fields.name??record.fields.title??'Shared record')}</h3><p className="fold-hint">{editable?`You may change: ${editable}. The other fields here are read-only.`:'You may see these fields; none of them can be changed.'}</p>{feedback}{fields.map(([field,value])=><div className="fold-row" key={field} data-field={field}>{field==='custom_fields_json'?<CustomFields value={value} editable={record.editableFields} revision={record.ref.revision} save={save}/>:<SharedField base={base} field={field} value={value} editable={record.editableFields.includes(field)} revision={record.ref.revision} save={save}/>}</div>)}</section>;
}

/** A field's own save button, with "Saved" beside it once the server confirmed the change. */
function FieldForm({label,save,children}:{label:string;save:(value:string)=>Promise<boolean>;children:React.ReactNode}){
 const [saved,setSaved]=useState(false);
 return <form onSubmit={event=>{event.preventDefault();setSaved(false);void save(String(new FormData(event.currentTarget).get('value')??'')).then(setSaved);}} onInput={()=>setSaved(false)}>{children}<button>Save {label.toLowerCase()}</button>{saved?<span className="fold-saved"> Saved</span>:null}</form>;
}

function SharedField({base,field,value,editable,revision,save}:{base:string;field:string;value:unknown;editable:boolean;revision:number;save:Save}){
 const label=grantFieldLabel(field);
 if(field==='company_id')return <CompanyField base={base} value={value} editable={editable} revision={revision} save={save}/>;
 if(field==='contactability')return editable&&value!=='do_not_contact'?<form onSubmit={event=>{event.preventDefault();void save(field,'do_not_contact',label);}}><p><strong>{label}:</strong> Contactable</p><button>Mark Do not contact</button></form>:<p><strong>{label}:</strong> {value==='do_not_contact'?'Do not contact':'Contactable'}</p>;
 if(!editable||!scalar(value))return <p><strong>{label}:</strong> <DataValue value={storedValue(field,value)}/></p>;
 const numeric=typeof value==='number';
 return <FieldForm label={label} save={text=>save(field,numeric?Number(text):text===''?null:text,label)}><label>{label}<input name="value" type={numeric?'number':'text'} defaultValue={value===null?'':String(value)} key={`${revision}:${field}`}/></label></FieldForm>;
}

/** Each custom field under its own name; the granted ones are editable one by one. */
function CustomFields({value,editable,revision,save}:{value:unknown;editable:string[];revision:number;save:Save}){
 const fields=storedValue('custom_fields_json',value);
 if(!fields||typeof fields!=='object'||Array.isArray(fields))return <p><strong>Custom fields:</strong> <DataValue value={fields}/></p>;
 const entries=Object.entries(fields as Record<string,unknown>);
 return <fieldset className="fold-custom-fields"><legend>Custom fields</legend>{entries.length?entries.map(([name,current])=><div key={name} data-field={customPrefix+name}>{editable.includes(customPrefix+name)?<CustomField name={name} value={current} revision={revision} save={save}/>:<p><strong>{fieldLabel(name)}:</strong> <DataValue value={customFieldValue(name,current)}/></p>}</div>):<p>No custom fields.</p>}</fieldset>;
}

function CustomField({name,value,revision,save}:{name:string;value:unknown;revision:number;save:Save}){
 const label=fieldLabel(name),key=`${revision}:${name}`;
 const read=(text:string)=>typeof value==='boolean'?text==='true':typeof value==='number'?Number(text):text;
 return <FieldForm label={label} save={text=>save('custom_fields',{[name]:read(text)},label)}><label>{label}{typeof value==='boolean'?<select name="value" defaultValue={String(value)} key={key}><option value="true">Yes</option><option value="false">No</option></select>:<input name="value" type={typeof value==='number'?'number':'text'} defaultValue={value===null?'':String(value)} key={key}/>}</label></FieldForm>;
}

/** A contact's or deal's company reads as the company's name, which the owner shares with the Company field. */
function CompanyField({base,value,editable,revision,save}:{base:string;value:unknown;editable:boolean;revision:number;save:Save}){
 const id=useId(),[name,setName]=useState(''),[choices,setChoices]=useState<RecordProjection[]>([]);
 useEffect(()=>{let live=true;setName('');if(typeof value==='string')api<RecordProjection>(`${base}/company/${encodeURIComponent(value)}`).then(company=>{if(live)setName(String(company.fields.name??''));}).catch(()=>{if(live)setName('');});return()=>{live=false;};},[base,value,revision]);
 useEffect(()=>{let live=true;if(editable)api<{items:RecordProjection[]}>(`${base}?kind=company`).then(result=>{if(live)setChoices(result.items);}).catch(()=>{if(live)setChoices([]);});return()=>{live=false;};},[base,editable,revision]);
 const current=typeof value==='string'?name||'A company not shared with you':'No company';
 if(!editable)return <p><strong>Company:</strong> {current}</p>;
 return <FieldForm label="Company" save={text=>save('company_id',text||null,'Company')}><label htmlFor={id}>Company</label><select id={id} name="value" defaultValue={typeof value==='string'?value:''} key={`${revision}:${choices.length}`}><option value="">No company</option>{typeof value==='string'&&!choices.some(item=>item.ref.id===value)?<option value={value}>{current}</option>:null}{choices.map(item=><option key={item.ref.id} value={item.ref.id}>{String(item.fields.name??'Unnamed company')}</option>)}</select></FieldForm>;
}
