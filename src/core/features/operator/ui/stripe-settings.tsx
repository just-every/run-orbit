import {useCallback,useState} from 'react';
import {InlineConfirm} from './autosave/inline-confirm';
import {formatDateTime} from './formatters';
import {OperatorState} from './operator-shell';
import {recordsRequest} from './records-api';
import {useOperatorResource} from './use-operator-resource';
import './stripe-settings.css';

interface StripeStatus {
 state:'connected'|'paused'|'disconnected';owner:boolean;checkedAt:string|null;
 lastEventAt:string|null;webhookUrl:string|null;reason:string|null;
}
const stateWords={connected:'Connected · Stripe test mode',paused:'Paused · needs attention',disconnected:'Not connected · unresolved setup'} as const;

/** The owner connects a Stripe test account; every full operator can inspect its actual source state. */
export function StripeSettings(){
 const load=useCallback(()=>recordsRequest<StripeStatus>('settings/stripe'),[]);
 const resource=useOperatorResource('stripe-settings',load),data=resource.data;
 const [apiKey,setApiKey]=useState(''),[webhookSecret,setWebhookSecret]=useState('');
 const [busy,setBusy]=useState(false),[asking,setAsking]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function change(action:'connect'|'disconnect'){
  if(busy)return;
  const credentials={apiKey:apiKey.trim(),webhookSecret:webhookSecret.trim()};
  setApiKey('');setWebhookSecret('');setBusy(true);setError('');setNotice('');
  try{
   await recordsRequest(`settings/stripe/${action}`,'POST',action==='connect'?credentials:{});
   setNotice(action==='connect'?'Stripe accepted the test connection. Add the webhook address in Stripe to receive billing events.':'Stripe disconnected. The saved credentials are deleted; recorded billing evidence remains.');
   setAsking(false);resource.reload();
  }catch(cause){setError((cause as Error).message);resource.reload();}
  finally{setBusy(false);}
 }
 return <section className="operator-surface settings-card stripe-settings" aria-labelledby="stripe-settings">
  <h2 id="stripe-settings">Stripe test billing</h2>
  <p className="settings-card__line">Connect a Stripe test account to review customer identity and see invoice and payment evidence on deals and companies. Stripe owns billing and collection. Billing events never change a deal’s stage.</p>
  {error&&<OperatorState kind="error">{error}</OperatorState>}
  {resource.error&&<OperatorState kind="error">{resource.error.message}</OperatorState>}
  {notice&&<OperatorState>{notice}</OperatorState>}
  {!data&&!resource.error&&<OperatorState>Loading Stripe connection…</OperatorState>}
  {data&&<>
   <div className="stripe-connection" data-state={data.state} role="status"><strong>{stateWords[data.state]}</strong>{data.reason&&<span>{data.reason}</span>}</div>
   <p className="stripe-freshness">{data.checkedAt?`Connection last checked ${formatDateTime(data.checkedAt)}.`:'Connection has not been checked.'} {data.lastEventAt?`Last Stripe event received ${formatDateTime(data.lastEventAt)}.`:'No Stripe events received yet.'}</p>
   {data.owner?<>
    <form className="workbench-form stripe-connect-form" onSubmit={event=>{event.preventDefault();void change('connect');}}>
     <h3>{data.state==='disconnected'?'Connect Stripe test mode':'Check or replace the test connection'}</h3>
     <label>Stripe restricted test API key<input type="password" autoComplete="new-password" required disabled={busy} value={apiKey} onChange={event=>setApiKey(event.target.value)}/></label>
     <label>Stripe webhook signing secret<input type="password" autoComplete="new-password" required disabled={busy} value={webhookSecret} onChange={event=>setWebhookSecret(event.target.value)}/></label>
     <p>Create a restricted test key with Customers read permission, then use the signing secret for your Stripe webhook endpoint. Live keys are refused. Enter both credentials again to check or replace the connection; saved credentials are never shown.</p>
     <button className="operator-button" disabled={busy||!apiKey.trim()||!webhookSecret.trim()}>Check and connect Stripe test mode</button>
    </form>
    {data.webhookUrl&&<div className="stripe-webhook"><h3>Stripe webhook endpoint</h3><p>In Stripe test mode, configure this endpoint for invoice.paid, invoice.payment_failed, invoice.voided and charge.refunded events, using the signing secret above. Stripe must be able to reach this address over public HTTPS.</p><code>{data.webhookUrl}</code></div>}
    {data.state!=='disconnected'&&<div><button type="button" className="operator-text-button" disabled={busy} onClick={()=>setAsking(true)}>Disconnect Stripe</button></div>}
    {asking&&<InlineConfirm busy={busy} sentence="Disconnect Stripe and delete the saved credentials? New billing events will stop arriving. Recorded billing evidence and reviewed customer links remain." action="Disconnect Stripe" keep="Keep connected" onConfirm={()=>void change('disconnect')} onKeep={()=>setAsking(false)}/>}
   </>:<p>Ask the installation owner to connect or replace the Stripe test credentials. Full operators can review and link a Stripe customer from a deal.</p>}
  </>}
  <div><button type="button" className="operator-text-button" disabled={busy} onClick={resource.reload}>Refresh connection status</button></div>
 </section>;
}
