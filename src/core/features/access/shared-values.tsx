import {formatCurrency,formatDateTime,formatDay,workspaceInstant,workspaceLocalInput} from '../operator/ui/formatters';
import {recordFieldValue} from '../operator/ui/record-presentation';
import type {SharedPresentation} from './shared-presentation';

export function sharedFieldVisible(field:string){
 return !['id','revision','contactability_revision'].includes(field)&&!field.endsWith('_key')&&(!field.endsWith('_id')||['company_id','stage_id','owner_id'].includes(field));
}
const customName=(field:string)=>field.startsWith('custom_fields_json.')?field.slice('custom_fields_json.'.length):'';
const fieldType=(field:string,presentation:SharedPresentation)=>presentation.custom[customName(field)]?.type;
const timestamp=(field:string,presentation:SharedPresentation)=>fieldType(field,presentation)==='datetime'||(!customName(field)&&field.endsWith('_at'));
export function sharedValue(field:string,value:unknown,presentation:SharedPresentation):unknown{
 if(value===null||value===undefined||value==='')return null;
 if(presentation.references[field])return presentation.references[field].find(choice=>choice.id===value)?.name??'Previously assigned';
 if(field==='value_cents'&&typeof value==='number')return formatCurrency(value,presentation);
 const type=fieldType(field,presentation);
 if(typeof value==='string'&&timestamp(field,presentation))return formatDateTime(value,presentation);
 if(typeof value==='string'&&type==='date')return formatDay(value,presentation.timezone);
 if(typeof value==='boolean')return value?'Yes':'No';
 return recordFieldValue(field,value);
}
export function sharedInputValue(field:string,value:unknown,presentation:SharedPresentation){
 if(value===null||value===undefined)return '';
 if(field==='value_cents'&&typeof value==='number')return String(value/100);
 if(typeof value==='string'&&timestamp(field,presentation))return workspaceLocalInput(value,presentation.timezone);
 return String(value);
}
export function readSharedInput(field:string,text:string,value:unknown,presentation:SharedPresentation):unknown{
 if(!text)return null;
 if(field==='value_cents')return Math.round(Number(text)*100);
 if(timestamp(field,presentation))return workspaceInstant(text,presentation.timezone);
 if(typeof value==='boolean'||fieldType(field,presentation)==='boolean')return text==='true';
 return typeof value==='number'||fieldType(field,presentation)==='number'?Number(text):text;
}
export function SharedInput({field,value,revision,presentation,label}:{label:string;field:string;value:unknown;revision:number;presentation:SharedPresentation}){
 const key=String(revision)+':'+field,type=fieldType(field,presentation),choices=presentation.references[field];
 if(choices)return <select aria-label={label} name="value" defaultValue={value===null?'':String(value)} key={key}><option value="" disabled={field==='stage_id'}>{field==='stage_id'?'Choose stage':'Unassigned'}</option>{choices.map(choice=><option key={choice.id} value={choice.id}>{choice.name}</option>)}{value&&!choices.some(choice=>choice.id===value)?<option value={String(value)}>Previously assigned</option>:null}</select>;
 if(typeof value==='boolean'||type==='boolean')return <select aria-label={label} name="value" defaultValue={String(value)} key={key}><option value="true">Yes</option><option value="false">No</option></select>;
 const inputType=timestamp(field,presentation)?'datetime-local':type==='date'?'date':typeof value==='number'||type==='number'?'number':'text';
 return <input aria-label={label} name="value" type={inputType} step={field==='value_cents'?'0.01':undefined} defaultValue={sharedInputValue(field,value,presentation)} key={key}/>;
}
