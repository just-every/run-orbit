import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AIUsage} from '../ai-usage';
import {AutosaveField,choiceProps,textProps} from '../autosave/field';
import {InlineConfirm} from '../autosave/inline-confirm';
import {SavedLabel} from '../autosave/saved-label';
import {SaveFailure} from '../autosave/save-failure';
import {useAutosave,type AutosaveForm,type Parse,type Values} from '../autosave/use-autosave';
import {useHashMap} from '../hash-target';
import {OperatorState} from '../operator-shell';
import {saveRequest} from '../record/record-api';
import {recordsRequest} from '../records-api';
import {SettingsArea} from './area';
import {useWorkspaceSettings} from './use-workspace-settings';

// Sections of the old one-page Settings that are now areas of their own.
const movedSections:Record<string,string>={'mail-sender':'/app/settings/mail','form-embedding':'/app/settings/forms','calling-settings':'/app/settings/integrations',access:'/app/settings/team'};
const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const zones=(()=>{try{return Intl.supportedValuesOf('timeZone');}catch{return [] as string[];}})();
const currencies=(()=>{try{return Intl.supportedValuesOf('currency');}catch{return ['AUD','USD','EUR','GBP'];}})();
/** "Australian dollar (AUD)": the currency's English name, its last word in lower case, then its code. */
const currencyWords=(code:string)=>{try{return (new Intl.DisplayNames(['en'],{type:'currency'}).of(code)??code).replace(/(\w+)$/,word=>word.toLowerCase());}catch{return code;}};
const currencyName=(code:string)=>`${currencyWords(code)} (${code})`;
const times=Array.from({length:48},(_,index)=>`${String(Math.floor(index/2)).padStart(2,'0')}:${index%2?'30':'00'}`);
const clock=(time:string)=>{const [hour,minute]=time.split(':').map(Number) as [number,number];return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour<12?'am':'pm'}`;};
const whole=(min:number,max:number,unit:string):Parse=>text=>{const value=Number(text.trim());return Number.isInteger(value)&&value>=min&&value<=max?{value}:{error:`Enter ${min} to ${max} ${unit}.`};};

/** The workspace as the fields its page saves. */
function workspaceValues(workspace:any):Values{
 const hours=JSON.parse(workspace.working_hours_json);
 return {name:workspace.name,timezone:workspace.timezone,currency:workspace.currency,days:hours.days,start:hours.start,end:hours.end,staleIntervalDays:workspace.stale_interval_days,awaitingResponseWorkingDays:workspace.awaiting_response_working_days,freeMailDomains:JSON.parse(workspace.free_mail_domains_json).join('\n'),updated_at:workspace.updated_at};
}

/** Settings › Workspace: each value saves as it changes; currency asks once. */
export function WorkspaceArea(){
 const settings=useWorkspaceSettings();
 useHashMap(hash=>movedSections[hash]??null);
 const copy=useMemo(()=>settings.data?workspaceValues(settings.data.workspace):null,[settings.data]);
 const send=useCallback(async(changes:Values,_base:Values,current:Values,init:{keepalive?:boolean})=>{
  const next={...current,...changes};
  const result=await saveRequest<{workspace:any}>('settings','PUT',{name:next.name,timezone:next.timezone,currency:next.currency,workingHours:{days:next.days,start:next.start,end:next.end},staleIntervalDays:Number(next.staleIntervalDays),awaitingResponseWorkingDays:Number(next.awaitingResponseWorkingDays),freeMailDomains:String(next.freeMailDomains).split(/[\s,]+/).filter(Boolean),ifUpdatedAt:current.updated_at},init);
  return {copy:workspaceValues(result.workspace),changed:true};
 },[]);
 const form=useAutosave<Values>({key:'settings.workspace',copy,version:value=>value.updated_at,send,reread:async()=>workspaceValues((await recordsRequest<any>('settings')).workspace),onSaved:()=>void settings.changed()});
 return <SettingsArea title="Workspace">
  {settings.error?<OperatorState kind="error">{settings.error.message}</OperatorState>:null}
  {copy?<><WorkspaceCard form={form}/><HoursCard form={form}/><TimingCard form={form}/>
   <section className="operator-surface settings-card" aria-labelledby="workspace-free-mail"><h2 id="workspace-free-mail">Free-mail domains</h2>
    <AutosaveField form={form} field="freeMailDomains" label="Mail from these domains never makes a company"><textarea rows={3} placeholder="gmail.com" {...textProps(form,'freeMailDomains',{multiline:true,parse:text=>{const bad=text.split(/[\s,]+/).filter(Boolean).find(domain=>!/^[a-zA-Z0-9.-]+$/.test(domain));return bad?{error:`${bad} is not a domain. Enter domains such as gmail.com, one per line or separated by commas.`}:{value:text};}})}/></AutosaveField>
   </section></>:settings.error?null:<OperatorState>Loading workspace…</OperatorState>}
  <AIUsage/>
 </SettingsArea>;
}

/** Workspace: its name, clock and currency; a new currency asks once, since amounts are not converted. */
function WorkspaceCard({form}:{form:AutosaveForm}){
 const [asking,setAsking]=useState<string|null>(null),currency=String(form.value('currency')??'');
 return <section className="operator-surface settings-card" aria-labelledby="workspace-card"><h2 id="workspace-card">Workspace</h2>
  <div className="settings-fields">
   <AutosaveField form={form} field="name" label="Name"><input maxLength={200} {...textProps(form,'name',{parse:text=>text.trim()?{value:text.trim()}:{error:'A workspace needs a name.'}})}/></AutosaveField>
   <AutosaveField form={form} field="timezone" label="Time zone"><select {...choiceProps(form,'timezone')}>{zones.map(zone=><option key={zone} value={zone}>{zone}</option>)}</select></AutosaveField>
   <AutosaveField form={form} field="currency" label="Currency" describe={value=>currencyName(String(value))}><select value={asking??currency} onChange={event=>setAsking(event.target.value===currency?null:event.target.value)}>{currencies.map(code=><option key={code} value={code}>{currencyName(code)}</option>)}</select></AutosaveField>
  </div>
  {asking?<InlineConfirm sentence={`Show every amount in ${currencyWords(asking)}s? Amounts are not converted.`} action={`Switch to ${asking}`} keep={`Keep ${currency}`} onConfirm={()=>{form.commit('currency',asking);setAsking(null);}} onKeep={()=>setAsking(null)}/>:null}
 </section>;
}

/** Working hours: the days as pills and the hours in half-hour steps, each saving on change; an end before its start
 * is refused beside them and nothing is sent. */
function HoursCard({form}:{form:AutosaveForm}){
 const chosen=(form.value('days')??[]) as number[],start=String(form.value('start')),end=String(form.value('end'));
 const [refused,setRefused]=useState('');
 function hours(field:'start'|'end',value:string){const next={start,end,[field]:value};if(next.end<=next.start){setRefused('Ends before it starts.');form.edit(field,value);return;}setRefused('');form.commit(field,value);if(form.typing(field==='start'?'end':'start'))form.commit(field==='start'?'end':'start');}
 return <section className="operator-surface settings-card" aria-labelledby="workspace-hours"><div className="settings-card__head"><h2 id="workspace-hours">Working hours</h2><SavedLabel show={form.saved('days')}/></div>
  <fieldset className="settings-days"><legend className="sr-only">Working days</legend>{days.map((day,index)=><label key={day}><input type="checkbox" aria-label={dayNames[index]} checked={chosen.includes(index)} onChange={event=>form.commit('days',event.target.checked?[...chosen,index].sort():chosen.filter(item=>item!==index))}/>{day}</label>)}</fieldset>
  <SaveFailure status={form.status('days')} onRetry={()=>form.retry('days')} onDiscard={()=>form.discard('days')} onUseMine={()=>form.useMine('days')} describe={value=>((value??[]) as number[]).map(index=>days[index]).join(', ')}/>
  <div className="settings-fields settings-fields--two">
   {(['start','end'] as const).map(field=><AutosaveField key={field} form={form} field={field} label={field==='start'?'Start':'End'} describe={value=>clock(String(value))}><select value={String(form.value(field))} onChange={event=>hours(field,event.target.value)}>{times.map(time=><option key={time} value={time}>{clock(time)}</option>)}</select></AutosaveField>)}
  </div>
  {refused?<p className="r-fail" role="alert">{refused}</p>:null}
 </section>;
}

/** One sentence with its number in it: the number saves when left; Saved and the failure line follow the sentence. */
function Sentence({form,field,label,parse,before,after}:{form:AutosaveForm;field:string;label:string;parse:Parse;before:string;after:string}){
 const box=useRef<HTMLDivElement>(null),status=form.status(field);
 useEffect(()=>{form.describe(field,label,()=>box.current);});
 return <div ref={box} data-autosave="" className={status.state==='failed'||status.state==='conflict'?'is-failed':''}>
  <p className="settings-sentence">{before} <input inputMode="numeric" aria-label={label} className="settings-number" {...textProps(form,field,{parse})}/> {after}<SavedLabel show={form.saved(field)}/></p>
  <SaveFailure status={status} onRetry={()=>form.retry(field)} onDiscard={()=>form.discard(field)} onUseMine={()=>form.useMine(field)}/>
 </div>;
}

/** Deal timing, in sentences with their numbers in them. */
function TimingCard({form}:{form:AutosaveForm}){
 return <section className="operator-surface settings-card" aria-labelledby="workspace-timing"><h2 id="workspace-timing">Deal timing</h2>
  <Sentence form={form} field="staleIntervalDays" label="Days before a deal goes stale" parse={whole(1,365,'days')} before="A deal goes stale after" after="days without activity."/>
  <Sentence form={form} field="awaitingResponseWorkingDays" label="Working days to wait for a customer's reply" parse={whole(1,30,'working days')} before="Wait" after="working days for a customer's reply."/>
 </section>;
}
