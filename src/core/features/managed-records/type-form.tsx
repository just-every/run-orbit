import {useState} from 'react';
import {recordsRequest} from '../operator/ui/records-api';
import {OperatorState} from '../operator/ui/operator-shell';
import type {FieldDefinition,ManagedType} from './contracts';

type DraftField=FieldDefinition&{key:string};
export function ManagedTypeForm({type,onSaved}:{type?:ManagedType;onSaved:(name:string)=>Promise<void>}){
 const [name,setName]=useState(type?.name??''),[label,setLabel]=useState(type?.label??''),[fields,setFields]=useState<DraftField[]>(type?Object.entries(type.fields).map(([key,definition])=>({key,...definition})):[{key:'name',label:'Record name',type:'text',required:true,sensitivity:'public'}]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 function change(index:number,patch:Partial<DraftField>){setFields(previous=>previous.map((field,i)=>i===index?{...field,...patch}:field));}
 async function save(event:React.FormEvent){
  event.preventDefault();if(busy)return;setError('');
  if(new Set(fields.map(f=>f.key)).size!==fields.length){setError('Each field needs a unique key.');return;}
  setBusy(true);try{const definitions=Object.fromEntries(fields.map(({key,...definition})=>[key,definition]));await recordsRequest('managed-records/definitions'+(type?'/'+type.name:''),type?'PUT':'POST',{...(type?{version:type.version}:{name}),label,fields:definitions});await onSaved(name);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <form className="workbench-form managed-record-settings__editor" onSubmit={save}><h3>{type?'Configure '+type.label:'New object type'}</h3><fieldset disabled={busy}>
  <label>Object type key<input aria-label="Object type key" required pattern="[a-z][a-z0-9_]{1,63}" maxLength={64} value={name} disabled={!!type} onChange={e=>setName(e.target.value)}/></label><label>Object label<input aria-label="Object label" required maxLength={120} value={label} onChange={e=>setLabel(e.target.value)}/></label>
  <p>Every type has a required record name. Private fields require an explicit field grant for restricted roles. Populated fields keep their type and privacy.</p>
  <div className="managed-record-settings__fields">{fields.map((field,index)=><div className="managed-record-settings__field" key={index}>
   <label>Field key {index+1}<input aria-label={'Field key '+(index+1)} required pattern="[a-z][a-z0-9_]{0,63}" maxLength={64} value={field.key} disabled={field.key==='name'} onChange={e=>change(index,{key:e.target.value})}/></label>
   <label>Field label {index+1}<input aria-label={'Field label '+(index+1)} required maxLength={120} value={field.label} onChange={e=>change(index,{label:e.target.value})}/></label>
   <label>Field type {index+1}<select aria-label={'Field type '+(index+1)} value={field.type} disabled={field.key==='name'} onChange={e=>change(index,{type:e.target.value as FieldDefinition['type']})}><option value="text">Text</option><option value="number">Number</option><option value="boolean">Yes / No</option><option value="date">Date</option></select></label>
   <label>Field privacy {index+1}<select aria-label={'Field privacy '+(index+1)} value={field.sensitivity} onChange={e=>change(index,{sensitivity:e.target.value as FieldDefinition['sensitivity']})}><option value="public">Standard role access</option><option value="private">Private · explicit grant</option></select></label>
   <label><input type="checkbox" checked={field.required} disabled={field.key==='name'} onChange={e=>change(index,{required:e.target.checked})}/>Required field {index+1}</label>
   {field.key!=='name'&&<button type="button" onClick={()=>setFields(previous=>previous.filter((_,i)=>i!==index))}>Remove field {index+1}</button>}
  </div>)}</div>
  <div className="managed-records__actions"><button type="button" disabled={fields.length>=50} onClick={()=>setFields(previous=>[...previous,{key:'',label:'',type:'text',required:false,sensitivity:'public'}])}>Add field</button><button className="operator-button">{busy?'Saving…':type?'Save object type':'Create object type'}</button></div>
 </fieldset>{error&&<OperatorState kind="error">{error}</OperatorState>}</form>;
}
