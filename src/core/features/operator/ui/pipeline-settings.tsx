import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from '@tanstack/react-router';
import {ActionTooltip} from './action-tooltip';
import {AutosaveField,textProps} from './autosave/field';
import {InlineConfirm} from './autosave/inline-confirm';
import {useAutosave,type AutosaveForm,type Parse,type Values} from './autosave/use-autosave';
import {MenuButton} from './record/menu-button';
import {saveRequest} from './record/record-api';
import {recordsRequest,type CustomerRecord} from './records-api';

// The deal fields a stage can require, by name; each is saved as its stored key.
const dealFields:[string,string][]=[['title','Title'],['value_cents','Value'],['owner_id','Owner'],['company_id','Company'],['expected_close_at','Expected close date'],['contact_ids','Contacts'],['primary_contact_id','Primary contact']];
const percent:Parse=text=>{const value=Number(text.replace('%','').trim());return text.trim()!==''&&Number.isFinite(value)&&value>=0&&value<=100?{value}:{error:'Enter a win chance from 0 to 100.'};};
const staleDays:Parse=text=>{const value=text.replace(/days?/,'').trim();if(!value)return {value:null};const days=Number(value);return Number.isInteger(days)&&days>=1&&days<=365?{value:days}:{error:'Enter 1 to 365 days, or leave it empty for the workspace’s.'};};
const named:Parse=text=>text.trim()?{value:text.trim()}:{error:'A stage needs a name.'};

/** A pipeline as the fields its card saves: its name, its stages' order, and each stage's values under its id. */
function pipelineValues(settings:any,id:string):Values|null{
 const pipeline=settings.pipelines.find((item:any)=>item.id===id);if(!pipeline)return null;
 const stages=settings.stages.filter((stage:any)=>stage.pipeline_id===id),values:Values={name:pipeline.name,revision:pipeline.revision,order:stages.map((stage:any)=>stage.id)};
 for(const stage of stages)Object.assign(values,{[`${stage.id}.name`]:stage.name,[`${stage.id}.probability`]:stage.probability,[`${stage.id}.stale`]:stage.stale_interval_days,[`${stage.id}.required`]:stage.required_fields});
 return values;
}
/** The pipeline as its save takes it: every stage in order (a new one without an id). */
function pipelineInput(values:Values){
 return {name:values.name,revision:values.revision,stages:(values.order as string[]).map(key=>({...(key.startsWith('new-')?{}:{id:key}),name:values[`${key}.name`],probability:Number(values[`${key}.probability`]??0),requiredFields:values[`${key}.required`]??[],staleIntervalDays:values[`${key}.stale`]??null}))};
}

/** Settings › Pipeline: a card per pipeline, the default first, each a table of stages that saves every change with the
 * pipeline's revision (a change made meanwhile is read again and the one change applied to it). */
export function PipelineSettings({settings,onChanged}:{settings:any;onChanged:()=>Promise<void>}){
 const [custom,setCustom]=useState<[string,string][]>([]),[creating,setCreating]=useState(false);
 useEffect(()=>{let active=true;void recordsRequest<{fields:{field_key:string;label:string;archived:number}[]}>('settings/custom-fields?kind=opportunity').then(result=>{if(active)setCustom(result.fields.filter(field=>!field.archived).map(field=>[`custom:${field.field_key}`,field.label]));}).catch(()=>{});return()=>{active=false;};},[]);
 return <>
  {settings.pipelines.map((pipeline:any,index:number)=><PipelineCard key={pipeline.id} id={pipeline.id} settings={settings} custom={custom} onChanged={onChanged} onNew={index===0&&!creating?()=>setCreating(true):undefined}/>)}
  {creating?<NewPipeline onCreated={async()=>{setCreating(false);await onChanged();}} onCancel={()=>setCreating(false)}/>:null}
 </>;
}

function PipelineCard({id,settings,custom,onChanged,onNew}:{id:string;settings:any;custom:[string,string][];onChanged:()=>Promise<void>;onNew?:()=>void}){
 const copy=useMemo(()=>pipelineValues(settings,id),[settings,id]);
 const send=useCallback(async(changes:Values,_base:Values,current:Values,init:{keepalive?:boolean})=>{
  await saveRequest(`settings/pipelines/${id}`,'PUT',pipelineInput({...current,...changes}),init);
  return {copy:pipelineValues(await recordsRequest<any>('settings'),id)!,changed:true};
 },[id]);
 const form=useAutosave<Values>({key:`pipeline.${id}`,copy,version:value=>String(value.revision).padStart(9,'0'),send,reread:async()=>pipelineValues(await recordsRequest<any>('settings'),id)!,onSaved:()=>void onChanged()});
 const [adding,setAdding]=useState<string[]>([]),[dragging,setDragging]=useState<string|null>(null),[deleting,setDeleting]=useState(false),[error,setError]=useState('');
 const pipeline=settings.pipelines.find((item:any)=>item.id===id),order=(form.value('order')??[]) as string[];
 const workspaceDays=settings.workspace?.stale_interval_days;
 function move(key:string,to:number){const next=order.filter(item=>item!==key);next.splice(Math.max(0,Math.min(to,next.length)),0,key);form.commit('order',next);}
 function nameNewStage(key:string,name:string){setAdding(current=>current.filter(item=>item!==key));if(!name.trim())return;form.commit('order',[...order,key],false);form.commit(`${key}.name`,name.trim());}
 async function remove(){setError('');try{await saveRequest(`settings/pipelines/${id}`,'DELETE',{confirmed:true});await onChanged();}catch(e){setError(`Not deleted: ${(e as Error).message}`);}}
 const choices=(required:string[]):[string,string][]=>[...dealFields,...custom,...required.filter(field=>![...dealFields,...custom].some(([key])=>key===field)).map(field=>[field,field.startsWith('custom:')?field.slice(7):field] as [string,string])];
 return <section className="operator-surface settings-card" aria-labelledby={`pipeline-${id}`}>
  <div className="settings-card__head"><h2 id={`pipeline-${id}`}>{String(form.copy?.name??pipeline?.name??'Pipeline')}</h2>{onNew?<button type="button" className="orbit-button orbit-button--secondary" onClick={onNew}>New pipeline</button>:null}</div>
  <AutosaveField form={form} field="name" label="Name"><input maxLength={100} {...textProps(form,'name',{parse:text=>text.trim()?{value:text.trim()}:{error:'A pipeline needs a name.'}})}/></AutosaveField>
  <ul className="s-stages" aria-label={`Stages of ${String(form.copy?.name??'this pipeline')}`}>
   <li className="s-stage s-stage--head" aria-hidden="true"><span/><span>Stage</span><span>Win chance</span><span>Stale after</span><span>Required to enter</span></li>
   {order.map((key,index)=><StageRow key={key} form={form} stageKey={key} index={index} count={order.length} workspaceDays={workspaceDays} choices={choices} settings={settings} pipelineId={id}
    dragging={dragging===key} onDrag={setDragging} onDrop={()=>{if(dragging&&dragging!==key)move(dragging,index);setDragging(null);}} onMove={to=>move(key,to)} onRemoved={next=>form.commit('order',next)} order={order}/>)}
   {adding.map(key=><li className="s-stage" key={key}><span/><div className="s-stage-cell s-stage-name r-quiet"><label><span className="sr-only">Stage name</span><input autoFocus maxLength={100} placeholder="Name the stage" onBlur={event=>nameNewStage(key,event.currentTarget.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}if(event.key==='Escape')setAdding(current=>current.filter(item=>item!==key));}}/></label></div></li>)}
  </ul>
  <button type="button" className="operator-text-button s-add" onClick={()=>setAdding(current=>[...current,`new-${Date.now()}`])}>+ Add a stage</button>
  {!pipeline?.is_default?<div className="s-foot">{deleting?<InlineConfirm sentence={`Delete ${String(form.copy?.name??'this pipeline')}? Only a pipeline that holds no deals can go.`} action="Delete" keep="Keep it" onConfirm={()=>void remove()} onKeep={()=>{setDeleting(false);setError('');}} error={error}/>:<button type="button" className="operator-text-button r-danger" onClick={()=>setDeleting(true)}>Delete pipeline</button>}</div>:null}
 </section>;
}

/** One stage: drag handle (Alt+↑/↓ by keyboard), name, win chance, stale after, required chips and its ⋯ menu. An empty
 * stage goes at once; one holding deals asks once to move them to another stage first. */
function StageRow({form,stageKey,index,count,order,workspaceDays,choices,settings,pipelineId,dragging,onDrag,onDrop,onMove,onRemoved}:{form:AutosaveForm;stageKey:string;index:number;count:number;order:string[];workspaceDays:number;choices:(required:string[])=>[string,string][];settings:any;pipelineId:string;dragging:boolean;onDrag:(key:string|null)=>void;onDrop:()=>void;onMove:(to:number)=>void;onRemoved:(order:string[])=>void}){
 const name=String(form.value(`${stageKey}.name`)??''),required=(form.value(`${stageKey}.required`)??[]) as string[],all=choices(required),label=(field:string)=>all.find(([key])=>key===field)?.[1]??field;
 const [deals,setDeals]=useState<CustomerRecord[]|null>(null),[target,setTarget]=useState(''),[busy,setBusy]=useState(false),[refusal,setRefusal]=useState<{message:string;deal?:CustomerRecord}|null>(null);
 const others=order.filter(key=>key!==stageKey);
 async function holding(){return (await recordsRequest<{records:CustomerRecord[]}>(`records/opportunity?${new URLSearchParams({stage_id:stageKey,pipeline_id:pipelineId})}`)).records;}
 async function askRemove(){setRefusal(null);if(stageKey.startsWith('new-')){onRemoved(others);return;}const held=await holding().catch(()=>null);if(held===null){setRefusal({message:'Orbit could not be reached. Try again.'});return;}if(!held.length){onRemoved(others);return;}setTarget(others[0]??'');setDeals(held);}
 async function moveAndRemove(){
  setBusy(true);setRefusal(null);
  try{
   for(let page=0;page<40;page++){
    const held=page===0&&deals?deals:await holding();if(!held.length)break;
    for(const deal of held){try{await saveRequest(`records/opportunity/${deal.id}/move`,'POST',{stageId:target,reviewedStageId:stageKey});}catch(e){setRefusal({message:`${deal.title} cannot move: ${(e as Error).message}`,deal});return;}}
    if(held.length<50)break;
   }
   setDeals(null);onRemoved(others);
  }catch(e){setRefusal({message:(e as Error).message});}finally{setBusy(false);}
 }
 const stageName=(key:string)=>String(form.value(`${key}.name`)??'');
 return <li className={`s-stage ${dragging?'is-dragging':''}`} onDragOver={event=>event.preventDefault()} onDrop={onDrop}>
  <ActionTooltip label={`Move ${name||'stage'}`}><button type="button" className="s-handle" draggable onDragStart={()=>onDrag(stageKey)} onDragEnd={()=>onDrag(null)} onKeyDown={event=>{if(event.altKey&&event.key==='ArrowUp'&&index>0){event.preventDefault();onMove(index-1);}if(event.altKey&&event.key==='ArrowDown'&&index<count-1){event.preventDefault();onMove(index+1);}}}><span aria-hidden="true">⋮⋮</span></button></ActionTooltip>
  <AutosaveField form={form} field={`${stageKey}.name`} label={<span className="sr-only">Stage name</span>} labelText={`${name||'Stage'} name`} quiet className="s-stage-cell s-stage-name"><input maxLength={100} {...textProps(form,`${stageKey}.name`,{parse:named})}/></AutosaveField>
  <AutosaveField form={form} field={`${stageKey}.probability`} label={<span className="sr-only">{name} win chance</span>} labelText={`${name} win chance`} quiet className="s-stage-cell"><input inputMode="decimal" {...textProps(form,`${stageKey}.probability`,{show:value=>`${Number(value??0)}%`,editText:value=>String(Number(value??0)),parse:percent})}/></AutosaveField>
  <AutosaveField form={form} field={`${stageKey}.stale`} label={<span className="sr-only">{name} stale after</span>} labelText={`${name} stale after`} quiet className="s-stage-cell"><input inputMode="numeric" placeholder={`${workspaceDays} days (workspace)`} {...textProps(form,`${stageKey}.stale`,{show:value=>value?`${value} days`:'',editText:value=>value?String(value):'',parse:staleDays})}/></AutosaveField>
  <div className="s-stage-cell s-chips">
   {required.length?required.map(field=><span className="s-chip" key={field}>{label(field)}<ActionTooltip label={`Remove ${label(field)}`}><button type="button" className="r-chip-remove" onClick={()=>form.commit(`${stageKey}.required`,required.filter(item=>item!==field))}><span aria-hidden="true">×</span></button></ActionTooltip></span>):<span className="s-none">Nothing</span>}
   <MenuButton className="r-role-add" label="+ Add" choices={all.filter(([field])=>!required.includes(field)).map(([field,text])=>({label:text,onChoose:()=>form.commit(`${stageKey}.required`,[...required,field])}))}/>
   <MenuButton className="r-more" tooltip={`More for ${name||'this stage'}`} label={<span aria-hidden="true">⋯</span>} choices={count>1?[{label:`Remove ${name||'stage'}`,onChoose:()=>void askRemove()}]:[]}/>
  </div>
  {deals?<InlineConfirm busy={busy} sentence={<>{name} holds {deals.length>=50?'50 or more':deals.length} {deals.length===1?'deal':'deals'}. Move {deals.length===1?'it':'them'} to <select aria-label="Move the deals to" value={target} onChange={event=>setTarget(event.target.value)}>{others.map(key=><option key={key} value={key}>{stageName(key)}</option>)}</select> and remove the stage?</>} action="Move and remove" keep="Keep it" onConfirm={()=>void moveAndRemove()} onKeep={()=>{setDeals(null);setRefusal(null);}}/>:null}
  {refusal?<p className="r-fail" role="alert"><span>{refusal.message}</span>{refusal.deal?<Link to="/app/opportunities/$id" params={{id:refusal.deal.id}}>Open {refusal.deal.title}</Link>:null}</p>:null}
 </li>;
}

/** New pipeline: its name and first stage; it is created once both are given. */
function NewPipeline({onCreated,onCancel}:{onCreated:()=>Promise<void>;onCancel:()=>void}){
 const [name,setName]=useState(''),[stage,setStage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function create(){if(!name.trim()||!stage.trim()||busy)return;setBusy(true);setError('');try{await saveRequest('settings/pipelines','POST',{name:name.trim(),stages:[{name:stage.trim(),probability:0,requiredFields:[],staleIntervalDays:null}]});await onCreated();}catch(e){setError(`Not saved: ${(e as Error).message}`);}finally{setBusy(false);}}
 return <section className="operator-surface settings-card" aria-labelledby="pipeline-new"><div className="settings-card__head"><h2 id="pipeline-new">New pipeline</h2><button type="button" className="operator-text-button" onClick={onCancel}>Cancel</button></div>
  <div className="settings-fields settings-fields--two">
   <label className="r-field"><span className="r-label">Name</span><input autoFocus maxLength={100} value={name} onChange={event=>setName(event.target.value)} onBlur={()=>void create()} onKeyDown={event=>{if(event.key==='Enter')void create();}}/></label>
   <label className="r-field"><span className="r-label">First stage</span><input maxLength={100} value={stage} onChange={event=>setStage(event.target.value)} onBlur={()=>void create()} onKeyDown={event=>{if(event.key==='Enter')void create();}}/></label>
  </div>
  {error?<p className="r-fail" role="alert">{error}</p>:null}
 </section>;
}
