import {useState,type ReactNode} from 'react';
import {Link} from '@tanstack/react-router';
import type {OpportunityDetail,WorkspacePresentation} from '../operator-api';
import {RecommendationRefresh} from '../manual-action';
import {workbenchRequest} from '../workbench-api';
import {formatDateTime,label,sourceLabel} from '../formatters';

const kindWords:Record<string,[string,string]>={'email.replied':['reply','replies'],'email.sent':['message sent','messages sent'],'meeting.booked':['meeting booked','meetings booked'],'meeting.completed':['meeting held','meetings held'],'form.submitted':['form','forms'],'content.downloaded':['download','downloads'],'page.viewed':['visit','visits'],'email.bounced':['delivery problem','delivery problems']};
const shortKind:Record<string,string>={'email.replied':'Reply','email.sent':'Sent','meeting.booked':'Meeting','meeting.completed':'Meeting','form.submitted':'Form','email.bounced':'Bounce','page.viewed':'Visit','content.downloaded':'Download'};
export const signalKind=(type:string)=>shortKind[type]??label(type);
const count=(type:string,n:number)=>{const words=kindWords[type];return `${n} ${words?words[n===1?0:1]:label(type).toLowerCase()}`;};
const firstName=(name:string)=>name.split(/\s+/)[0]??name;

/** The contact each signal came with, where its timeline line names one. */
export function signalContacts(opportunity:OpportunityDetail){
 const names=new Map(opportunity.contacts.map(contact=>[contact.id,contact.name??contact.email??null]));
 const result=new Map<string,string>();
 for(const entry of opportunity.timeline){const payload=(entry.payload??{}) as Record<string,unknown>;const signal=typeof payload.signalId==='string'?payload.signalId:entry.id,contact=typeof payload.contactId==='string'?names.get(payload.contactId):null;if(contact)result.set(signal,contact);}
 return result;
}

/** The first card of a deal: why it is in NOW, the newest contributing signal (or the recommendation's own words),
 * Write follow-up, Draft with AI, Mark done and Skip, and a fold saying why it is first. */
export function NextAction({opportunity,presentation,aiConfigured,reload,composing,onCompose,deal}:{opportunity:OpportunityDetail;presentation:WorkspacePresentation;aiConfigured:boolean;reload:()=>void;composing:boolean;onCompose:()=>void;deal?:ReactNode}){
 const rec=opportunity.recommendation,contributions=opportunity.evaluation?.contributions??[],contacts=signalContacts(opportunity);
 const signals=new Map(opportunity.signals.map(signal=>[signal.id,signal]));
 const newest=[...contributions].sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt))[0],signal=newest?signals.get(newest.signalId):undefined;
 const line=rec?.explanation??(signal?signal.subject||`${signalKind(signal.type)} · from ${sourceLabel(signal.source)}`:opportunity.queueReason??'Review the customer evidence and choose your next step.');
 const when=!rec?.explanation&&signal?[formatDateTime(signal.occurredAt,presentation),contacts.get(signal.id)].filter(Boolean).join(' · '):null;
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function finish(outcome:'completed'|'skipped'){if(!rec)return;setBusy(true);setError('');try{await workbenchRequest(`/recommendations/${rec.id}/complete`,{outcome,note:''});reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="operator-surface r-next" aria-labelledby={`next-${opportunity.id}`} data-testid="next-action">
  <h2 id={`next-${opportunity.id}`} className="sr-only">Next action</h2>
  {opportunity.evaluation?.failureAt?<div role="alert" data-testid="evaluation-failure"><p>Priorities could not be refreshed at {formatDateTime(opportunity.evaluation.failureAt,presentation)}. The score and evidence shown are from the last successful evaluation and may be out of date.</p><RecommendationRefresh opportunityId={opportunity.id} reload={reload}/></div>:null}
  {deal}
  {opportunity.queueReason?<div className="r-why"><span className="r-why-label">Why NOW</span><span className="r-chip">{opportunity.queueReason}</span></div>:null}
  <p className="r-next-line">{line}</p>
  {when?<p className="r-next-when">{when}</p>:null}
  <div className="r-next-actions">
   <button type="button" className="orbit-button orbit-button--primary" aria-expanded={composing} onClick={onCompose}>Write follow-up</button>
   {aiConfigured?<Link className="orbit-button orbit-button--secondary" to="/app/assistance/$id" params={{id:opportunity.id}}>Draft with AI</Link>:null}
   {rec?<span className="r-quiet-actions"><button type="button" className="operator-text-button" disabled={busy} onClick={()=>void finish('completed')}>Mark done</button><button type="button" className="operator-text-button" disabled={busy} onClick={()=>void finish('skipped')}>Skip</button></span>:null}
  </div>
  {error?<p className="r-fail" role="alert">{error}</p>:null}
  <WhyFirst opportunity={opportunity} presentation={presentation} contacts={contacts}/>
 </section>;
}

/** "Why this is first": the contributing signals with their points, then the other signals with none. */
function WhyFirst({opportunity,presentation,contacts}:{opportunity:OpportunityDetail;presentation:WorkspacePresentation;contacts:Map<string,string>}){
 const contributions=opportunity.evaluation?.contributions??[],counted=new Set(contributions.map(item=>item.signalId)),signals=new Map(opportunity.signals.map(signal=>[signal.id,signal]));
 // OPP-004: every contributing signal with its kind, source, confidence and points, beside the recommendation it supports.
 const used=new Set(opportunity.recommendation?.evidenceSignalIds??[]),other=opportunity.signals.filter(signal=>!counted.has(signal.id));
 const types=new Map<string,number>();for(const item of contributions)types.set(item.signalType,(types.get(item.signalType)??0)+1);
 const people=new Set(contributions.map(item=>contacts.get(item.signalId)).filter(Boolean) as string[]),from=people.size===1?` from ${firstName([...people][0]!)}`:'';
 const reasons=[...types].map(([type,n])=>count(type,n)).join(', ');
 const summary=contributions.length?`Why this is first: ${reasons}${from} · score ${opportunity.evaluation?.score??opportunity.score}`:`Why this is first: score ${opportunity.evaluation?.score??opportunity.score}`;
 const subject=(id:string,type:string,source:string)=>signals.get(id)?.subject||`${signalKind(type)} · from ${sourceLabel(source)}`;
 return <details className="r-fold" data-testid="contributing-evidence"><summary>{summary}</summary>
  {contributions.length?<ul className="r-why-list">{contributions.map(item=><li key={item.signalId}><span className="r-why-what"><span>{subject(item.signalId,item.signalType,item.source)}</span><span className="r-why-meta"><span>{label(item.signalType)}</span> · {sourceLabel(item.source)} · {label(item.confidence).toLowerCase()}{used.has(item.signalId)?' · Used for this recommendation':''}</span></span><span className="r-muted">{formatDateTime(item.occurredAt,presentation)}</span><b>{item.contribution>0?'+':''}{item.contribution}</b></li>)}</ul>:<p className="r-muted">No signals contribute to the current score.</p>}
  {other.length?<><h3>Other signals</h3><ul className="r-why-list">{other.map(signal=><li key={signal.id}><span className="r-why-what"><span>{subject(signal.id,signal.type,signal.source)}</span><span className="r-why-meta"><span>{label(signal.type)}</span> · {sourceLabel(signal.source)} · {label(signal.confidence).toLowerCase()}</span></span><span className="r-muted">{formatDateTime(signal.occurredAt,presentation)}</span><span className="r-none">No points</span></li>)}</ul></>:null}
  {!opportunity.signals.length?<p className="r-muted">No customer signals yet. <a href="/app/settings/capture">Connect a source</a></p>:null}
 </details>;
}
