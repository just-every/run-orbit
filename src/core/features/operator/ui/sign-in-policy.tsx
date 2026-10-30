import {useEffect,useState} from 'react';
import {InlineConfirm} from './autosave/inline-confirm';
import {SavedLabel} from './autosave/saved-label';
import {recordsRequest} from './records-api';
import {OperatorState} from './operator-shell';

/** Settings › Team › Sign-in: email sign-in, and for a domain a required provider once one is linked. Requiring one asks
 * once, since its people's current provider sessions end; removing a requirement is one quiet action. */
export function SignInPolicy(){const [data,setData]=useState<any>(),[error,setError]=useState(''),[domain,setDomain]=useState(''),[provider,setProvider]=useState(''),[asking,setAsking]=useState(false),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 async function load(){setData(await recordsRequest('settings/sign-in-policy'));}useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 async function save(name:string,providerId:string|null){setBusy(true);setError('');setSaved(false);try{await recordsRequest('settings/sign-in-policy','PUT',{domain:name,providerId});await load();setAsking(false);setDomain('');setProvider('');setSaved(true);setTimeout(()=>setSaved(false),2000);}catch(e){setError(`Not saved: ${(e as Error).message}`);}finally{setBusy(false);}}
 const cleanDomain=domain.trim().toLowerCase().replace(/^@/,''),providerName=data?.providers.find((p:any)=>p.provider_id===provider)?.provider_id??provider;
 // A domain can require a provider only once one is linked; until then the card is one line.
 return <section className="operator-surface settings-card" aria-labelledby="sign-in-policy"><div className="settings-card__head"><h2 id="sign-in-policy">Sign-in</h2><SavedLabel show={saved}/></div>{error&&<OperatorState kind="error">{error}</OperatorState>}{data&&<><p className="settings-card__line">{data.policies.length?`Email sign-in, with a required provider for ${data.policies.map((p:any)=>p.domain).join(', ')}.`:'Email sign-in.'} Owner email recovery stays on.</p>
  {data.providers.length?<div className="settings-inline-form settings-inline-form--two"><label>Email domain<input type="text" placeholder="your-company.com" value={domain} onChange={e=>{setDomain(e.target.value);setAsking(false);}} onBlur={()=>{if(cleanDomain&&provider)setAsking(true);}}/></label><label>Required provider<select aria-label="Required provider" value={provider} onChange={e=>{setProvider(e.target.value);setAsking(Boolean(cleanDomain&&e.target.value));}}><option value="">Choose a linked provider</option>{data.providers.map((p:any)=><option key={p.provider_id} value={p.provider_id}>{p.provider_id} · {p.issuer}</option>)}</select></label></div>:null}
  {asking&&cleanDomain&&provider?<InlineConfirm busy={busy} sentence={`Require ${providerName} for everyone at @${cleanDomain}? Their current provider sessions end and they sign in again.`} action="Require it" keep="Cancel" onConfirm={()=>void save(cleanDomain,provider)} onKeep={()=>setAsking(false)}/>:null}
  {data.policies.length?<ul className="settings-rows">{data.policies.map((p:any)=><li key={p.domain}><strong>{p.domain} → {p.provider_id}</strong><button className="settings-row__action" disabled={busy} type="button" onClick={()=>void save(p.domain,null)}>Remove requirement</button></li>)}</ul>:null}</>}</section>;
}
