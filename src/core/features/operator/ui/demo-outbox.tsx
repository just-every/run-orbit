import {useEffect,useState} from 'react';
import {formatDateTime} from './formatters';

interface Captured{id:string;createdAt:string;to:string[];subject:string;body:string}

/** In the demo, approved mail goes nowhere: this lists what was captured instead, so the send can be read back. */
export function DemoOutbox({reloadKey}:{reloadKey?:string}){
 const [messages,setMessages]=useState<Captured[]>(),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/v1/workbench/demo-outbox').then(async response=>{if(!response.ok)throw new Error('The demo outbox could not load.');return response.json() as Promise<{messages:Captured[]}>;}).then(result=>{if(active)setMessages(result.messages);},caught=>{if(active)setError((caught as Error).message);});return()=>{active=false;};},[reloadKey]);
 return <section className="operator-surface" aria-label="Demo outbox"><h2>Demo outbox</h2>
  <p>This demo emails no one. Each message you approve is captured here instead, exactly as it would have been sent.</p>
  {error&&<p role="alert">{error}</p>}
  {messages&&!messages.length&&<p>Nothing captured yet.</p>}
  {messages?.map(message=><details key={message.id}><summary>To {message.to.join(', ')} · {message.subject} · {formatDateTime(message.createdAt)}</summary><p style={{whiteSpace:'pre-wrap'}}>{message.body}</p></details>)}
 </section>;
}
