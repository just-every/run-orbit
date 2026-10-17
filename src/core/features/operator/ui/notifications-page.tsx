import { useEffect,useState } from 'react';
import { Link } from '@tanstack/react-router';
import { OperatorShell,OperatorState } from './operator-shell';
import {formatDate} from './formatters';
import './ownership-notifications.css';
interface OwnershipRecord {kind:string;id:string;name:string;href:string;previousOwnerName:string|null}
interface Notification {records?:OwnershipRecord[];id:string;href:string|null;opportunityId:string|null;opportunityTitle:string|null;kind:string;message:string;createdAt:string;readAt:string|null}
export function useNotifications(){
 const [data,setData]=useState<{notifications:Notification[];unread:number}>({notifications:[],unread:0}),[error,setError]=useState('');
 useEffect(()=>{let active=true;async function load(){try{const response=await fetch('/api/v1/notifications');if(!response.ok)throw new Error('Notifications could not load.');const next=await response.json() as typeof data;if(active){setData(next);setError('');}}catch(e){if(active)setError(e instanceof Error?e.message:'Notifications unavailable.');}}void load();const timer=setInterval(()=>void load(),4000);return()=>{active=false;clearInterval(timer);};},[]);
 async function read(id:string){const response=await fetch(`/api/v1/notifications/${id}/read`,{method:'POST'});if(!response.ok){setError('Could not mark the notification read.');return;}setData(old=>({notifications:old.notifications.map(item=>item.id===id?{...item,readAt:new Date().toISOString()}:item),unread:Math.max(0,old.unread-(old.notifications.find(item=>item.id===id)?.readAt?0:1))}));}
 return {data,error,read};
}
export function NotificationCount(){const {data,error}=useNotifications();return <Link to="/app/notifications" aria-label={error?'Notifications unavailable':`${data.unread} unread notifications`}>Notifications{data.unread?` (${data.unread})`:''}</Link>;}
/** Ink line icons, one per category: a flag for NOW, a speech bubble for a reply, an envelope with a mark for delivery. */
const notificationIconPaths={
 owner:<><circle cx="12" cy="11" r="4"/><path d="M4 27v-3a8 8 0 0 1 16 0v3M24 10v10M19 15h10"/></>,
 task:<><rect x="6" y="5" width="20" height="23" rx="3"/><path d="m10 16 4 4 8-9"/></>,
 now:<><path d="M8 27V5"/><path d="M8 6h14l-3 5 3 5H8"/></>,
 reply:<><path d="M5 8.5A3.5 3.5 0 0 1 8.5 5h15A3.5 3.5 0 0 1 27 8.5v9a3.5 3.5 0 0 1-3.5 3.5H14l-6 5v-5h0.5A3.5 3.5 0 0 1 5 17.5z"/><path d="M11 11.5h10M11 15h6"/></>,
 failure:<><rect x="4" y="8" width="20" height="15" rx="2.5"/><path d="m4.5 9.5 9.5 7 9.5-7"/><circle cx="24" cy="8" r="4.5" fill="var(--ob-card)"/><path d="M24 6v2.5M24 10.2v.1"/></>,
};
function category(item:Notification){return item.kind==='owner.assigned'?'owner':item.kind.startsWith('task.')?'task':item.kind==='opportunity.now'?'now':item.kind==='customer.reply'?'reply':'failure';}
function NotificationIcon({item}:{item:Notification}){return <svg className="notification-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{notificationIconPaths[category(item)]}</svg>;}
/** Retained notification branch layout, populated only with real deployment events. */
export function NotificationsPage(){const {data,error,read}=useNotifications();const [unreadOnly,setUnreadOnly]=useState(false),[kind,setKind]=useState('all'),[selectedId,setSelectedId]=useState<string|null>(null);const items=data.notifications.filter(item=>(!unreadOnly||!item.readAt)&&(kind==='all'||category(item)===kind)),selected=data.notifications.find(item=>item.id===selectedId);
 return <OperatorShell eyebrow="Notifications" title="Notifications inbox" action={<span>{data.unread} unread</span>}>
  <p>Review recent updates and open the linked record to take action.</p>
  <section className="operator-surface workbench-form notification-filters"><label><input type="checkbox" checked={unreadOnly} onChange={e=>setUnreadOnly(e.target.checked)}/> Show unread only</label><label>Notification type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All types</option><option value="task">Tasks</option><option value="owner">Owner assignments</option><option value="now">Needs attention</option><option value="reply">Customer replies</option><option value="failure">Delivery outcomes</option></select></label></section>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
  <div className={`notification-layout${selected?' has-selection':''}`}><section className="operator-surface operator-detail__section">
   {items.length?<ul className="notification-list">{items.map(item=><li key={item.id} className={item.readAt?'is-read':'is-unread'}><NotificationIcon item={item}/><div><button className="notification-title" onClick={()=>{setSelectedId(item.id);void read(item.id);}}>{item.opportunityTitle??(item.kind==='owner.assigned'?'Records assigned to you':item.message)}</button><p>{item.message}</p><p><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>{!item.readAt?' · Unread':''}</p>{item.kind==='owner.assigned'?<OwnershipLinks records={item.records??[]}/>:item.href?<a href={item.href} onClick={()=>void read(item.id)}>Open task</a>:item.opportunityId&&<Link to="/app/opportunities/$id" params={{id:item.opportunityId}} onClick={()=>void read(item.id)}>Open opportunity</Link>}</div>{!item.readAt&&<button onClick={()=>void read(item.id)}>Mark read</button>}</li>)}</ul>:<OperatorState>No {unreadOnly?'unread ':''}notifications.</OperatorState>}
  </section>{selected&&<aside className="operator-surface operator-detail__section notification-detail"><button onClick={()=>setSelectedId(null)} aria-label="Close notification details">Close</button><NotificationIcon item={selected}/><p className="operator-eyebrow">{category(selected)==='owner'?'Owner assignment':category(selected)==='now'?'Needs attention':category(selected)==='reply'?'Customer reply':category(selected)==='task'?'Task update':'Delivery outcome'}</p><h2>{selected.opportunityTitle??(selected.kind==='owner.assigned'?'Records assigned to you':selected.message)}</h2><p>{selected.message}</p><dl><dt>Recorded</dt><dd><time dateTime={selected.createdAt}>{formatDate(selected.createdAt)}</time></dd><dt>Read state</dt><dd>{selected.readAt?'Read':'Unread'}</dd></dl>{selected.kind==='owner.assigned'?<OwnershipLinks records={selected.records??[]}/>:selected.href?<a className="operator-button" href={selected.href}>View task</a>:selected.opportunityId&&<Link className="operator-button" to="/app/opportunities/$id" params={{id:selected.opportunityId}}>View opportunity</Link>}</aside>}</div>
 </OperatorShell>;
}

function OwnershipLinks({records}:{records:OwnershipRecord[]}){return <ul className="notification-owned-records">{records.map(record=><li key={`${record.kind}:${record.id}`}><a href={record.href}>{record.name}</a><span> · Previous owner: {record.previousOwnerName??'Unassigned'}</span></li>)}</ul>;}
