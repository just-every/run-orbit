import {useCallback,useEffect,useState} from 'react';
import {InlineConfirm} from '../autosave/inline-confirm';
import {formatDateTime} from '../formatters';
import {OperatorState} from '../operator-shell';
import {recordsRequest} from '../records-api';
import {useOperatorResource} from '../use-operator-resource';
import './deal-billing.css';

interface CustomerIdentity {customerId:string;name:string|null;email:string|null;domain:string|null;companyId:string;opportunityId:string}
interface BillingEvent {id:string;eventType:string;state:'paid'|'past-due'|'refunded'|'voided';currency:string;amountCents:number;occurredAt:string;receivedAt:string}
interface BillingContext {mapping:(CustomerIdentity&{reviewedAt:string})|null;timeline:BillingEvent[];state:'connected'|'paused'|'disconnected';reason:string|null;lastEventAt:string|null}
interface IdentityReview {review:CustomerIdentity;reviewToken:string;expiresAt:string}
type BillingTarget={opportunityId:string;companyId:string|null}|{opportunityId?:never;companyId:string};
const eventWords={paid:'Paid','past-due':'Past due',refunded:'Refunded',voided:'Voided'} as const;
const sourceWords={connected:'Connected · Stripe test mode',paused:'Paused · needs attention',disconnected:'Not connected · unresolved setup'} as const;

function CustomerDetails({customer}:{customer:CustomerIdentity}){
 return <dl className="billing-identity">
  <dt>Stripe customer</dt><dd><a href={`https://dashboard.stripe.com/test/customers/${encodeURIComponent(customer.customerId)}`} target="_blank" rel="noreferrer">{customer.customerId} · Open in Stripe test mode</a></dd>
  <dt>Name</dt><dd>{customer.name??'Not provided by Stripe'}</dd>
  <dt>Email</dt><dd>{customer.email??'Not provided by Stripe'}</dd>
  <dt>Domain</dt><dd>{customer.domain??'Not provided by Stripe'}</dd>
 </dl>;
}

/** Billing is evidence beside the sales work; only a separately reviewed identity creates a deal link. */
export function DealBilling(target:BillingTarget){
 const {opportunityId,companyId}=target,kind=opportunityId?'opportunity':'company',id=opportunityId??companyId;
 const load=useCallback(()=>recordsRequest<BillingContext>(`billing/${kind}/${encodeURIComponent(id!)}`),[kind,id]);
 const resource=useOperatorResource(`stripe-billing:${kind}:${id}`,load),data=resource.data;
 const [customerId,setCustomerId]=useState(''),[review,setReview]=useState<IdentityReview|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{setCustomerId('');setReview(null);setError('');setNotice('');},[companyId,opportunityId]);
 async function reviewCustomer(){
  if(busy||!companyId||!opportunityId)return;
  setBusy(true);setError('');setNotice('');setReview(null);
  try{setReview(await recordsRequest<IdentityReview>('billing/stripe/review','POST',{customerId:customerId.trim(),companyId,opportunityId}));}
  catch(cause){setError((cause as Error).message);}
  finally{setBusy(false);}
 }
 async function confirmLink(){
  if(busy||!review)return;
  setBusy(true);setError('');setNotice('');
  try{
   await recordsRequest('billing/stripe/link','POST',{...review.review,companyId,opportunityId,reviewToken:review.reviewToken});
   setReview(null);setCustomerId('');setNotice('The reviewed Stripe customer is linked. Billing events remain evidence; the deal’s stage is unchanged.');resource.reload();
  }catch(cause){setError((cause as Error).message);setReview(null);resource.reload();}
  finally{setBusy(false);}
 }
 return <details className="r-fold r-fold--foot deal-billing" open>
  <summary>Stripe billing</summary>
  <div className="r-fold-body billing-body">
   <p>Stripe owns billing and collection. These test-mode events provide customer evidence and never move the deal’s stage.</p>
   {error&&<OperatorState kind="error">{error}</OperatorState>}
   {resource.error&&<OperatorState kind="error">Billing could not refresh: {resource.error.message}. Any evidence shown below is from the last successful read.</OperatorState>}
   {notice&&<OperatorState>{notice}</OperatorState>}
   {!data&&!resource.error&&<OperatorState>Loading Stripe billing…</OperatorState>}
   {data&&<>
    <p className="billing-source" role="status"><strong>{sourceWords[data.state]}</strong>{data.reason&&<span>{data.reason}</span>}<span>{data.lastEventAt?`Last Stripe event received ${formatDateTime(data.lastEventAt)}.`:'No Stripe events received yet.'} {data.state!=='connected'?'New billing evidence is unavailable until the owner reconnects Stripe.':''}</span></p>
    {data.mapping?<><h3>Reviewed customer link</h3><CustomerDetails customer={data.mapping}/><p className="billing-meta">Identity reviewed {formatDateTime(data.mapping.reviewedAt)}.</p></>:<p>No Stripe customer is linked. The owner connects Stripe test mode in <a href="/app/settings/integrations#stripe-settings">Settings › Integrations</a>, then a full operator reviews and confirms the customer on a deal.</p>}
    <h3>Billing timeline</h3>
    {data.timeline.length?<ol className="billing-timeline">{data.timeline.map(event=><li key={event.id}>
     <div className="billing-event-head"><strong>{eventWords[event.state]}</strong><span>{event.currency.toUpperCase()} {new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(event.amountCents/100)}</span></div>
     <span>{event.eventType}</span><span className="billing-meta">Occurred {formatDateTime(event.occurredAt)} · Received {formatDateTime(event.receivedAt)}</span>
    </li>)}</ol>:<p>No billing events recorded{data.mapping?' for this reviewed customer yet.':'. Review and link a Stripe customer from a deal to associate incoming billing evidence.'}</p>}
    {opportunityId&&(companyId?<>
     {data.state==='connected'?<form className="workbench-form billing-link-form" onSubmit={event=>{event.preventDefault();void reviewCustomer();}}>
      <h3>{data.mapping?'Review a customer link':'Link a Stripe test customer'}</h3>
      <p>Use the Stripe customer ID for this deal’s company. Review the returned name, email and domain against the company and deal before confirming. A mismatch must be corrected before linking.</p>
      <label>Stripe customer ID<input required pattern="cus_[A-Za-z0-9]+" autoComplete="off" value={customerId} disabled={busy} onChange={event=>{setCustomerId(event.target.value);setReview(null);setError('');setNotice('');}}/></label>
      <button className="operator-button" disabled={busy||!customerId.trim()}>Review Stripe customer</button>
     </form>:<p><a href="/app/settings/integrations#stripe-settings">Open Stripe connection settings</a> to resolve setup before reviewing a customer link.</p>}
     {review&&<div className="billing-review"><h3>Review exact customer identity</h3><CustomerDetails customer={review.review}/><p className="billing-meta">This review expires {formatDateTime(review.expiresAt)}.</p><InlineConfirm busy={busy} sentence="Confirm that this Stripe customer belongs to this deal and its company. This saves the exact identity shown above as their billing link." action="Confirm customer link" keep="Cancel review" onConfirm={()=>void confirmLink()} onKeep={()=>setReview(null)}/></div>}
    </>:<p>Associate this deal with a company before reviewing a Stripe customer link.</p>)}
    {!opportunityId&&<p>Company billing is read-only here. Review or change the customer link from the related deal.</p>}
   </>}
   <div><button type="button" className="operator-text-button" disabled={busy} onClick={()=>{setReview(null);resource.reload();}}>Refresh billing</button></div>
  </div>
 </details>;
}
