import { useEffect,useState } from 'react';
import { Link } from '@tanstack/react-router';
import { OperatorShell,OperatorState } from './operator-shell';
import {formatDate} from './formatters';
import {useAccessPages} from '../../fold-ui/workspace';
interface Notification {id:string;href:string|null;opportunityId:string|null;opportunityTitle:string|null;kind:string;message:string;createdAt:string;readAt:string|null}
export function useNotifications(){
 const [data,setData]=useState<{notifications:Notification[];unread:number}>({notifications:[],unread:0}),[error,setError]=useState('');
 useEffect(()=>{let active=true;async function load(){try{const response=await fetch('/api/v1/notifications');if(!response.ok)throw new Error('Notifications could not load.');const next=await response.json() as typeof data;if(active){setData(next);setError('');}}catch(e){if(active)setError(e instanceof Error?e.message:'Notifications unavailable.');}}void load();const timer=setInterval(()=>void load(),4000);return()=>{active=false;clearInterval(timer);};},[]);
 async function read(id:string){const response=await fetch(`/api/v1/notifications/${id}/read`,{method:'POST'});if(!response.ok){setError('Could not mark the notification read.');return;}setData(old=>({notifications:old.notifications.map(item=>item.id===id?{...item,readAt:new Date().toISOString()}:item),unread:Math.max(0,old.unread-(old.notifications.find(item=>item.id===id)?.readAt?0:1))}));}
 return {data,error,read};
}
export function NotificationCount(){const {data,error}=useNotifications();return <Link to="/app/notifications" aria-label={error?'Notifications unavailable':`${data.unread} unread notifications`}>Notifications{data.unread?` (${data.unread})`:''}</Link>;}
/** Ink line icons, one per category: a flag for NOW, a speech bubble for a reply, an envelope with a mark for delivery. */
const notificationIconPaths={
 assignment:<><circle cx="16" cy="10" r="5"/><path d="M6 28v-4a10 10 0 0 1 20 0v4"/></>,
 task:<><rect x="6" y="5" width="20" height="23" rx="3"/><path d="m10 16 4 4 8-9"/></>,
 now:<><path d="M8 27V5"/><path d="M8 6h14l-3 5 3 5H8"/></>,
 reply:<><path d="M5 8.5A3.5 3.5 0 0 1 8.5 5h15A3.5 3.5 0 0 1 27 8.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5h0.5A3.5 3.5 0 0 1 5 17.5z"/><path d="M11 11.5h10M11 15h6"/></>,
 mention:<><circle cx="16" cy="16" r="4.5"/><path d="M20.5 16v2a3.5 3.5 0 0 0 7 0v-2A11.5 11.5 0 1 0 22 26"/></>,
 failure:<><rect x="4" y="8" width="20" height="15" rx="2.5"/><path d="m4.5 9.5 9.5 7 9.5-7"/><circle cx="24" cy="8" r="4.5" fill="var(--ob-card)"/><path d="M24 6v2.5M24 10.2v.1"/></>,
};
function category(item:Notification){return (item.kind==='record.assigned'||item.kind==='form.submitted')?'assignment':item.kind==='record.mention'?'mention':item.kind.startsWith('task.')?'task':item.kind==='opportunity.now'?'now':item.kind==='customer.reply'?'reply':'failure';}
function NotificationIcon({item}:{item:Notification}){return <svg className="notification-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{notificationIconPaths[category(item)]}</svg>;}
/** Retained notification branch layout, populated only with real deployment events. */
export function NotificationsPage(){const {data,error,read}=useNotifications(),pages=useAccessPages();const [unreadOnly,setUnreadOnly]=useState(false),[kind,setKind]=useState('all'),[selectedId,setSelectedId]=useState<string|null>(null);const items=data.notifications.filter(item=>(!unreadOnly||!item.readAt)&&(kind==='all'||category(item)===kind)),selected=data.notifications.find(item=>item.id===selectedId);
 return <OperatorShell eyebrow="Notifications" title="Notifications inbox" action={<span>{data.unread} unread</span>} restricted={pages.accessClass==="collaborator"} reports={pages.reports}>
  <p>Review recent updates and open the record to take action.</p>
  <section className="operator-surface workbench-form notification-filters"><label><input type="checkbox" checked={unreadOnly} onChange={e=>setUnreadOnly(e.target.checked)}/> Show unread only</label><label>Notification type<select aria-label="Notification type" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All types</option><option value="assignment">Assignments</option><option value="task">Tasks</option><option value="now">Needs attention</option><option value="reply">Customer replies</option><option value="mention">Mentions</option><option value="failure">Delivery outcomes</option></select></label></section>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
  <div className={`notification-layout${selected?' has-selection':''}`}><section className="operator-surface operator-detail__section">
   {items.length?<ul className="notification-list">{items.map(item=><li key={item.id} className={item.readAt?'is-read':'is-unread'}><NotificationIcon item={item}/><div><button className="notification-title" onClick={()=>{setSelectedId(item.id);void read(item.id);}}>{item.opportunityTitle??item.message}</button><p>{item.message}</p><p><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>{!item.readAt?' · Unread':''}</p>{item.href?<a href={item.href} onClick={()=>void read(item.id)}>{item.kind==='form.submitted'?'Open enquiry contact':item.kind==='record.assigned'?'Open assigned records':item.kind==='record.mention'?'Open the mention':item.kind==='customer.reply'||item.kind.startsWith('message.')?'Open contact':'Open task'}</a>:item.opportunityId&&<Link to="/app/opportunities/$id" params={{id:item.opportunityId}} onClick={()=>void read(item.id)}>Open opportunity</Link>}</div>{!item.readAt&&<button onClick={()=>void read(item.id)}>Mark read</button>}</li>)}</ul>:<OperatorState>No {unreadOnly?'unread ':''}notifications.</OperatorState>}
  </section>{selected&&<aside className="operator-surface operator-detail__section notification-detail"><button onClick={()=>setSelectedId(null)} aria-label="Close notification details">Close</button><NotificationIcon item={selected}/><p className="operator-eyebrow">{selected.kind==='form.submitted'?'Form enquiry':category(selected)==='assignment'?'Record assignment':category(selected)==='now'?'Needs attention':category(selected)==='reply'?'Customer reply':category(selected)==='task'?'Task update':category(selected)==='mention'?'Mention':'Delivery outcome'}</p><h2>{selected.opportunityTitle??selected.message}</h2><p>{selected.message}</p><dl><dt>Recorded</dt><dd><time dateTime={selected.createdAt}>{formatDate(selected.createdAt)}</time></dd><dt>Read state</dt><dd>{selected.readAt?'Read':'Unread'}</dd></dl>{selected.href?<a className="operator-button" href={selected.href}>{selected.kind==='form.submitted'?'View enquiry contact':selected.kind==='record.assigned'?'View assigned records':selected.kind==='record.mention'?'View the mention':selected.kind==='customer.reply'||selected.kind.startsWith('message.')?'View contact':'View task'}</a>:selected.opportunityId&&<Link className="operator-button" to="/app/opportunities/$id" params={{id:selected.opportunityId}}>View opportunity</Link>}</aside>}</div>
 <MentionsView/>
 </OperatorShell>;
}
interface Mention {source:'entry'|'task'|'handoff';id:string;kind:string;text:string;author:string|null;at:string;href:string}
const sourceNames:Record<string,string>={'manual.note':'Note','manual.call':'Call log','manual.meeting':'Meeting log',task:'Task note',handoff:'Handoff'};
/** RECORD-017: every entry, task note and handoff that mentions you now. */
function MentionsView(){const [mentions,setMentions]=useState<Mention[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{void fetch('/api/v1/records/mentions',{credentials:'same-origin'}).then(async r=>{if(!r.ok)throw new Error('Mentions could not load.');setMentions(((await r.json()) as {mentions:Mention[]}).mentions);}).catch(e=>setError((e as Error).message));},[]);
 return <section id="mentions" className="operator-surface operator-detail__section"><h2>Mentions</h2>{error?<OperatorState kind="error">{error}</OperatorState>:!mentions?<OperatorState>Loading mentions…</OperatorState>:mentions.length?<ul className="notification-list">{mentions.map(m=><li key={`${m.source}:${m.id}`}><div><p><strong>{sourceNames[m.kind]??'Entry'}</strong>{m.author?` by ${m.author}`:''} · <time dateTime={m.at}>{formatDate(m.at)}</time></p><p style={{whiteSpace:'pre-wrap'}}>{m.text}</p><a href={m.href}>Open the mention</a></div></li>)}</ul>:<OperatorState>Nobody has mentioned you yet.</OperatorState>}</section>;
}
