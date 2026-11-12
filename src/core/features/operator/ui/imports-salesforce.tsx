import {useEffect,useState} from 'react';
import {recordsRequest} from './records-api';
import type {ImportOwner} from '../../imports/owners';
/** Salesforce credentials stay in sealed installation custody; browser state is transient. */
export function SalesforceImport({owners,onReview}:{owners:ImportOwner[];onReview:(review:any)=>void}){
 const [config,setConfig]=useState<any>(),[pull,setPull]=useState<any>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[mapping,setMapping]=useState<Record<string,string|null>>({}),[custom,setCustom]=useState<Record<string,string[]>>({}),[clientId,setClientId]=useState(''),[secret,setSecret]=useState(''),[sandbox,setSandbox]=useState(true),[consent,setConsent]=useState(false);
 const query=typeof window==='undefined'?null:new URLSearchParams(window.location.search),callbackError=query?.get('salesforceError');
 async function refresh(){setConfig(await recordsRequest('imports/salesforce'));}
 useEffect(()=>{void refresh().catch(e=>setError(e.message));},[]);
 async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function open(id:string){setPull(await recordsRequest(`imports/salesforce/pulls/${id}`));setMapping({});setCustom({});}
 async function advance(){await run(async()=>{try{await recordsRequest(`imports/salesforce/pulls/${pull.id}/advance`,'POST',{});}finally{await open(pull.id);await refresh();}});}
 return <details className="crm-panel crm-salesforce" open={!!query?.has('salesforce')||!!callbackError||undefined}>
  <summary>Salesforce OAuth · Accounts and Contacts</summary>
  <h2>Connect Salesforce</h2>
  <p>This connection reads Accounts and Contacts only, up to 1,000 of each per pull. Leads, Opportunities, files, activity, record types and automation are not migrated here.</p>
  <p>In Salesforce, create an external client app with OAuth enabled. Register the callback below, enable PKCE, and select only “Manage user data via APIs” and “Perform requests at any time”. Salesforce uses a broad API grant: authorize a user whose profile and permission sets allow only the reads you intend. Orbit sends no Salesforce record writes.</p>
  {config?.callback?<label>Salesforce callback address<input readOnly value={config.callback}/></label>:null}
  {error||callbackError?<p role="alert">{error||callbackError}</p>:null}
  {query?.get('salesforce')==='connected'?<p role="status">Salesforce connected. Start an Account and Contact pull below.</p>:null}
  {config?.available===false?<p role="status">Configure the installation encryption key before connecting Salesforce.</p>:null}
  <form aria-label="Salesforce connection" onSubmit={event=>{event.preventDefault();void run(async()=>{const result=await recordsRequest<any>('imports/salesforce/oauth/start','POST',{clientId,clientSecret:secret,sandbox});setSecret('');window.location.assign(result.authorizationUrl);});}}>
   <label>Salesforce client ID<input required autoComplete="off" value={clientId} onChange={event=>setClientId(event.target.value)}/></label>
   <label>Salesforce client secret<input required type="password" autoComplete="new-password" value={secret} onChange={event=>setSecret(event.target.value)}/></label>
   <label><input type="checkbox" checked={sandbox} onChange={event=>setSandbox(event.target.checked)}/>Use a Salesforce sandbox</label>
   <label><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>I authorize this installation to read the permitted Accounts and Contacts.</label>
   <button disabled={busy||!consent||!config?.available}>Authorize Salesforce</button>
  </form>
  {config?.connections?.map((connection:any)=><section key={connection.id} aria-label={`Salesforce organization ${connection.org_id}`}><h3>Organization {connection.org_id}</h3><p>{connection.instance}</p>
   <button disabled={busy} onClick={()=>void run(async()=>{const value=await recordsRequest<any>(`imports/salesforce/connections/${connection.id}/pulls`,'POST',{});await open(value.id);await refresh();})}>Read Account and Contact metadata</button>
   <button disabled={busy} onClick={()=>void run(async()=>{if(!window.confirm('Disconnect Salesforce and withdraw its saved pulls and reviews?'))return;await recordsRequest(`imports/salesforce/connections/${connection.id}/disconnect`,'POST',{confirmed:true});setPull(undefined);await refresh();})}>Disconnect Salesforce</button>
  </section>)}
  {config?.pulls?.length?<section aria-label="Saved Salesforce pulls"><h3>Saved pulls</h3>{config.pulls.map((item:any)=><p key={item.id}>{item.state} · {item.page} saved pages <button disabled={busy} onClick={()=>void run(()=>open(item.id))}>Open Salesforce pull {item.id.slice(-6)}</button></p>)}</section>:null}
  {pull?<section aria-label="Salesforce mapping"><h3>Account and Contact mapping</h3><p role="status">Pull state: {pull.state} · {pull.page} saved pages. Accounts read: {pull.read.Account??0} of {pull.counts.Account??'unknown'}. Contacts read: {pull.read.Contact??0} of {pull.counts.Contact??'unknown'}.</p>
   {pull.error?<p role="alert">{pull.error}</p>:null}
   {['reading','stopped'].includes(pull.state)?<button disabled={busy} onClick={()=>void advance()}>{pull.state==='stopped'?'Resume Salesforce pull':'Read next Salesforce page'}</button>:null}
   <p>Account IDs become company source IDs. Contact IDs stay contact source IDs; AccountId supplies each exact company link. Existing records keep their current details. New contacts are Do not contact; this migration grants no sending permission.</p>
   {['Account','Contact'].map(object=><fieldset key={object}><legend>{object} available fields</legend><ul>{pull.metadata.fields?.[object]?.map((field:any)=><li key={field.name}>{field.name} · {field.type}{field.supported?'':' · unsupported'}{field.custom&&field.supported?<label><input type="checkbox" checked={(custom[object]??[]).includes(field.name)} onChange={event=>setCustom({...custom,[object]:event.target.checked?[...custom[object]??[],field.name]:(custom[object]??[]).filter(name=>name!==field.name)})}/>Import {object}.{field.name} as a custom field</label>:null}</li>)}</ul></fieldset>)}
   <section aria-label="Salesforce field diagnostics"><h4>Unavailable fields and unsupported metadata</h4><ul>{pull.metadata.diagnostics?.map((diagnostic:any,index:number)=><li key={index}><strong>{diagnostic.source}</strong>: {diagnostic.reason} {diagnostic.exportStep}</li>)}</ul></section>
   {pull.owners?.length?<fieldset><legend>Review separate Salesforce owners</legend><p>Choose existing active full operators separately for Account and Contact OwnerId values. No invitation or new access is granted.</p>{pull.owners.map((owner:any)=><label key={owner.value}>{owner.value} · {owner.count} rows<select aria-label={`Salesforce owner for ${owner.value}`} value={Object.hasOwn(mapping,owner.value)?mapping[owner.value]??'':'unreviewed'} onChange={event=>setMapping({...mapping,[owner.value]:event.target.value||null})}><option value="unreviewed" disabled>Choose an owner or Unassigned</option><option value="">Unassigned</option>{owners.map(operator=><option key={operator.id} value={operator.id}>{operator.display_name}</option>)}</select></label>)}</fieldset>:null}
   {pull.state==='ready'?<button disabled={busy||pull.owners.some((owner:any)=>!Object.hasOwn(mapping,owner.value))} onClick={()=>void run(async()=>onReview(await recordsRequest(`imports/salesforce/pulls/${pull.id}/dry-run`,'POST',{owners:mapping,customFields:custom})))}>Save Salesforce dry run</button>:null}
  </section>:null}
 </details>;
}
