import {useCallback,useMemo,useState} from 'react';
import {AutosaveField,choiceProps,labelId,textProps} from '../autosave/field';
import {InlineConfirm} from '../autosave/inline-confirm';
import {SaveRefused,useAutosave,type AutosaveForm,type Parse,type Values} from '../autosave/use-autosave';
import {dateInputPlaceholder,formatDateInput,parseDateInput,formatCurrency,formatDay,workspaceInstant,workspaceLocalInput} from '../formatters';
import {CompanyField} from './company-field';
import {readRecord,saveRequest} from './record-api';
import {CustomValues,type FieldDefinition} from './custom-values';
import {DetailsGroup} from './details-panel';

const money=(workspace:any):Parse=>text=>{const amount=Number(text.replace(/[^0-9.]/g,''));return !text.trim()?{value:0}:Number.isFinite(amount)&&amount>=0&&amount<=1_000_000_000?{value:Math.round(amount*100)}:{error:'Enter an amount such as 18000.'};};
/** A deal's expected close is a date on the workspace clock. */
const day=(value:unknown)=>typeof value==='string'&&value?formatDateInput(workspaceLocalInput(value).slice(0,10)):'';
const dayParse:Parse=text=>{try{return {value:text.trim()?workspaceInstant(`${parseDateInput(text)}T00:00`):null};}catch(error){return {error:(error as Error).message};}};

/** Details › Deal: Stage, Value, Owner, Expected close and Company, then the deal's own fields. */
export function DealValues({id,record,settings,scheduled,definitions,context,onChanged}:{id:string;record:AutosaveForm;settings:any;scheduled:number;definitions:FieldDefinition[];context:AutosaveForm;onChanged:()=>void}){
 const workspace=settings.workspace,owners=(settings.operators??[]).filter((operator:any)=>operator.status==='active'&&!operator.collaborator);
 return <DetailsGroup label="Deal">
  <StageField id={id} record={record} settings={settings} scheduled={scheduled} onChanged={onChanged}/>
  <AutosaveField form={record} field="value_cents" label="Value" quiet describe={value=>formatCurrency(Number(value??0),workspace)}><input inputMode="decimal" {...textProps(record,'value_cents',{show:value=>formatCurrency(Number(value??0),workspace),editText:value=>String(Number(value??0)/100),parse:money(workspace)})}/></AutosaveField>
  <AutosaveField form={record} field="owner_id" label="Owner" quiet describe={value=>owners.find((operator:any)=>operator.id===value)?.display_name??'Unassigned'}><select {...choiceProps(record,'owner_id',value=>value||null)}><option value="">Unassigned</option>{owners.map((operator:any)=><option key={operator.id} value={operator.id}>{operator.display_name}</option>)}</select></AutosaveField>
  <AutosaveField form={record} field="expected_close_at" label="Expected close" quiet describe={value=>typeof value==='string'&&value?formatDay(value):'nothing'}><input type="text" placeholder={dateInputPlaceholder()} {...textProps(record,'expected_close_at',{show:day,parse:dayParse})}/></AutosaveField>
  <CompanyField form={context} field="company" name={String(context.copy?.companyName??'')}/>
  <CustomValues form={record} definitions={definitions} operators={settings.operators??[]}/>
 </DetailsGroup>;
}

/** Stage: the deal's pipeline's stages; a choice moves the deal at once, asking first only when the move cancels
 * scheduled follow-ups; a stage whose required fields the deal lacks refuses the move in words under the field. */
function StageField({id,record,settings,scheduled,onChanged}:{id:string;record:AutosaveForm;settings:any;scheduled:number;onChanged:()=>void}){
 const stageId=String(record.copy?.stage_id??'');
 const name=(id:string)=>settings.stages.find((stage:any)=>stage.id===id)?.name??'that stage';
 const copy=useMemo(()=>record.copy?{stage_id:record.copy.stage_id,updated_at:record.copy.updated_at}:null,[record.copy?.stage_id,record.copy?.updated_at]);
 const reread=useCallback(async()=>{const fresh=await readRecord<{record:Values}>('opportunity',id);return {stage_id:fresh.record.stage_id,updated_at:fresh.record.updated_at};},[id]);
 const send=useCallback(async(changes:Values,base:Values,_copy:Values,init:{keepalive?:boolean})=>{
  try{await saveRequest(`records/opportunity/${id}/move`,'POST',{stageId:changes.stage_id,reviewedStageId:base.stage_id},init);}
  catch(error){if(error instanceof SaveRefused&&error.status===409&&!/moved since/.test(error.message))throw new SaveRefused(`${error.message} Add ${/ and /.test(error.message)?'them':'it'} above, then choose ${name(String(changes.stage_id))} again.`,422,undefined,null,true);throw error;}
  return {copy:await reread(),changed:true};
 },[id,settings,reread]);
 const form=useAutosave<Values>({key:`stage.${id}`,copy,version:value=>value.updated_at,send,reread,onSaved:onChanged});
 const [asking,setAsking]=useState<string|null>(null),[pipeline,setPipeline]=useState(''),[destination,setDestination]=useState('');
 const current=settings.stages.find((stage:any)=>stage.id===String(form.value('stage_id')??stageId)),stages=settings.stages.filter((stage:any)=>stage.pipeline_id===current?.pipeline_id);
 const shown=asking??String(form.value('stage_id')??'');
 return <>
  {settings.pipelines?.length>1&&<div className="r-quiet">
   <label><span className="r-label">Pipeline</span><select aria-label="Pipeline" value={pipeline||current?.pipeline_id||''} onChange={event=>{setPipeline(event.target.value===current?.pipeline_id?'':event.target.value);setDestination('');setAsking(null);}}>{settings.pipelines.map((item:any)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   {pipeline&&<div className="r-confirm" role="group" aria-label="Move between pipelines">
    <p>Choose the destination stage in {settings.pipelines.find((item:any)=>item.id===pipeline)?.name}. {scheduled>0?`This cancels ${scheduled} scheduled follow-up${scheduled===1?'':'s'}.`:''}</p>
    <label>Destination stage<select aria-label="Destination stage" value={destination} onChange={event=>setDestination(event.target.value)}><option value="">Choose a stage</option>{settings.stages.filter((stage:any)=>stage.pipeline_id===pipeline).map((stage:any)=><option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
    <div><button type="button" className="operator-button" disabled={!destination} onClick={()=>{form.commit('stage_id',destination);setPipeline('');setDestination('');}}>Move deal</button><button type="button" className="operator-text-button" onClick={()=>{setPipeline('');setDestination('');}}>Cancel move</button></div>
   </div>}
  </div>}
  <AutosaveField form={form} field="stage_id" label="Stage" quiet describe={value=>name(String(value))}
  after={asking?<InlineConfirm sentence={`Move to ${name(asking)}? Its ${scheduled} scheduled follow-up${scheduled===1?' is':'s are'} cancelled.`} action="Move" keep={`Keep ${name(stageId)}`} onConfirm={()=>{form.commit('stage_id',asking);setAsking(null);}} onKeep={()=>setAsking(null)}/>:null}>
  <select aria-labelledby={labelId(form,'stage_id')} value={shown} onChange={event=>{const next=event.target.value;if(scheduled>0)setAsking(next);else form.commit('stage_id',next);}}>{stages.map((stage:any)=><option key={stage.id} value={stage.id}>{stage.name}</option>)}</select>
 </AutosaveField></>;
}
