import {ZoomSettings} from './zoom-settings';
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {BookingRecipe} from './booking-recipe';
import {CallingSettings} from './calling-settings';
import {MailchimpSettings} from './mailchimp-settings';
import {OperatorState} from './operator-shell';
import {recordsRequest} from './records-api';
import {SlackSettings} from './slack-settings';
import {useOperatorResource} from './use-operator-resource';
import type {ConnectedProduct} from '../../settings/connected-products';

const stateWords={connected:'Connected','unresolved-setup':'Needs attention: connection setup',receiving:'Receiving bookings','awaiting-delivery':'Awaiting first booking'} as const;
interface Row {connected:boolean|null;key:string;name:string;job:string;state:string;action:string;panel:ReactNode}

async function readProducts(){
 const response=await fetch('/api/v1/settings/products');if(!response.ok)throw new Error('Connected products could not load.');
 // Only the installation owner reads calling; for anyone else the Twilio row says who sets it up.
 const calls=await recordsRequest<{configured:boolean}>('calls/settings').then(result=>result.configured,()=>null);
 return {products:(await response.json() as {products:ConnectedProduct[]}).products,calls};
}

/** Settings › Integrations: group products by their real connection state, with one row per product and one
 * action that opens that product's setup in place under the row. */
export function ConnectedProducts({operators}:{operators:any[]}){
 const resource=useOperatorResource('connected-products',useCallback(readProducts,[])),[open,setOpen]=useState('');
 // Slack and Mailchimp setup announce a change, so a row's state follows its setup without a reload.
 const reload=useRef(resource.reload);reload.current=resource.reload;
 useEffect(()=>{const changed=()=>reload.current();window.addEventListener('orbit-products-changed',changed);return()=>window.removeEventListener('orbit-products-changed',changed);},[]);
 const product=(name:string)=>resource.data?.products.find(item=>item.products.includes(name));
 const rows:Row[]=[];
 for(const [key,name] of [['slack','Slack'],['calendly','Calendly'],['calcom','Cal.com'],['mailchimp','Mailchimp'],['zoom','Zoom']] as const){
  const item=product(name);if(!item)continue;
  const live=item.state==='connected'||item.state==='receiving',booking=key==='calendly'||key==='calcom';
  rows.push({connected:live,key,name,job:item.job,state:stateWords[item.state],action:live?'Open':booking?'Set up':'Connect',
   panel:key==='zoom'?<ZoomSettings/>:key==='slack'?<SlackSettings operators={operators}/>:key==='mailchimp'?<MailchimpSettings/>:<BookingSetup vendor={key==='calendly'?'calendly':'calcom'} onRefresh={resource.reload}/>});
 }
 if(resource.data)rows.push({connected:resource.data.calls,key:'twilio',name:'Twilio',job:'Calls',state:resource.data.calls===null?'Check with the installation owner':resource.data.calls?'Connected':'Not connected',action:resource.data.calls===null?'':resource.data.calls?'Open':'Connect',panel:<CallingSettings/>});
 return <>
  {resource.error?<OperatorState kind="error">{resource.error.message}</OperatorState>:null}
  {!resource.data&&!resource.error?<OperatorState>Loading connections…</OperatorState>:null}
  {[true,false,null].map(connected=>{
   const group=rows.filter(row=>row.connected===connected),id=connected===null?'integrations-status-unavailable':connected?'integrations-connected':'integrations-not-connected';
   return group.length?<section key={id} className="operator-surface settings-card" aria-labelledby={id}><h2 id={id}>{connected===null?'Connection status unavailable':connected?'Connected to Orbit':'Not connected'}</h2>
    <ul className="settings-rows integration-rows">{group.map(row=><li key={row.key} data-product={row.key}>
     <div className="integration-row"><div><strong>{row.name}</strong><p>{row.job} · {row.state}</p></div>
      {row.action?<button type="button" className="integration-row__action" aria-expanded={open===row.key} aria-controls={`integration-${row.key}`} aria-label={`${row.action} ${row.name}`} onClick={()=>setOpen(open===row.key?'':row.key)}>{row.action}</button>:null}</div>
     {open===row.key?<div className="integration-panel" id={`integration-${row.key}`}>{row.panel}</div>:null}
    </li>)}</ul>
   </section>:null;
  })}
 </>;
}

/** Calendly and Cal.com sign their deliveries with a website and app source's secret, so their setup uses one. */
function BookingSetup({vendor,onRefresh}:{vendor:'calendly'|'calcom';onRefresh:()=>void}){
 const load=useCallback(async()=>{const response=await fetch('/api/v1/sources');if(!response.ok)throw new Error('Sources could not load.');return (await response.json() as {sources:{id:string;name:string;type:string;enabled:number}[]}).sources.filter(source=>source.type==='signed_webhook'&&source.enabled);},[]);
 const sources=useOperatorResource('booking-sources',load),[chosen,setChosen]=useState('');
 if(sources.error)return <OperatorState kind="error">{sources.error.message}</OperatorState>;
 if(!sources.data)return <OperatorState>Loading sources…</OperatorState>;
 if(!sources.data.length)return <p>Bookings arrive through a website and app source: <a href="/app/settings/capture">connect one under Settings › Capture</a>, then return here.</p>;
 const id=chosen||sources.data[0]!.id;
 return <>{sources.data.length>1?<label>Source<select value={id} onChange={event=>setChosen(event.target.value)}>{sources.data.map(source=><option key={source.id} value={source.id}>{source.name}</option>)}</select></label>:null}
  <BookingRecipe key={id+vendor} endpoint={`${window.location.origin}/api/v1/signals/${id}`} sourceId={id} initialVendor={vendor} onRefresh={onRefresh}/></>;
}
