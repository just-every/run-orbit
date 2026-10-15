import {useState} from 'react';
import {DataValue,fieldLabel,valueText} from './data-value';
import {importProvenance} from './import-provenance';
import {convertFieldValue,type FieldValue,type FieldType} from './custom-field-types';
export function CustomFields({value,onChange}:{value:Record<string,FieldValue>;onChange:(value:Record<string,FieldValue>)=>void}){
 const [newName,setNewName]=useState('');
 const [replacement,setReplacement]=useState<{name:string;value:FieldValue;previous:FieldValue}|null>(null);
 function change(name:string,next:FieldValue){setReplacement(null);onChange({...value,[name]:next});}
 function changeType(name:string,current:FieldValue,type:FieldType){
  const converted=convertFieldValue(current,type);
  if(converted.replaces)setReplacement({name,value:converted.value,previous:current});
  else change(name,converted.value);
 }
 return <fieldset className="record-custom-fields"><legend>Custom fields</legend>
  {Object.entries(value).map(([name,current])=>{
   const provenance=importProvenance(name,current);
   return <div className="record-custom-fields__row" key={name}>
    {provenance?<fieldset><legend>{fieldLabel(name)}</legend><DataValue value={provenance}/><button type="button" onClick={()=>change(name,valueText(provenance))}>Replace {fieldLabel(name)} with text</button></fieldset>:<>
     <label>{fieldLabel(name)}{typeof current==='boolean'?<select value={String(current)} onChange={e=>change(name,e.target.value==='true')}><option value="true">Yes</option><option value="false">No</option></select>:<input type={typeof current==='number'?'number':'text'} value={current??''} onChange={e=>change(name,typeof current==='number'?Number(e.target.value):e.target.value)}/>}</label>
     <label>Value type<select value={current===null?'empty':typeof current} onChange={e=>changeType(name,current,e.target.value as FieldType)}><option value="string">Text</option><option value="number">Number</option><option value="boolean">Yes / no</option><option value="empty">Empty</option></select></label>
    </>}
    {replacement?.name===name&&<div role="alert"><p>This type cannot preserve {fieldLabel(name)}. Replace “{valueText(replacement.previous)}” with “{valueText(replacement.value)}”? The current value is kept until you confirm.</p><button type="button" onClick={()=>change(name,replacement.value)}>Replace value</button><button type="button" onClick={()=>setReplacement(null)}>Keep current value</button></div>}
    <button type="button" onClick={()=>{setReplacement(null);const next={...value};delete next[name];onChange(next);}}>Remove {fieldLabel(name)}</button>
   </div>;
  })}
  <label>New custom field name<input value={newName} onChange={e=>setNewName(e.target.value)} maxLength={100}/></label>
  <button type="button" disabled={!newName.trim()||Object.hasOwn(value,newName.trim())} onClick={()=>{onChange({...value,[newName.trim()]:''});setNewName('');}}>Add custom field</button>
 </fieldset>;
}
