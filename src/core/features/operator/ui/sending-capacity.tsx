import './sending-capacity.css';
import { useEffect,useState } from 'react';
import { recordsRequest } from './records-api';
import { OperatorState } from './operator-shell';
interface User {id:string;name:string;budget:number;used:number;remaining:number;overridden:boolean;default:number}
interface Capacity {owner:boolean;status:string;declaredUsers:number;perUserPerMinute:number;sequencePerDay:number;shared:{perMinute:number;used:number;overridden:boolean;default:number};users:User[]}
/** OUT-026: each user's one-to-one budget used and remaining, and the shared transport rate; the owner sets both until TEAM-005 adds the administrator role. */
export function SendingCapacity(){
 const [data,setData]=useState<Capacity>(),[error,setError]=useState(''),[notice,setNotice]=useState(''),[rate,setRate]=useState(''),[budgets,setBudgets]=useState<Record<string,string>>({});
 async function load(){try{const result=await recordsRequest<Capacity>('settings/sending');setData(result);setRate(String(result.shared.perMinute));setBudgets(Object.fromEntries(result.users.map(user=>[user.id,String(user.budget)])));}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();},[]);
 async function save(path:string,body:unknown,message:string){try{setError('');await recordsRequest(path,'PUT',body);setNotice(message);await load();}catch(e){setError((e as Error).message);}}
 return <section id="sending-capacity" className="operator-surface settings-card sending-capacity" aria-labelledby="sending-limits"><h2 id="sending-limits">Sending limits</h2>
  {error&&<OperatorState kind="error">{error}</OperatorState>}{notice&&<p role="status">{notice}</p>}
  {data?<>
   <p className="settings-card__line">The team sends up to {data.shared.perMinute} messages a minute ({data.shared.used} in the last minute); a message over a limit waits and says when it can go.</p>
   <div tabIndex={0} role="region" aria-label="One-to-one budgets" style={{overflowX:'auto'}}><table><caption>{data.owner?'Every user’s one-to-one budget':'Your one-to-one budget'}</caption><thead><tr><th>User</th><th>Used</th><th>Remaining</th><th>Budget a day</th></tr></thead><tbody>{data.users.map(user=><tr key={user.id}><td>{user.name}</td><td>{user.used}</td><td>{user.remaining}</td><td>{data.owner?<form className="sending-capacity__budget" onSubmit={e=>{e.preventDefault();void save(`settings/sending/operators/${user.id}`,{oneToOnePerDay:Number(budgets[user.id])},`${user.name}’s budget saved; it applies to their next message.`);}}><input aria-label={`One-to-one budget for ${user.name}`} type="number" min={1} required value={budgets[user.id]??''} onChange={e=>setBudgets({...budgets,[user.id]:e.target.value})}/><button>Save</button>{user.overridden&&<button type="button" onClick={()=>void save(`settings/sending/operators/${user.id}`,{oneToOnePerDay:null},`${user.name}’s budget reset to ${user.default}.`)}>Reset</button>}</form>:user.budget}</td></tr>)}</tbody></table></div>
   {data.owner&&<form className="sending-capacity__rate" onSubmit={e=>{e.preventDefault();void save('settings/sending/shared',{perMinute:Number(rate)},'Shared sending rate saved.');}}><label>Messages a minute for the team (your SendGrid account’s rate)<input type="number" min={1} required value={rate} onChange={e=>setRate(e.target.value)}/></label><button>Save rate</button>{data.shared.overridden&&<button type="button" onClick={()=>void save('settings/sending/shared',{perMinute:null},`Shared rate reset to ${data.shared.default} a minute.`)}>Reset to default</button>}</form>}
  </>:!error&&<OperatorState>Loading sending limits…</OperatorState>}
 </section>;
}
