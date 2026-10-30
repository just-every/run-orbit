import { useCallback,useEffect,useMemo,useState } from 'react';
import { recordsRequest } from './records-api';
import { OperatorState } from './operator-shell';
import { formatDate } from './formatters';
import { SavedLabel } from './autosave/saved-label';
import { SaveFailure } from './autosave/save-failure';
import { useAutosave,type Values } from './autosave/use-autosave';
import { saveRequest } from './record/record-api';
interface TypeSetting {type:'one_to_one'|'sequence'|'workflow';carries:boolean;removalAllowed:boolean;basis:string;updatedBy:string|null;updatedAt:string|null}
interface Settings {types:TypeSetting[];approvedUnsent:{carrying:number;notCarrying:number;approvedBeforeSetting:number};relayRefused:number}
const names={one_to_one:'One-to-one email and replies',sequence:'Sequence email steps',workflow:'Workflow email'};
const notes={one_to_one:'',sequence:' Applies when sequences arrive.',workflow:' Applies when workflow email arrives.'};
const values=(data:Settings):Values=>Object.fromEntries(data.types.flatMap(setting=>[[`${setting.type}.carries`,setting.carries],[`${setting.type}.removalAllowed`,setting.removalAllowed]]));

/** OUT-020: per message type, whether Orbit adds opt-out headers and a link; each change is audited and applies to
 * messages approved after it. A box flips at once and saves; a refusal flips it back with the reason and Retry. */
export function OptOutSettings(){
 const [data,setData]=useState<Settings>(),[error,setError]=useState('');
 const load=useCallback(async()=>{const result=await recordsRequest<Settings>('settings/opt-out');setData(result);return result;},[]);
 useEffect(()=>{void load().catch(e=>setError((e as Error).message));},[load]);
 const copy=useMemo(()=>data?values(data):null,[data]);
 const send=useCallback(async(changes:Values,_base:Values,current:Values,init:{keepalive?:boolean})=>{
  const next={...current,...changes};let latest:Settings|undefined;
  for(const type of new Set(Object.keys(changes).map(field=>field.split('.')[0]!)))latest=await saveRequest<Settings>(`settings/opt-out/${type}`,'POST',{carries:Boolean(next[`${type}.carries`]),removalAllowed:Boolean(next[`${type}.removalAllowed`])},init);
  if(latest)setData(latest);
  return {copy:values(latest??await load()),changed:true};
 },[load]);
 const form=useAutosave<Values>({key:'settings.opt-out',copy,send,reread:async()=>values(await load())});
 const box=(type:string,field:string,label:string)=>{const name=`${type}.${field}`,status=form.status(name),checked=Boolean(status.state==='failed'?form.copy?.[name]:form.value(name));
  return <div data-autosave="" className="settings-check"><label><input type="checkbox" checked={checked} onChange={event=>form.commit(name,event.target.checked)}/> {label}<SavedLabel show={form.saved(name)}/></label><SaveFailure status={status} onRetry={()=>form.retry(name)} onDiscard={()=>form.discard(name)} onUseMine={()=>form.useMine(name)} describe={value=>value?'on':'off'}/></div>;};
 return <section id="opt-out-links" className="operator-surface settings-card" aria-labelledby="opt-out-title"><h2 id="opt-out-title">Opt-out links</h2>
  <p className="settings-card__line">Whether Orbit adds unsubscribe headers and a link, by message type; a change applies to messages approved after it.</p>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
  {data?<>{data.types.map(setting=><fieldset key={setting.type} data-type={setting.type}><legend>{names[setting.type]}</legend>
   <p className="settings-card__line">{setting.basis.charAt(0).toUpperCase()+setting.basis.slice(1)}{setting.updatedBy&&setting.updatedAt?` (${setting.updatedBy}, ${formatDate(setting.updatedAt)})`:''}.{notes[setting.type]}</p>
   {box(setting.type,'carries','Add opt-out headers and link')}
   {box(setting.type,'removalAllowed','Reps may remove it from one message as relationship or transactional mail')}
  </fieldset>)}
  {data.approvedUnsent.carrying+data.approvedUnsent.notCarrying+data.approvedUnsent.approvedBeforeSetting>0&&<p>Approved messages not yet sent keep the state their approval bound: {data.approvedUnsent.carrying} with opt-out, {data.approvedUnsent.notCarrying} without{data.approvedUnsent.approvedBeforeSetting?`, and ${data.approvedUnsent.approvedBeforeSetting} approved before this setting existed, which keep their original unsubscribe group`:''}.</p>}
  {data.relayRefused>0&&<p>{data.relayRefused} historical {data.relayRefused===1?'refusal':'refusals'} recorded when the transport could not carry the approved opt-out link. The refusal remains for unsupported paths.</p>}</>:!error&&<OperatorState>Loading opt-out settings…</OperatorState>}
 </section>;
}
