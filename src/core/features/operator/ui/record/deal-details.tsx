import {useCallback,useMemo,useState} from 'react';
import {AutosaveField,choiceProps,textProps} from '../autosave/field';
import {InlineConfirm} from '../autosave/inline-confirm';
import {SaveRefused,useAutosave,type AutosaveForm,type Parse,type Values} from '../autosave/use-autosave';
import {formatCurrency,formatDay,workspaceInstant,workspaceLocalInput} from '../formatters';
import {useRecordMatches} from '../record-link-picker';
import {readRecord,saveRequest} from './record-api';
import {CustomValues,type FieldDefinition} from './custom-values';
import {DetailsGroup} from './details-panel';

const money=(workspace:any):Parse=>text=>{const amount=Number(text.replace(/[^0-9.]/g,''));return !text.trim()?{value:0}:Number.isFinite(amount)&&amount>=0&&amount<=1_000_000_000?{value:Math.round(amount*100)}:{error:'Enter an amount such as 18000.'};};
/** A deal's expected close is a date on the workspace clock. */
const day=(value:unknown)=>typeof value==='string'&&value?workspaceLocalInput(value).slice(0,10):'';
const dayParse:Parse=text=>!text?{value:null}:/^\d{4}-\d{2}-\d{2}$/.test(text)?{value:workspaceInstant(`${text}T00:00`)}:{error:'Choose a date.'};

/** Details › Deal: Stage, Value, Owner, Expected close and Company, then the deal's own fields. */
export function DealValues({id,record,settings,scheduled,definitions,context}:{id:string;record:AutosaveForm;settings:any;scheduled:number;definitions:FieldDefinition[];context:AutosaveForm}){
 const workspace=settings.workspace,owners=(settings.operators??[]).filter((operator:any)=>operator.status==='active'&&!operator.collaborator);
 return <DetailsGroup label="Deal">
  <StageField id={id} record={record} settings={settings} scheduled={scheduled}/>
  <AutosaveField form={record} field="value_cents" label="Value" quiet describe={value=>formatCurrency(Number(value??0),workspace)}><input inputMode="decimal" {...textProps(record,'value_cents',{show:value=>formatCurrency(Number(value??0),workspace),editText:value=>String(Number(value??0)/100),parse:money(workspace)})}/></AutosaveField>
  <AutosaveField form={record} field="owner_id" label="Owner" quiet describe={value=>owners.find((operator:any)=>operator.id===value)?.display_name??'Unassigned'}><select {...choiceProps(record,'owner_id',value=>value||null)}><option value="">Unassigned</option>{owners.map((operator:any)=><option key={operator.id} value={operator.id}>{operator.display_name}</option>)}</select></AutosaveField>
  <AutosaveField form={record} field="expected_close_at" label="Expected close" quiet describe={value=>typeof value==='string'&&value?formatDay(value):'nothing'}><input type="date" {...textProps(record,'expected_close_at',{show:day,parse:dayParse})}/></AutosaveField>
  <CompanyField form={context}/>
  <CustomValues form={record} definitions={definitions} operators={settings.operators??[]}/>
 </DetailsGroup>;
}

/** Stage: the deal's pipeline's stages; a choice moves the deal at once, asking first only when the move cancels
 * scheduled follow-ups; a stage whose required fields the deal lacks refuses the move in words under the field. */
function StageField({id,record,settings,scheduled}:{id:string;record:AutosaveForm;settings:any;scheduled:number}){
 const stageId=String(record.copy?.stage_id??''),current=settings.stages.find((stage:any)=>stage.id===stageId);
 const stages=settings.stages.filter((stage:any)=>stage.pipeline_id===current?.pipeline_id),name=(id:string)=>settings.stages.find((stage:any)=>stage.id===id)?.name??'that stage';
 const copy=useMemo(()=>record.copy?{stage_id:record.copy.stage_id,updated_at:record.copy.updated_at}:null,[record.copy?.stage_id,record.copy?.updated_at]);
 const reread=useCallback(async()=>{const fresh=await readRecord<{record:Values}>('opportunity',id);return {stage_id:fresh.record.stage_id,updated_at:fresh.record.updated_at};},[id]);
 const send=useCallback(async(changes:Values,base:Values,_copy:Values,init:{keepalive?:boolean})=>{
  try{await saveRequest(`records/opportunity/${id}/move`,'POST',{stageId:changes.stage_id,reviewedStageId:base.stage_id},init);}
  catch(error){if(error instanceof SaveRefused&&error.status===409&&!/moved since/.test(error.message))throw new SaveRefused(`${error.message} Add ${/ and /.test(error.message)?'them':'it'} above, then choose ${name(String(changes.stage_id))} again.`,422,undefined,null,true);throw error;}
  return {copy:await reread(),changed:true};
 },[id,settings,reread]);
 const form=useAutosave<Values>({key:`stage.${id}`,copy,version:value=>value.updated_at,send,reread});
 const [asking,setAsking]=useState<string|null>(null);
 const shown=asking??String(form.value('stage_id')??'');
 return <AutosaveField form={form} field="stage_id" label="Stage" quiet describe={value=>name(String(value))}
  after={asking?<InlineConfirm sentence={`Move to ${name(asking)}? Its ${scheduled} scheduled follow-up${scheduled===1?' is':'s are'} cancelled.`} action="Move" keep={`Keep ${name(stageId)}`} onConfirm={()=>{form.commit('stage_id',asking);setAsking(null);}} onKeep={()=>setAsking(null)}/>:null}>
  <select value={shown} onChange={event=>{const next=event.target.value;if(scheduled>0)setAsking(next);else form.commit('stage_id',next);}}>{stages.map((stage:any)=><option key={stage.id} value={stage.id}>{stage.name}</option>)}</select>
 </AutosaveField>;
}

/** Company: a search that offers companies as you type and saves on choice, through the deal's relationships. */
function CompanyField({form}:{form:AutosaveForm}){
 const name=String(form.copy?.companyName??''),[query,setQuery]=useState<string|null>(null),[chosen,setChosen]=useState<string|null>(null),{matches}=useRecordMatches('company',query??'');
 function choose(id:string|null,label:string){setChosen(label);setQuery(null);form.commit('company',id);}
 const shown=query??(form.status('company').state==='saving'&&chosen!==null?chosen:name);
 return <AutosaveField form={form} field="company" label="Company" quiet describe={()=>name||'no company'}
  after={query?.trim()&&matches.length?<ul className="record-link-picker__results" aria-label="Company: matches">{matches.slice(0,8).map(company=><li key={company.id}><button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>choose(company.id,company.name??'')}><strong>{company.name}</strong>{company.primary_domain?<span>{company.primary_domain}</span>:null}</button></li>)}</ul>:null}>
  <input type="search" autoComplete="off" placeholder="Add a company" value={shown} onChange={event=>setQuery(event.target.value)} onBlur={()=>{if(query!==null&&!query.trim()&&name)choose(null,'');else setTimeout(()=>setQuery(null),200);}} onKeyDown={event=>{if(event.key==='Escape')setQuery(null);}}/>
 </AutosaveField>;
}
