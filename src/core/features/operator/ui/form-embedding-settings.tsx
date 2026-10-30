import {useEffect,useState} from 'react';
import {ActionTooltip} from './action-tooltip';
import {InlineConfirm} from './autosave/inline-confirm';
import {SavedLabel} from './autosave/saved-label';
import {saveRequest} from './record/record-api';
import './record/menu-button.css';

/** A website as the origin a form may be embedded on: https and a host, no path. */
function origin(text:string){try{const url=new URL(text.trim().includes('://')?text.trim():`https://${text.trim()}`);return url.protocol==='https:'&&url.pathname==='/'&&!url.search&&!url.hash?url.origin:null;}catch{return null;}}

/** Settings › Forms › Websites that may embed your forms: adding one (Enter) or removing one asks once, then saves the
 * list; there is no Save button. */
export function FormEmbeddingSettings(){
 const [origins,setOrigins]=useState<string[]|null>(null),[typed,setTyped]=useState(''),[asking,setAsking]=useState<{add?:string;remove?:string}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 useEffect(()=>{void fetch('/api/v1/settings/form-embedding').then(async response=>{if(!response.ok)throw Error('Embedding settings could not load.');setOrigins((await response.json() as {origins:string[]}).origins);}).catch(e=>setError(e.message));},[]);
 async function save(next:string[]){setBusy(true);setError('');setSaved(false);try{await saveRequest('settings/form-embedding','PUT',{origins:next});setOrigins(next);setAsking(null);setTyped('');setSaved(true);setTimeout(()=>setSaved(false),2000);}catch(e){setError(`Not saved: ${(e as Error).message}`);}finally{setBusy(false);}}
 function add(){const value=origin(typed);if(!value){setError('Enter a website such as https://www.your-company.com, without a path.');return;}setError('');if(origins?.includes(value)){setTyped('');return;}setAsking({add:value});}
 return <section id="form-embedding" className="operator-surface settings-card" aria-labelledby="form-embedding-title"><div className="settings-card__head"><h2 id="form-embedding-title">Websites that may embed your forms</h2><SavedLabel show={saved}/></div>
  {origins?.length?<ul className="settings-rows">{origins.map(site=><li key={site}><strong>{site}</strong><ActionTooltip label={`Remove ${site}`}><button type="button" className="r-chip-remove settings-row__remove" onClick={()=>setAsking({remove:site})}><span aria-hidden="true">×</span></button></ActionTooltip></li>)}</ul>:origins?<p className="settings-card__line">No website may embed your forms yet.</p>:null}
  {asking?.remove?<InlineConfirm busy={busy} sentence={`Stop ${asking.remove} embedding your forms?`} action="Remove" keep="Keep it" onConfirm={()=>void save(origins!.filter(site=>site!==asking.remove))} onKeep={()=>setAsking(null)}/>:null}
  <label className="r-field"><span className="r-label">Add a website</span><input type="url" inputMode="url" placeholder="https://www.your-company.com" value={typed} onChange={event=>{setTyped(event.target.value);setError('');}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();add();}}}/></label>
  {asking?.add?<InlineConfirm busy={busy} sentence={`Let ${asking.add} embed your forms?`} action="Allow" keep="Cancel" onConfirm={()=>void save([...(origins??[]),asking.add!])} onKeep={()=>setAsking(null)}/>:null}
  {error?<p className="r-fail" role="alert">{error}</p>:null}
 </section>;
}
