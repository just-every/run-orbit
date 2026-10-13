import {useState} from 'react';
import {DataValue,fieldLabel,valueText} from './data-value';
import {importProvenance} from './import-provenance';
type FieldValue=string|number|boolean|null;
export function CustomFields({value,onChange}:{value:Record<string,FieldValue>;onChange:(value:Record<string,FieldValue>)=>void}){
 const [newName,setNewName]=useState('');
 return <fieldset className="record-custom-fields"><legend>Custom fields</legend>
  {Object.entries(value).map(([name,current])=>{
   const provenance=importProvenance(name,current);
   return <div className="record-custom-fields__row" key={name}>
    {provenance?<fieldset><legend>{fieldLabel(name)}</legend><DataValue value={provenance}/><button type="button" onClick={()=>onChange({...value,[name]:valueText(provenance)})}>Replace {name} with text</button></fieldset>:<>
     <label>{name}{typeof current==='boolean'?<select value={String(current)} onChange={e=>onChange({...value,[name]:e.target.value==='true'})}><option value="true">Yes</option><option value="false">No</option></select>:<input type={typeof current==='number'?'number':'text'} value={current??''} onChange={e=>onChange({...value,[name]:typeof current==='number'?Number(e.target.value):e.target.value})}/>}</label>
     <label>Value type<select value={current===null?'empty':typeof current} onChange={e=>onChange({...value,[name]:e.target.value==='boolean'?false:e.target.value==='number'?0:e.target.value==='empty'?null:''})}><option value="string">Text</option><option value="number">Number</option><option value="boolean">Yes / no</option><option value="empty">Empty</option></select></label>
    </>}
    <button type="button" onClick={()=>{const next={...value};delete next[name];onChange(next);}}>Remove {name}</button>
   </div>;
  })}
  <label>New custom field name<input value={newName} onChange={e=>setNewName(e.target.value)} maxLength={100}/></label>
  <button type="button" disabled={!newName.trim()||Object.hasOwn(value,newName.trim())} onClick={()=>{onChange({...value,[newName.trim()]:''});setNewName('');}}>Add custom field</button>
 </fieldset>;
}
