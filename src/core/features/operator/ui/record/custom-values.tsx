import {useEffect,useState} from 'react';
import {AutosaveField,textProps,choiceProps} from '../autosave/field';
import type {AutosaveForm,Parse} from '../autosave/use-autosave';
import {DataValue,fieldLabel} from '../data-value';
import {importProvenance} from '../import-provenance';
import {recordsRequest,type RecordKind} from '../records-api';
import {formatDateTime,workspaceInstant,workspaceLocalInput} from '../formatters';

export interface FieldDefinition{field_key:string;label:string;value_type:string;options_json?:string;required?:number;archived?:number}

/** The kind's typed field definitions (Settings › Pipeline › Fields). */
export function useFieldDefinitions(kind:RecordKind){
 const [definitions,setDefinitions]=useState<FieldDefinition[]>([]);
 useEffect(()=>{let live=true;void recordsRequest<{fields:FieldDefinition[]}>(`settings/custom-fields?kind=${kind}`).then(result=>{if(live)setDefinitions(result.fields);}).catch(()=>{});return()=>{live=false;};},[kind]);
 return definitions;
}

const number:Parse=text=>!text.trim()?{value:null}:Number.isFinite(Number(text))?{value:Number(text)}:{error:'Enter a number such as 12 or 4.5.'};
const instant:Parse=text=>{if(!text)return {value:null};try{return {value:workspaceInstant(text)};}catch{return {error:'Enter a date and time.'};}};

/** One typed field as a quiet value: choices save on change, text when left. */
function TypedValue({form,field,definition,operators}:{form:AutosaveForm;field:string;definition:FieldDefinition;operators:any[]}){
 const type=definition.value_type,people=operators.filter(person=>person.status==='active'&&!person.collaborator);
 if(type==='boolean')return <select aria-label={definition.label} {...choiceProps(form,field,value=>value===''?null:value==='true')}><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select>;
 if(type==='user'){const current=String(form.value(field)??'');return <select aria-label={definition.label} {...choiceProps(form,field,value=>value||null)}><option value="">Unassigned</option>{people.map(person=><option key={person.id} value={person.id}>{person.display_name}</option>)}{current&&!people.some(person=>person.id===current)?<option value={current}>Previously assigned operator</option>:null}</select>;}
 if(type==='picklist')return <select aria-label={definition.label} {...choiceProps(form,field)}><option value="">Not set</option>{(JSON.parse(definition.options_json??'[]') as string[]).map(option=><option key={option} value={option}>{option}</option>)}</select>;
 if(type==='datetime')return <input aria-label={definition.label} type="datetime-local" {...textProps(form,field,{show:value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?workspaceLocalInput(value):'',parse:instant})}/>;
 if(type==='number')return <input aria-label={definition.label} inputMode="decimal" placeholder="Add a number" {...textProps(form,field,{parse:number})}/>;
 return <input aria-label={definition.label} type={type==='date'?'date':'text'} placeholder={type==='date'?undefined:`Add ${definition.label.toLowerCase()}`} maxLength={500} {...textProps(form,field)}/>;
}

/** A record's custom values: each typed field by its label, then the fields this record holds of its own, then Add a
 * field (an untyped field on this record, by name). Values arrive as custom:<key> in the record form. */
export function CustomValues({form,definitions,operators}:{form:AutosaveForm;definitions:FieldDefinition[];operators:any[]}){
 const copy=form.copy??{},keys=Object.keys(copy).filter(key=>key.startsWith('custom:')).map(key=>key.slice(7));
 const typed=definitions.filter(definition=>!definition.archived||keys.includes(definition.field_key)),known=new Set(definitions.map(definition=>definition.field_key));
 const [adding,setAdding]=useState(false),[name,setName]=useState('');
 function add(){const key=name.trim();if(!key||Object.hasOwn(copy,`custom:${key}`))return;form.commit(`custom:${key}`,'');setName('');setAdding(false);}
 return <>
  {typed.map(definition=>{const field=`custom:${definition.field_key}`;return definition.archived?<div className="r-quiet" key={field}><label><span className="r-label">{definition.label} · archived</span><span><DataValue value={copy[field]} emptyLabel="Not set"/></span></label></div>:<AutosaveField key={field} form={form} field={field} label={definition.label} quiet describe={value=>definition.value_type==='datetime'&&typeof value==='string'?formatDateTime(value):String(value??'')}><TypedValue form={form} field={field} definition={definition} operators={operators}/></AutosaveField>;})}
  {keys.filter(key=>!known.has(key)).map(key=>{const field=`custom:${key}`,current=copy[field],provenance=importProvenance(key,current);
   if(provenance)return <div className="r-quiet" key={field}><label><span className="r-label">{fieldLabel(key)}</span><span><DataValue value={provenance} emptyLabel="Not set"/></span></label></div>;
   return <AutosaveField key={field} form={form} field={field} label={fieldLabel(key)} quiet>{typeof current==='boolean'?<select {...choiceProps(form,field,value=>value==='true')}><option value="true">Yes</option><option value="false">No</option></select>:<input maxLength={500} placeholder="Add a value" {...textProps(form,field,typeof current==='number'?{parse:number}:{})}/>}</AutosaveField>;})}
  {adding?<div className="r-add-field"><input aria-label="Field name" placeholder="Field name" autoFocus maxLength={100} value={name} onChange={event=>setName(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();add();}if(event.key==='Escape')setAdding(false);}}/><button type="button" className="operator-text-button" disabled={!name.trim()} onClick={add}>Add</button><button type="button" className="operator-text-button" onClick={()=>setAdding(false)}>Cancel</button></div>:<button type="button" className="operator-text-button r-add-field" onClick={()=>setAdding(true)}>Add a field</button>}
 </>;
}
