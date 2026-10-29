import {useEffect,useState,type ReactNode} from 'react';
import {Link} from '@tanstack/react-router';
import {operatorApi,type OpportunityDetail} from '../operator-api';
import {formatCurrency,formatDateTime,sourceLabel} from '../formatters';
import {signalContacts,signalKind} from './next-action';

export interface RecordDeal{id:string;title:string;lifecycle:string;queue_state:string;score:number;stage_name?:string;value_cents:number;owner_name?:string|null}

/** The open deal of theirs that NOW holds, the highest-scored: the one that leads a contact's or a company's page. */
export const dealInNow=(deals:RecordDeal[])=>deals.filter(deal=>deal.lifecycle==='open'&&deal.queue_state==='now').sort((a,b)=>b.score-a.score)[0]??null;

/** A contact's or a company's first card: the deal in NOW (its line linking to it, why NOW and its newest contributing
 * signal, read once and only when such a deal exists) with Write follow-up, which opens the record's composer linked
 * to that deal; otherwise one line that nothing needs them now, with the email and new-opportunity actions. */
export function RecordNextAction({name,deal,workspace,onWrite,writing,email,newDeal,blocked}:{name:string;deal:RecordDeal|null;workspace:any;onWrite?:()=>void;writing:boolean;email?:string;newDeal:{contact?:string;company?:string};blocked?:ReactNode}){
 const [detail,setDetail]=useState<OpportunityDetail|null>(null);
 useEffect(()=>{setDetail(null);if(!deal)return;let live=true;void operatorApi.readOpportunity(deal.id).then(result=>{if(live)setDetail(result.opportunity);}).catch(()=>{});return()=>{live=false;};},[deal?.id]);
 const contributions=detail?.evaluation?.contributions??[],newest=[...contributions].sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt))[0],signal=newest?detail?.signals.find(item=>item.id===newest.signalId):undefined;
 const contacts=detail?signalContacts(detail):new Map<string,string>();
 return <section className="operator-surface r-next" aria-labelledby="record-next" data-testid="next-action">
  <h2 id="record-next" className="sr-only">Next action</h2>
  {deal?<>
   <p className="r-next-deal"><Link to="/app/opportunities/$id" params={{id:deal.id}}>{deal.title}</Link>{[deal.stage_name,formatCurrency(deal.value_cents,workspace)].filter(Boolean).map(part=>` · ${part}`).join('')}</p>
   {detail?.queueReason?<div className="r-why"><span className="r-why-label">Why NOW</span><span className="r-chip">{detail.queueReason}</span></div>:null}
   {detail?<p className="r-next-line">{detail.recommendation?.explanation??(signal?signal.subject||`${signalKind(signal.type)} · from ${sourceLabel(signal.source)}`:'Review the customer evidence and choose your next step.')}</p>:null}
   {signal&&!detail?.recommendation?.explanation?<p className="r-next-when">{[formatDateTime(signal.occurredAt,workspace),contacts.get(signal.id)].filter(Boolean).join(' · ')}</p>:null}
  </>:<p className="r-next-line">No open deal needs {name} now.</p>}
  {blocked}
  <div className="r-next-actions">
   {onWrite&&!blocked?<button type="button" className={deal?'orbit-button orbit-button--primary':'orbit-button orbit-button--secondary'} aria-expanded={writing} onClick={onWrite}>{deal?'Write follow-up':email}</button>:null}
   {deal?null:<Link className="orbit-button orbit-button--secondary" to="/app/opportunities/new" search={newDeal}>New opportunity</Link>}
  </div>
 </section>;
}
