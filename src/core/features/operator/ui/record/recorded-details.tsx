import type {OpportunityDetail,WorkspacePresentation} from '../operator-api';
import {RecommendationRefresh} from '../manual-action';
import {formatDateTime,label,sourceLabel} from '../formatters';
import {recordStateLabel} from '../record-presentation';

/** Recorded details: how Orbit ranked this deal and where each signal and line came from, in words (no keys or ids). */
export function RecordedDetails({opportunity,presentation,reload}:{opportunity:OpportunityDetail;presentation:WorkspacePresentation;reload:()=>void}){
 const evaluation=opportunity.evaluation,rec=opportunity.recommendation;
 const linked=(basis:string)=>basis==='operator-attested record ID'?'linked by an operator':`linked by ${label(basis).toLowerCase()}`;
 return <details className="r-fold r-fold--foot" data-testid="recorded-details"><summary>Recorded details</summary>
  <ul className="r-recorded">
   <li>{recordStateLabel(opportunity.queueState)} · {recordStateLabel(opportunity.lifecycle)} deal · score {opportunity.score}, {recordStateLabel(opportunity.band)} priority</li>
   <li data-testid="current-evaluation">{evaluation?`${label(evaluation.policyVersion)} · ${label(evaluation.status).toLowerCase()} · evaluated ${formatDateTime(evaluation.evaluatedAt,presentation)} · score ${evaluation.score}`:'Not evaluated yet.'}</li>
   <li data-testid="current-recommendation">{rec?`${label(rec.actionType)} · ${label(rec.policyVersion)} · based on ${rec.evidenceSignalIds.length} recorded customer ${rec.evidenceSignalIds.length===1?'event':'events'}`:'No recommendation yet.'}</li>
   {opportunity.signals.map(signal=><li key={signal.id}>{signal.subject??label(signal.type)} · {label(signal.type)} · {sourceLabel(signal.source)} · {linked(signal.linkingBasis)}</li>)}
   {opportunity.timeline.map(entry=><li key={entry.id}>{label(entry.kind)} · Occurred {formatDateTime(entry.occurredAt,presentation)} · Recorded {formatDateTime(entry.recordedAt,presentation)} · Actor {entry.actorName} ({label(entry.actorType)}) · source {sourceLabel(entry.sourceName)}</li>)}
  </ul>
  <div className="r-fold-body"><RecommendationRefresh opportunityId={opportunity.id} reload={reload}/></div>
 </details>;
}
