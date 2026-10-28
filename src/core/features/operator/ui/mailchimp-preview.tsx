import {useState} from 'react';
import {recordsRequest} from './records-api';
import {OperatorState} from './operator-shell';

interface Item {contactId:string;name:string;email:string;company:string|null;reason:string;consent:{source:string;basis:string;at:string}|null;action:'send'|'unchanged'|'unsubscribe'|'check'|'none';memberStatus:string|null}
interface Preview {audience:{name:string};fields:string[];digest:string;counts:Record<'subscribed'|'unknown'|'stopped'|'send'|'unchanged'|'unsubscribe'|'check',number>;groups:Record<'subscribed'|'unknown'|'stopped',Item[]>}
interface Result {counts:Record<'sent'|'unchanged'|'unsubscribed'|'checked'|'stoppedInMailchimp'|'refused'|'uncertain'|'remaining',number>;failures:{contactId:string;name:string;message:string}[]}
const fieldLabel=(field:string)=>field==='name'?'First and last name':'Phone';
const actions={send:'Will be added or updated',unchanged:'Already up to date in Mailchimp',unsubscribe:'Will be marked unsubscribed in Mailchimp',check:'Orbit checks Mailchimp and marks any member unsubscribed',none:'Never sent'} as const;
function ConsentForm({item,onSaved}:{item:Item;onSaved:()=>void}){
 const [source,setSource]=useState(''),[basis,setBasis]=useState(''),[confirmed,setConfirmed]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <details className="mailchimp-consent"><summary>Record consent</summary><form className="workbench-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await recordsRequest(`marketing/mailchimp/consents/${item.contactId}`,'POST',{source,basis,confirmed});onSaved();}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}>
  <label>Where they agreed<input required minLength={2} maxLength={120} placeholder="Pricing page newsletter form" value={source} onChange={e=>setSource(e.target.value)}/></label>
  <label>What they agreed to, and when<input required minLength={2} maxLength={300} placeholder="Ticked “Send me product news” on 21 October" value={basis} onChange={e=>setBasis(e.target.value)}/></label>
  <label className="mailchimp-check"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Orbit holds this person’s marketing consent</label>
  {error&&<span role="alert">{error}</span>}<button className="operator-button" disabled={busy||!confirmed}>Record consent</button></form></details>;
}
/** Three groups, and the fields handed over are only the selected ones; the handoff runs exactly the reviewed preview once. */
export function MailchimpPreview({fields}:{fields:string[]}){
 const [chosen,setChosen]=useState<string[]>([]),[preview,setPreview]=useState<Preview>(),[operationId,setOperationId]=useState(''),[result,setResult]=useState<Result>(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);setError('');try{setPreview(await recordsRequest<Preview>('marketing/mailchimp/preview?fields='+chosen.join(',')));setOperationId(crypto.randomUUID());}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function handOff(){if(!preview)return;setBusy(true);setError('');try{setResult(await recordsRequest<Result>('marketing/mailchimp/handoffs','POST',{fields:preview.fields,previewDigest:preview.digest,operationId}));setPreview(undefined);window.dispatchEvent(new Event('orbit-products-changed'));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const work=preview?preview.counts.send+preview.counts.unsubscribe+preview.counts.check:0;
 const group=(key:'subscribed'|'unknown'|'stopped',title:string,note:string)=>preview&&<section className="mailchimp-group" data-group={key} aria-labelledby={`mailchimp-${key}`}><h4 id={`mailchimp-${key}`}>{title} · {preview.counts[key]}</h4><p>{note}</p>
  <ul>{preview.groups[key].map(item=><li key={item.contactId}><strong>{item.name}</strong> · {item.email}{item.company?` · ${item.company}`:''}<br/>{key==='subscribed'&&item.consent?<>Consent: {item.consent.source} · {item.consent.basis}</>:item.reason}<br/><span className="mailchimp-action">{actions[item.action]}</span>{key==='unknown'&&<ConsentForm item={item} onSaved={()=>void load()}/>}</li>)}</ul>
  {preview.counts[key]>preview.groups[key].length&&<p>Showing {preview.groups[key].length} of {preview.counts[key]}.</p>}{!preview.counts[key]&&<p>None.</p>}</section>;
 return <div className="mailchimp-preview"><h3>Preview the handoff</h3>
  <fieldset><legend>Fields handed over besides the email address</legend>{fields.map(field=><label className="mailchimp-check" key={field}><input type="checkbox" checked={chosen.includes(field)} onChange={e=>{setChosen(e.target.checked?[...chosen,field]:chosen.filter(item=>item!==field));setPreview(undefined);}}/>{fieldLabel(field)}</label>)}{!fields.length&&<p>This audience has no name or phone fields.</p>}<p>Orbit always sends the email address and the consent source and basis, in the field ORBITCONS. It never sends notes, deals or other fields.</p></fieldset>
  <div className="workbench-actions"><button type="button" className="operator-button" disabled={busy} onClick={()=>void load()}>Preview handoff</button></div>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
  {result&&<OperatorState>Handoff finished: {result.counts.sent} added or updated, {result.counts.unchanged} already up to date, {result.counts.unsubscribed} marked unsubscribed, {result.counts.checked} stopped contacts checked{result.counts.stoppedInMailchimp?`, ${result.counts.stoppedInMailchimp} already stopped in Mailchimp and now stopped in Orbit`:''}{result.counts.remaining?`. ${result.counts.remaining} left: preview again to continue`:''}.{result.failures.length?<ul>{result.failures.map(failure=><li key={failure.contactId}>{failure.name}: {failure.message}</li>)}</ul>:null}</OperatorState>}
  {preview&&<><p>Audience “{preview.audience.name}”. {preview.fields.length?`Fields: email, ${preview.fields.map(fieldLabel).join(', ').toLowerCase()} and consent.`:'Fields: email and consent only.'}</p>
   <div className="mailchimp-groups">{group('subscribed','Subscribed','Recorded marketing consent, with its source and basis. Only these contacts are handed to Mailchimp.')}{group('unknown','Unknown','No consent recorded in Orbit. Never sent until someone records consent the person gave.')}{group('stopped','Stopped','Unsubscribed, permanently bounced or Do not contact. Never sent; an existing Mailchimp member is marked unsubscribed.')}</div>
   <div className="workbench-actions"><button type="button" className="operator-button" disabled={busy||!work} onClick={()=>void handOff()}>{!work?'Nothing to hand off':preview.counts.send?`Hand off ${preview.counts.send} subscribed ${preview.counts.send===1?'contact':'contacts'}`:'Update stopped contacts in Mailchimp'}</button></div></>}
 </div>;
}
