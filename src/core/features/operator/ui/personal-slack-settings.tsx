import {useEffect,useState} from 'react';
import {recordsRequest} from './records-api';
import {OperatorState} from './operator-shell';
import {formatDateTime} from './formatters';
interface PersonalSettings {enabled:boolean;slackUserId:string|null;mappings:string[];notices:{id:string;state:string;error:string|null;createdAt:string}[]}
export function PersonalSlackSettings(){
 const [data,setData]=useState<PersonalSettings>(),[user,setUser]=useState(''),[enabled,setEnabled]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){const next=await recordsRequest<PersonalSettings>('notifications/slack');setData(next);setUser(next.slackUserId??next.mappings[0]??'');setEnabled(next.enabled);}
 useEffect(()=>{void load().catch(e=>setError((e as Error).message));},[]);
 async function save(path='',body:unknown={enabled,slackUserId:user}){try{setError('');setNotice('');await recordsRequest('notifications/slack'+path,path?'POST':'PUT',body);await load();setNotice(path?'Delivery checked.':'Personal mention preference saved.');}catch(e){setError((e as Error).message);}}
 return <section id="personal-slack" className="operator-surface workbench-form" aria-labelledby="personal-slack-title"><h2 id="personal-slack-title">Your Slack mentions</h2>
 <p>Choose direct messages for new mentions in notes, tasks and handoffs. Messages contain a private notice and a secure link, without entry text or customer details. Slack acknowledgment confirms submission, not receipt.</p>
 {error&&<OperatorState kind="error">{error}</OperatorState>}{notice&&<OperatorState>{notice}</OperatorState>}
 {data?<><form className="workbench-form" onSubmit={e=>{e.preventDefault();void save();}}>
 {data.mappings.length?<label>Your mapped Slack identity<select value={user} onChange={e=>setUser(e.target.value)}>{data.mappings.map(id=><option key={id} value={id}>{id}</option>)}</select></label>:<p>Ask the installation owner to connect Slack and explicitly map your identity. Reconnecting or changing a mapping requires a fresh opt-in.</p>}
 <label><input type="checkbox" checked={enabled} disabled={!data.mappings.length} onChange={e=>setEnabled(e.target.checked)}/> Send my mentions as Slack direct messages</label>
 <button className="operator-button" disabled={enabled&&!user}>Save personal mention preference</button></form>
 <p>Email, mobile push, task reminders and daily digests are not available yet. The Slack bot needs users:read, im:write, im:read and chat:write for personal delivery.</p>
 <h3>Your mention deliveries</h3>{data.notices.length?<ul className="notification-list">{data.notices.map(n=><li key={n.id}><div><p>{n.state==='sent'?'Acknowledged by Slack':n.state==='uncertain'?'Uncertain — inspect Slack; no resend':n.state} · {formatDateTime(n.createdAt)}</p>{n.state==='failed'&&<button type="button" onClick={()=>void save('/'+n.id+'/retry',{})}>Retry failed mention</button>}</div></li>)}</ul>:<p>No personal Slack deliveries yet.</p>}</>:<OperatorState>Loading your preference…</OperatorState>}
 </section>;
}
