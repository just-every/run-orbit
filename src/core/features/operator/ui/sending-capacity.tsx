import './sending-capacity.css';
import { useCallback,useEffect,useMemo,useState } from 'react';
import { recordsRequest } from './records-api';
import { OperatorState } from './operator-shell';
import { AutosaveField,textProps } from './autosave/field';
import { useAutosave,type Parse,type Values } from './autosave/use-autosave';
import { saveRequest } from './record/record-api';
interface User {id:string;name:string;budget:number;used:number;remaining:number;overridden:boolean;default:number}
interface Capacity {owner:boolean;status:string;declaredUsers:number;perUserPerMinute:number;sequencePerDay:number;shared:{perMinute:number;used:number;overridden:boolean;default:number};users:User[]}
const count=(max:number,unit:string):Parse=>text=>{const value=Number(text.trim());return Number.isInteger(value)&&value>=1&&value<=max?{value}:{error:`Enter a whole number of ${unit} from 1 to ${max}.`};};
const values=(data:Capacity):Values=>({rate:data.shared.perMinute,...Object.fromEntries(data.users.map(user=>[`budget.${user.id}`,user.budget]))});

/** OUT-026: each user's one-to-one budget used and remaining, and the shared transport rate; the owner sets both
 * (until TEAM-005 adds the administrator role). Each number saves when left; Reset to default stays a quiet action. */
export function SendingCapacity(){
 const [data,setData]=useState<Capacity>(),[error,setError]=useState('');
 const load=useCallback(async()=>{const result=await recordsRequest<Capacity>('settings/sending');setData(result);return result;},[]);
 useEffect(()=>{void load().catch(e=>setError((e as Error).message));},[load]);
 const copy=useMemo(()=>data?values(data):null,[data]);
 const send=useCallback(async(changes:Values,_base:Values,_copy:Values,init:{keepalive?:boolean})=>{
  for(const [field,value] of Object.entries(changes)){
   if(field==='rate')await saveRequest('settings/sending/shared','PUT',{perMinute:value},init);
   else await saveRequest(`settings/sending/operators/${field.slice(7)}`,'PUT',{oneToOnePerDay:value},init);
  }
  return {copy:values(await load()),changed:true};
 },[load]);
 const form=useAutosave<Values>({key:'settings.sending',copy,send,reread:async()=>values(await load())});
 async function reset(path:string,body:unknown){try{setError('');await recordsRequest(path,'PUT',body);await load();}catch(e){setError((e as Error).message);}}
 return <section id="sending-capacity" className="operator-surface settings-card sending-capacity" aria-labelledby="sending-limits"><h2 id="sending-limits">Sending limits</h2>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
  {data?<>
   <p className="settings-card__line">The team sends up to {data.shared.perMinute} messages a minute ({data.shared.used} in the last minute); a message over a limit waits and says when it can go.</p>
   <div tabIndex={0} role="region" aria-label="One-to-one budgets" style={{overflowX:'auto'}}><table><caption>{data.owner?'Every user’s one-to-one budget':'Your one-to-one budget'}</caption><thead><tr><th>User</th><th>Used</th><th>Remaining</th><th>Budget a day</th></tr></thead><tbody>{data.users.map(user=><tr key={user.id}><td>{user.name}</td><td>{user.used}</td><td>{user.remaining}</td><td>{data.owner?<div className="sending-capacity__budget"><AutosaveField form={form} field={`budget.${user.id}`} label={<span className="sr-only">One-to-one budget for {user.name}</span>} labelText={`${user.name}’s budget`}><input aria-label={`One-to-one budget for ${user.name}`} inputMode="numeric" {...textProps(form,`budget.${user.id}`,{parse:count(1000000,'messages a day')})}/></AutosaveField>{user.overridden&&<button type="button" className="operator-text-button" onClick={()=>void reset(`settings/sending/operators/${user.id}`,{oneToOnePerDay:null})}>Reset to {user.default}</button>}</div>:user.budget}</td></tr>)}</tbody></table></div>
   {data.owner&&<div className="sending-capacity__rate"><AutosaveField form={form} field="rate" label="Messages a minute for the team (your SendGrid account’s rate)" labelText="Messages a minute"><input inputMode="numeric" {...textProps(form,'rate',{parse:count(100000,'messages a minute')})}/></AutosaveField>{data.shared.overridden&&<button type="button" className="operator-text-button" onClick={()=>void reset('settings/sending/shared',{perMinute:null})}>Reset to default ({data.shared.default} a minute)</button>}</div>}
  </>:!error&&<OperatorState>Loading sending limits…</OperatorState>}
 </section>;
}
