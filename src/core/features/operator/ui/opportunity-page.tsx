import {OpportunityTimeline} from './opportunity-timeline';
import {HandoffTasks} from './handoff-tasks';
import {ManualAction,RecommendationRefresh} from './manual-action';
import {MessageHistory} from './message-history';
import {EvidenceActions} from './evidence-actions';
import {useCallback,useState} from 'react';
import {Link,useParams} from '@tanstack/react-router';
import {formatCurrency,formatDateTime,label} from './formatters';
import {operatorApi} from './operator-api';
import {OperatorShell,OperatorState} from './operator-shell';
import {useOperatorResource} from './use-operator-resource';
import {readOnboarding} from './onboarding-checklist';
export function OpportunityPage(){
 const{id}=useParams({from:'/app/opportunities/$id'}),[compose,setCompose]=useState(false);
 const load=useCallback(async()=>{const[{opportunity},{drafts},{presentation},configuration]=await Promise.all([operatorApi.readOpportunity(id),operatorApi.listOpportunityDrafts(id),operatorApi.readWorkspacePresentation(),readOnboarding()]);return{opportunity,drafts,presentation,configuration};},[id]);
 const resource=useOperatorResource(`opportunity:${id}`,load);
 if(resource.loading)return <OperatorShell title="Opportunity"><OperatorState>Loading opportunity…</OperatorState></OperatorShell>;
 if(resource.error)return <OperatorShell title="Opportunity"><OperatorState kind="error">{resource.error.message}</OperatorState></OperatorShell>;
 if(!resource.data)return null;
 const{opportunity,drafts,presentation,configuration}=resource.data,rec=opportunity.recommendation;
 return <OperatorShell eyebrow="Customer opportunity" title={opportunity.title} action={<Link to="/app">← NOW queue</Link>}>
 <section className="operator-detail" data-testid="opportunity-detail">
 <header className="operator-surface operator-detail__section"><h2>{opportunity.companyName??'No company associated'}</h2><p>{opportunity.contacts.map(c=>c.name??c.email??'Unnamed contact').join(' · ')}</p><p>{formatCurrency(opportunity.valueCents,presentation)} · {opportunity.stage} · {opportunity.ownerName??'Unassigned'}</p></header>
 <section className="operator-surface operator-detail__section" data-testid="next-action"><h2>Next action</h2>{opportunity.evaluation?.failureAt&&<div role="alert" data-testid="evaluation-failure"><p>Priorities could not be refreshed at {formatDateTime(opportunity.evaluation.failureAt,presentation)}. The score and evidence shown are from the last successful evaluation and may be out of date.</p><RecommendationRefresh opportunityId={id} reload={resource.reload}/></div>}<p>{rec?.explanation??opportunity.queueReason??'Review the customer evidence and choose your next step.'}</p><div className="workbench-actions"><button className="orbit-button orbit-button--primary" onClick={()=>setCompose(true)}>Write follow-up</button>{configuration.aiConfigured&&<Link className="orbit-button orbit-button--secondary" to="/app/assistance/$id" params={{id}}>Draft with AI</Link>}</div>{rec&&<details><summary>Complete or skip this action</summary><ManualAction recommendationId={rec.id} reload={resource.reload}/></details>}</section>
 {compose&&<EvidenceActions opportunity={opportunity} reload={resource.reload} mode="draft"/>}
 <dl className="operator-detail-fields" data-testid="independent-opportunity-fields"><div><dt>Score</dt><dd>{opportunity.score} · {label(opportunity.band)}</dd></div><div><dt>Queue</dt><dd>{label(opportunity.queueState)}</dd></div><div><dt>Lifecycle</dt><dd>{label(opportunity.lifecycle)}</dd></div><div><dt>Expected close</dt><dd>{formatDateTime(opportunity.expectedCloseAt,presentation)}</dd></div></dl>
 <section className="operator-surface operator-detail__section" data-testid="contributing-evidence"><h2>Why now</h2>{opportunity.signals.length?<ul className="operator-evidence-list">{opportunity.signals.map(signal=><li key={signal.id}><div><strong>{signal.subject||label(signal.type)}</strong><span>{label(signal.type)} · {formatDateTime(signal.occurredAt,presentation)}</span>{rec?.evidenceSignalIds.includes(signal.id)&&<span>Used for this recommendation</span>}</div></li>)}</ul>:<p>No customer signals yet. <a href="/app/sources">Connect a source</a></p>}</section>
 <section className="operator-surface operator-detail__section" data-testid="opportunity-drafts"><h2>Follow-up drafts</h2>{drafts.length?<ul className="operator-draft-list">{drafts.map(draft=><li key={draft.id}><Link to="/app/drafts/$id" params={{id:draft.id}}><strong>{draft.subject}</strong><span>{draft.recipientEmail} · Revision {draft.revision}</span></Link></li>)}</ul>:<p>No follow-ups written yet.</p>}</section>
 <MessageHistory opportunityId={id}/>
 <HandoffTasks opportunityId={id} onChange={resource.reload}/>
 <OpportunityTimeline opportunity={opportunity} presentation={presentation} reload={resource.reload}/>
 <EvidenceActions opportunity={opportunity} reload={resource.reload} mode="activity"/>
 <details className="operator-surface operator-detail__section"><summary>Audit details</summary><section data-testid="current-evaluation"><h2>Current evaluation</h2>{opportunity.evaluation?<><p>Policy {opportunity.evaluation.policyVersion} · {opportunity.evaluation.status}</p><p>Evaluated {formatDateTime(opportunity.evaluation.evaluatedAt,presentation)}</p><ul>{opportunity.evaluation.contributions.map(c=><li key={c.signalId}>{c.signalId} · {c.signalType} · {c.source} · {c.confidence} · {c.contribution>0?'+':''}{c.contribution}</li>)}</ul></>:<p>No evaluation yet.</p>}</section><section data-testid="current-recommendation"><h2>Recommendation record</h2>{rec&&<><p>{label(rec.actionType)} · Policy {rec.policyVersion}</p><p>{rec.id}</p><p>{rec.evidenceSignalIds.join(', ')}</p></>}<RecommendationRefresh opportunityId={id} reload={resource.reload}/></section><ul>{opportunity.signals.map(signal=><li key={signal.id}>{signal.id} · {signal.type} · {signal.source} · {signal.linkingBasis}</li>)}</ul><ul>{opportunity.timeline.map(entry=><li key={entry.id}>{entry.id} · {entry.kind} · Occurred {formatDateTime(entry.occurredAt,presentation)} · Recorded {formatDateTime(entry.recordedAt,presentation)} · Actor {entry.actorName} ({label(entry.actorType)}) · source {entry.sourceName}</li>)}</ul></details>
 </section></OperatorShell>;
}
