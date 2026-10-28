import {useState} from 'react';
import type {ManagedProjection,ManagedType,ManagedValues,DefinitionsResponse} from './contracts';
import {recordsRequest} from '../operator/ui/records-api';
import {OperatorState} from '../operator/ui/operator-shell';

export function ManagedRecordForm({type,record,access,owners,onSaved,onCancel}:{type:ManagedType;record?:ManagedProjection;access:DefinitionsResponse;owners:{id:string;name:string}[];onSaved:()=>Promise<void>;onCancel:()=>void}){
 const [values,setValues]=useState<ManagedValues>(record?.fields??{}),[owner,setOwner]=useState<string>(String(record?.fields.owner_id??(owners.some(o=>o.id===access.operatorId)?access.operatorId:owners[0]?.id??''))),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const permitted=record?.editableFields??access.writableFields[type.name]??[],ownerEditable=!record||permitted.includes('owner_id');
 const change=(key:string,value:ManagedValues[string])=>setValues(previous=>({...previous,[key]:value}));
 async function save(event:React.FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   const fields=Object.fromEntries(Object.keys(type.fields).filter(key=>permitted.includes(key)&&Object.hasOwn(values,key)&&(!record||values[key]!==record.fields[key])).map(key=>[key,values[key]]));
   const body=record?{fields,revision:record.ref.revision,...(ownerEditable&&owner!==(record.fields.owner_id??'')?{owner_id:owner||null}:{})}:{fields,owner_id:owner||null};
   await recordsRequest('managed-records/'+type.name+(record?'/'+record.ref.id:''),record?'PUT':'POST',body);await onSaved();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <form className="workbench-form managed-records__form" onSubmit={save}><h3>{record?'Edit record':'New '+(type.name==='lead'?'lead':type.label.toLowerCase()+' record')}</h3><fieldset disabled={busy}>
  {Object.entries(type.fields).filter(([key])=>permitted.includes(key)).map(([key,definition])=><label key={key}>{definition.label}{definition.sensitivity==='private'?' · Private':''}{definition.type==='boolean'?<select aria-label={definition.label} value={values[key]===undefined||values[key]===null?'':String(values[key])} required={definition.required} onChange={e=>change(key,e.target.value===''?null:e.target.value==='true')}><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select>:<input aria-label={definition.label} required={definition.required} maxLength={definition.type==='text'?20000:undefined} type={definition.type==='number'?'number':definition.type==='date'?'date':'text'} step={definition.type==='number'?'any':undefined} value={values[key]===null||values[key]===undefined?'':String(values[key])} onChange={e=>change(key,e.target.value===''?(definition.type==='text'?'':null):definition.type==='number'?Number(e.target.value):e.target.value)}/>}</label>)}
  {ownerEditable&&<label>Owner<select aria-label="Owner" required={!access.allowUnassigned} value={owner} onChange={e=>setOwner(e.target.value)}><option value="" disabled={!access.allowUnassigned}>{access.allowUnassigned?'Unassigned':'Choose an owner'}</option>{record?.fields.owner_id&&!owners.some(o=>o.id===record.fields.owner_id)&&<option value={String(record.fields.owner_id)}>Current owner</option>}{owners.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
  <div className="managed-records__actions"><button type="button" onClick={onCancel}>Cancel</button><button className="operator-button" disabled={busy}>{busy?'Saving…':'Save record'}</button></div>
 </fieldset>{error&&<OperatorState kind="error">{error}</OperatorState>}</form>;
}
