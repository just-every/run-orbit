import {SourceRecipes,CopyText,type RecipeContext} from './source-recipes';
import { useCallback,useState,type FormEvent } from 'react';
import {RecordSelection} from './record-selection';
import type {RecordKind} from './records-api';
import { UnlinkedReplies } from './unlinked-replies';
import { OperatorShell } from './operator-shell';
import { useOperatorResource } from './use-operator-resource';
interface Source {type:string;id:string;name:string;enabled:number;has_signing_secret:number;last_accepted_at:string|null;last_error:string|null;rejected_count:number}
interface Unlinked {id:string;source_id:string;type:string;subject:string;occurred_at:string;reason:string}
async function api<T>(path:string,init?:RequestInit):Promise<T>{const response=await fetch(`/api/v1/sources${path}`,init);const result=await response.json() as T&{error?:string};if(!response.ok)throw new Error(result.error??'Source request failed.');return result;}
export function SourcesPage(){
 const load=useCallback(async()=>{const [sources,unlinked,context]=await Promise.all([api<{sources:Source[];configured:boolean}>(''),api<{signals:Unlinked[]}>('/unlinked'),api<RecipeContext>('/recipe-context')]);return {...sources,...unlinked,context};},[]);
 const [reveal,setReveal]=useState<{id:string;secret:string}|null>(null),[selected,setSelected]=useState(''),[contact,setContact]=useState(''),[status,setStatus]=useState('');
 const [recordKind,setRecordKind]=useState<RecordKind>('contact');
 const resource=useOperatorResource('sources',load),[error,setError]=useState(''),[saving,setSaving]=useState(false),[selection,setSelection]=useState<Unlinked|null>(null);
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,values=new FormData(form);setSaving(true);setError('');try{const id=crypto.randomUUID();const result=await api<{secret:string}>(`/${id}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({name:values.get('name'),enabled:true})});setReveal({id,secret:result.secret});setSelected(id);form.reset();resource.reload();}catch(error){setError((error as Error).message);}finally{setSaving(false);}}
 async function toggle(source:Source){setSaving(true);setError('');try{await api(`/${source.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:!source.enabled})});resource.reload();}catch(error){setError((error as Error).message);}finally{setSaving(false);}}
 async function renewSecret(source:Source){setSaving(true);setError('');setStatus('');try{const result=await api<{secret:string}>(`/${source.id}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({name:source.name,enabled:!source.has_signing_secret||Boolean(source.enabled)})});setReveal({id:source.id,secret:result.secret});setSelected(source.id);resource.reload();}catch(error){setError((error as Error).message);}finally{setSaving(false);}}
 async function test(){setSaving(true);setError('');try{await api(`/${selected}/test`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contactId:contact||resource.data?.context.contacts[0]?.id})});setStatus('Test event received. Your source is connected; test events do not change customer scores or the brief.');resource.reload();}catch(error){setError((error as Error).message);}finally{setSaving(false);}}
 async function link(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!selection)return;const values=new FormData(event.currentTarget);setSaving(true);setError('');try{await api(`/unlinked/${selection.id}/link`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:values.get('type'),id:values.get('id')})});setSelection(null);resource.reload();}catch(error){setError(error instanceof Error?error.message:'Signal could not be linked.');}finally{setSaving(false);}}
 const selectedSource=resource.data?.sources.find(source=>source.id===selected);
 return <OperatorShell eyebrow="Customer evidence" title="Signal sources">
  <section className="operator-surface operator-detail__section"><h2>Connected sources</h2><p>Review delivery and resolve customer events that need a record match.</p>
   {resource.loading&&<p>Loading sources…</p>}{(error||resource.error)&&<p role="alert">{error||resource.error?.message}</p>}
   {resource.data?.sources.length===0&&<p>No external sources connected yet.</p>}
   {resource.data?.sources.filter(source=>source.type==='signed_webhook').map(source=><article key={source.id}>
    <h3>{source.name}</h3>
    <p>{!source.has_signing_secret?'Needs reconnect · No signing secret':!resource.data?.configured?'Source security unavailable':source.enabled?'Connected · Signing secret ••••••••':'Disabled · Signing secret ••••••••'}</p>
    {!source.has_signing_secret&&<><p>Signing secrets are excluded from archives. Reconnect this source to generate a new secret, then copy it into your tool’s private settings.</p><button className="orbit-button orbit-button--primary" type="button" disabled={saving||!resource.data?.configured} onClick={()=>void renewSecret(source)}>Reconnect source</button></>}
    <button type="button" aria-pressed={selected===source.id} onClick={()=>setSelected(source.id)}>Open recipes</button>
    <details><summary>Advanced</summary>
     {Boolean(source.has_signing_secret)&&<><button type="button" disabled={saving||!resource.data?.configured} onClick={()=>void toggle(source)}>{source.enabled?'Disable source':'Enable source'}</button><p>Rotate this source's signing secret if it has been exposed. Copy the new secret into your connected tools; old signatures stop working immediately. Other sources keep their own secrets.</p><button type="button" disabled={saving||!resource.data?.configured} onClick={()=>void renewSecret(source)}>Rotate signing secret</button></>}
     <p>Last accepted: {source.last_accepted_at??'No events yet'} · Rejected: {source.rejected_count}</p>{source.last_error&&<p>{source.last_error}</p>}<code>{source.id}</code>
    </details>
   </article>)}
   {reveal&&<section role="status"><h3>Save your signing secret now</h3><p>This is its only display. Reloading hides it. Keep it in your tool's private settings.</p><code data-testid="source-secret" style={{overflowWrap:'anywhere'}}>{reveal.secret}</code><CopyText text={reveal.secret} label="Copy secret"/><button type="button" onClick={()=>setReveal(null)}>I saved it</button></section>}
   {status&&<p role="status">{status} <a href="/app">Open NOW</a></p>}
   {selected&&resource.data&&<><p>Recipes for <strong>{selectedSource?.name}</strong></p><SourceRecipes sourceId={selected} context={resource.data.context} onRefresh={resource.reload}/><form className="workbench-form" onSubmit={e=>{e.preventDefault();void test();}}><label>Test event customer<select value={contact||resource.data.context.contacts[0]?.id||''} onChange={e=>setContact(e.target.value)}>{resource.data.context.contacts.map(c=><option value={c.id} key={c.id}>{c.name} · {c.email}</option>)}</select></label><button disabled={saving||!selectedSource?.enabled||!selectedSource.has_signing_secret||!resource.data?.configured||!resource.data.context.contacts.length}>Send test event</button>{selectedSource&&!selectedSource.has_signing_secret?<p>Reconnect this source before sending a test event.</p>:selectedSource&&!selectedSource.enabled&&<p>Enable this source before sending a test event.</p>}{!resource.data.context.contacts.length&&<a href="/app/new">Add your first customer</a>}</form></>}

  </section>
  <div className="operator-detail__columns"><section className="operator-surface operator-detail__section"><h2>Unlinked review</h2><p>Events stay out of scores until a record is identified. Missing visitor identity consent cannot be bypassed here.</p>
   {resource.data?.signals.length===0&&<p>All customer events are linked.</p>}
   {resource.data?.signals.map(signal=><article className="operator-timeline__entry" key={signal.id} id={`unlinked-${signal.id}`}><h3>{signal.subject||signal.type}</h3><p>{signal.source_id} · {new Date(signal.occurred_at).toLocaleString()}</p><p>{signal.reason}</p><button className="orbit-button orbit-button--secondary" onClick={()=>setSelection(signal)}>Review record link</button></article>)}
   {selection&&<form className="workbench-form" onSubmit={link}><h3>Link {selection.subject}</h3><label>Record type<select name="type" value={recordKind} onChange={e=>setRecordKind(e.target.value as RecordKind)}><option value="contact">Contact</option><option value="company">Company</option><option value="opportunity">Opportunity</option></select></label><RecordSelection kind={recordKind}/><button className="orbit-button orbit-button--primary" disabled={saving}>Confirm link</button><button type="button" className="orbit-button orbit-button--quiet" onClick={()=>setSelection(null)}>Cancel</button></form>}
  </section><section className="operator-surface operator-detail__section"><h2>Connect a source</h2>{resource.data?(!resource.data?.configured?<p>Source security is unavailable. Run setup again before connecting a source.</p>:<form className="workbench-form" onSubmit={save}><label>Display name<input name="name" required maxLength={200}/></label><p>Orbit generates your private signing secret when you connect.</p><button className="orbit-button orbit-button--primary" disabled={saving}>{saving?'Connecting…':'Connect source'}</button></form>):null}</section></div>
 <UnlinkedReplies/>
 </OperatorShell>;
}
