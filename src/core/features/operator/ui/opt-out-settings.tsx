import { useEffect,useState } from 'react';
import { recordsRequest } from './records-api';
import { OperatorState } from './operator-shell';
import { formatDate } from './formatters';
interface TypeSetting {type:'one_to_one'|'sequence'|'workflow';carries:boolean;removalAllowed:boolean;basis:string;updatedBy:string|null;updatedAt:string|null}
interface Settings {types:TypeSetting[];approvedUnsent:{carrying:number;notCarrying:number;approvedBeforeSetting:number};relayRefused:number}
const names={one_to_one:'One-to-one email and replies',sequence:'Sequence email steps',workflow:'Workflow email'};
const notes={one_to_one:'',sequence:' Applies when sequences arrive.',workflow:' Applies when workflow email arrives.'};
/** OUT-020: per message type, whether Orbit adds opt-out headers and a link; each change is audited and applies to messages approved after it. */
export function OptOutSettings(){
 const [data,setData]=useState<Settings>(),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){try{setData(await recordsRequest<Settings>('settings/opt-out'));}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();},[]);
 async function save(setting:TypeSetting,change:Partial<TypeSetting>){try{setError('');const next={carries:change.carries??setting.carries,removalAllowed:change.removalAllowed??setting.removalAllowed};setData(await recordsRequest<Settings>(`settings/opt-out/${setting.type}`,'POST',next));setNotice(`${names[setting.type]}: opt-out ${next.carries?'on':'off'}, removal ${next.removalAllowed?'allowed':'forbidden'}. Messages approved from now on follow it; drafts not yet approved need review again.`);}catch(e){setError((e as Error).message);}}
 return <section id="opt-out-links" className="operator-surface settings-card" aria-labelledby="opt-out-title"><h2 id="opt-out-title">Opt-out links</h2>
  <p className="settings-card__line">Whether Orbit adds unsubscribe headers and a link, by message type; a change applies to messages approved after it.</p>
  {error&&<OperatorState kind="error">{error}</OperatorState>}{notice&&<p role="status">{notice}</p>}
  {data?<>{data.types.map(setting=><fieldset key={setting.type} data-type={setting.type}><legend>{names[setting.type]}</legend>
   <p><strong>{setting.carries?'On':'Off'}</strong> · {setting.basis}{setting.updatedBy&&setting.updatedAt?` (${setting.updatedBy}, ${formatDate(setting.updatedAt)})`:''}.{notes[setting.type]}</p>
   <label><input type="checkbox" checked={setting.carries} onChange={e=>void save(setting,{carries:e.target.checked})}/> Add opt-out headers and link</label>
   <label><input type="checkbox" checked={setting.removalAllowed} onChange={e=>void save(setting,{removalAllowed:e.target.checked})}/> Reps may remove it from one message as relationship or transactional mail</label>
  </fieldset>)}
  {data.approvedUnsent.carrying+data.approvedUnsent.notCarrying+data.approvedUnsent.approvedBeforeSetting>0&&<p>Approved messages not yet sent keep the state their approval bound: {data.approvedUnsent.carrying} with opt-out, {data.approvedUnsent.notCarrying} without{data.approvedUnsent.approvedBeforeSetting?`, and ${data.approvedUnsent.approvedBeforeSetting} approved before this setting existed, which keep their original unsubscribe group`:''}.</p>}
  {data.relayRefused>0&&<p>{data.relayRefused} historical {data.relayRefused===1?'refusal':'refusals'} recorded when the transport could not carry the approved opt-out link. The refusal remains for unsupported paths.</p>}</>:!error&&<OperatorState>Loading opt-out settings…</OperatorState>}
 </section>;
}
