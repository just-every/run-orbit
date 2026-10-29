import {useState} from 'react';
import {AIUsage} from '../ai-usage';
import {useHashMap} from '../hash-target';
import {OperatorState} from '../operator-shell';
import {recordsRequest} from '../records-api';
import {SettingsArea} from './area';
import {useWorkspaceSettings} from './use-workspace-settings';

// Sections of the old one-page Settings that are now areas of their own.
const movedSections:Record<string,string>={'mail-sender':'/app/settings/mail','form-embedding':'/app/settings/forms','calling-settings':'/app/settings/integrations',access:'/app/settings/team'};

/** Settings › Workspace: the workspace form and AI use. */
export function WorkspaceArea(){
 const settings=useWorkspaceSettings();
 useHashMap(hash=>movedSections[hash]??null);
 return <SettingsArea title="Workspace">
  {settings.error?<OperatorState kind="error">{settings.error.message}</OperatorState>:null}
  {settings.data?<WorkspaceForm workspace={settings.data.workspace} onSaved={settings.changed}/>:settings.error?null:<OperatorState>Loading workspace…</OperatorState>}
  <AIUsage/>
 </SettingsArea>;
}

function WorkspaceForm({workspace,onSaved}:{workspace:any;onSaved:()=>Promise<void>}){
 const [values,setValues]=useState<any>(()=>({...workspace,workingHours:JSON.parse(workspace.working_hours_json),freeMailDomains:JSON.parse(workspace.free_mail_domains_json).join('\n')})),[error,setError]=useState(''),[notice,setNotice]=useState('');
 if(!Array.isArray(values.workingHours.days))return <OperatorState kind="error">Workspace working hours are invalid. Apply the current database migrations.</OperatorState>;
 async function save(){try{setError('');setNotice('');await recordsRequest('settings','PUT',{name:values.name,timezone:values.timezone,currency:values.currency,workingHours:values.workingHours,staleIntervalDays:Number(values.stale_interval_days),awaitingResponseWorkingDays:Number(values.awaiting_response_working_days),freeMailDomains:values.freeMailDomains.split(/\s+/).filter(Boolean)});setNotice('Saved.');await onSaved();}catch(e){setError((e as Error).message);}}
 function field(key:string,label:string,type='text'){return <label>{label}<input required type={type} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/></label>;}
 return <form className="operator-surface workbench-form settings-layout" onSubmit={e=>{e.preventDefault();void save();}}><h2>Workspace</h2>
  {error?<OperatorState kind="error">{error}</OperatorState>:null}{notice?<OperatorState>{notice}</OperatorState>:null}
  {field('name','Workspace name')}{field('timezone','Timezone')}{field('currency','Currency (ISO code)')}{field('stale_interval_days','Stale interval (days)','number')}{field('awaiting_response_working_days','Awaiting response (working days)','number')}
  <fieldset><legend>Working days</legend>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day,index)=><label key={day}><input type="checkbox" checked={values.workingHours.days.includes(index)} onChange={e=>setValues({...values,workingHours:{...values.workingHours,days:e.target.checked?[...values.workingHours.days,index]:values.workingHours.days.filter((d:number)=>d!==index)}})}/>{day}</label>)}</fieldset>
  {['start','end'].map(key=><label key={key}>Working hours {key}<input type="time" required value={values.workingHours[key]} onChange={e=>setValues({...values,workingHours:{...values.workingHours,[key]:e.target.value}})}/></label>)}
  <label>Free-mail domains, one per line<textarea value={values.freeMailDomains} onChange={e=>setValues({...values,freeMailDomains:e.target.value})}/></label>
  <button className="operator-button">Save workspace</button>
 </form>;
}
