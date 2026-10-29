import { useEffect,useState } from 'react';
import { Link } from '@tanstack/react-router';
import { OperatorShell,OperatorState } from './operator-shell';
import {formatDateTime} from './formatters';
import {useAccessPages} from '../../fold-ui/workspace';
import './notifications.css';
interface Notification {id:string;href:string|null;opportunityId:string|null;opportunityTitle:string|null;recordTitle?:string|null;kind:string;message:string;createdAt:string;readAt:string|null}
export function useNotifications(){
 const [data,setData]=useState<{notifications:Notification[];unread:number}>({notifications:[],unread:0}),[error,setError]=useState('');
 useEffect(()=>{let active=true;async function load(){try{const response=await fetch('/api/v1/notifications');if(!response.ok)throw new Error('Notifications could not load.');const next=await response.json() as typeof data;if(active){setData(next);setError('');}}catch(e){if(active)setError(e instanceof Error?e.message:'Notifications unavailable.');}}void load();const timer=setInterval(()=>void load(),4000);return()=>{active=false;clearInterval(timer);};},[]);
 async function read(id:string){try{const response=await fetch(`/api/v1/notifications/${id}/read`,{method:'POST',keepalive:true});if(!response.ok)throw new Error('Could not mark the notification read.');setData(old=>({notifications:old.notifications.map(item=>item.id===id?{...item,readAt:new Date().toISOString()}:item),unread:Math.max(0,old.unread-(old.notifications.find(item=>item.id===id)?.readAt?0:1))}));}catch(e){setError(e instanceof Error?e.message:'Could not mark the notification read.');}}
 return {data,error,read};
}
/** The unread count the menu shows beside Notifications. A failed read keeps the last count, so the menu never flashes. */
export function useUnreadCount(){return useNotifications().data.unread;}
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
function NotificationTitle({item,onOpen}:{item:Notification;onOpen:()=>void}){
 const title=<>{!item.readAt&&<span className="notification-unread-dot" aria-hidden="true"/>}{item.opportunityTitle??item.recordTitle??item.message}</>;
 return item.opportunityId&&(item.kind==='customer.reply'||!item.href)?<Link className="notification-title" to="/app/opportunities/$id" params={{id:item.opportunityId}} onClick={onOpen}>{title}</Link>:item.href?<a className="notification-title" href={item.href} onClick={onOpen}>{title}</a>:<span className="notification-title">{title}</span>;
}
export function NotificationsPage(){const {data,error,read}=useNotifications(),pages=useAccessPages();const [unreadOnly,setUnreadOnly]=useState(false),[kind,setKind]=useState('all');const items=data.notifications.filter(item=>(!unreadOnly||!item.readAt)&&(kind==='all'||category(item)===kind));
 return <OperatorShell eyebrow="Notifications" title="Notifications inbox" action={<span>{data.unread} unread</span>} restricted={pages.accessClass==="collaborator"} reports={pages.reports}>
  <p>Review recent updates and open the record to take action.</p>
  <section className="operator-surface workbench-form notification-filters"><label><input type="checkbox" checked={unreadOnly} onChange={e=>setUnreadOnly(e.target.checked)}/> Show unread only</label><label>Notification type<select aria-label="Notification type" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All types</option><option value="assignment">Assignments</option><option value="task">Tasks</option><option value="now">Needs attention</option><option value="reply">Customer replies</option><option value="mention">Mentions</option><option value="failure">Delivery outcomes</option></select></label></section>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
  <div className="notification-layout"><section className="operator-surface operator-detail__section">
   {items.length?<ul className="notification-list notification-list--inbox">{items.map(item=><li key={item.id} data-unread={!item.readAt}><NotificationIcon item={item}/><div><NotificationTitle item={item} onOpen={()=>void read(item.id)}/><p>{item.message} · <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time></p></div>{!item.readAt&&<button className="notification-read" onClick={()=>void read(item.id)}>Mark read</button>}</li>)}</ul>:<OperatorState>No {unreadOnly?'unread ':''}notifications.</OperatorState>}
  </section></div>
 <MentionsView/>
 </OperatorShell>;
}
interface Mention {source:'entry'|'task'|'handoff';id:string;kind:string;text:string;author:string|null;at:string;href:string}
const sourceNames:Record<string,string>={'manual.note':'Note','manual.call':'Call log','manual.meeting':'Meeting log',task:'Task note',handoff:'Handoff'};
/** RECORD-017: every entry, task note and handoff that mentions you now. */
function MentionsView(){const [mentions,setMentions]=useState<Mention[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{void fetch('/api/v1/records/mentions',{credentials:'same-origin'}).then(async r=>{if(!r.ok)throw new Error('Mentions could not load.');setMentions(((await r.json()) as {mentions:Mention[]}).mentions);}).catch(e=>setError((e as Error).message));},[]);
 return <section id="mentions" className="operator-surface operator-detail__section"><h2>Mentions</h2>{error?<OperatorState kind="error">{error}</OperatorState>:!mentions?<OperatorState>Loading mentions…</OperatorState>:mentions.length?<ul className="notification-list">{mentions.map(m=><li key={`${m.source}:${m.id}`}><div><p><strong>{sourceNames[m.kind]??'Entry'}</strong>{m.author?` by ${m.author}`:''} · <time dateTime={m.at}>{formatDateTime(m.at)}</time></p><p style={{whiteSpace:'pre-wrap'}}>{m.text}</p><a href={m.href}>Open the mention</a></div></li>)}</ul>:<OperatorState>Nobody has mentioned you yet.</OperatorState>}</section>;
}
