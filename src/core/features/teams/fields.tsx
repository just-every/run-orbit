import {useEffect,useState} from 'react';
import {salesFields} from './contracts';
const labels:Record<string,string>={amounts:'Amounts',notes:'Notes',mail:'Mail',files:'Files'};
export function FieldGrants({value,onChange,disabled=false}:{value:string[];onChange:(fields:string[])=>void;disabled?:boolean}){
 const savedPaths=value.filter(v=>v!=='*'&&!salesFields.includes(v as any)).join(', '),[named,setNamed]=useState(savedPaths);
 useEffect(()=>setNamed(savedPaths),[savedPaths]);
 const change=(field:string,on:boolean)=>onChange(on?[...value.filter(v=>v!==field),field]:value.filter(v=>v!==field));
 return <fieldset disabled={disabled} className="sales-teams__choices"><legend>Sensitive fields</legend>
  <label><input type="checkbox" checked={value.includes('*')} onChange={e=>change('*',e.target.checked)}/>All fields</label>
  {salesFields.map(field=><label key={field}><input type="checkbox" checked={value.includes(field)||value.includes('*')} disabled={value.includes('*')} onChange={e=>change(field,e.target.checked)}/>{labels[field]}</label>)}
  <label className="sales-teams__wide">Additional field paths<input value={named} placeholder="Separate paths with commas" onChange={e=>setNamed(e.target.value)} onBlur={()=>{const fields=named.split(',').map(f=>f.trim()).filter(Boolean),next=[...value.filter(v=>v==='*'||salesFields.includes(v as any)),...fields];if(JSON.stringify(next)!==JSON.stringify(value))onChange(next);}}/></label>
 </fieldset>;
}
