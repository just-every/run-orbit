import type {OpportunityDetail,WorkspacePresentation} from '../operator-api';
import {RecordedSignalEvidence} from './signal-evidence';
import {RecommendationRefresh} from '../manual-action';
import {formatDateTime,label,sourceLabel} from '../formatters';
import {recordStateLabel} from '../record-presentation';

/** Recorded details retain signal identities and open their source evidence. */
export function RecordedDetails({opportunity,presentation,reload,readOnly=false}:{opportunity:OpportunityDetail;presentation:WorkspacePresentation;reload:()=>void;readOnly?:boolean}){
 const evaluation=opportunity.evaluation,rec=opportunity.recommendation;
 return <details className="r-fold r-fold--foot" data-testid="recorded-details"><summary>Recorded details</summary>
  <ul className="r-recorded">
   <li>{recordStateLabel(opportunity.queueState)} · {recordStateLabel(opportunity.lifecycle)} deal · score {opportunity.score}, {recordStateLabel(opportunity.band)} priority</li>
   <li data-testid="current-evaluation">{evaluation?`${label(evaluation.policyVersion)} · ${label(evaluation.status).toLowerCase()} · evaluated ${formatDateTime(evaluation.evaluatedAt,presentation)} · score ${evaluation.score}`:'Not evaluated yet.'}</li>
   <li data-testid="current-recommendation">{rec?`${label(rec.actionType)} · ${label(rec.policyVersion)} · based on ${rec.evidenceSignalIds.length} recorded customer ${rec.evidenceSignalIds.length===1?'event':'events'}`:'No recommendation yet.'}</li>
   {opportunity.signals.map(signal=><li key={signal.id}><RecordedSignalEvidence opportunityId={opportunity.id} signal={signal} presentation={presentation}/></li>)}
   {opportunity.timeline.map(entry=><li key={entry.id}>{label(entry.kind)} · Occurred {formatDateTime(entry.occurredAt,presentation)} · Recorded {formatDateTime(entry.recordedAt,presentation)} · Actor {entry.actorName} ({label(entry.actorType)}) · source {sourceLabel(entry.sourceName)}</li>)}
  </ul>
  {!readOnly&&<div className="r-fold-body"><RecommendationRefresh opportunityId={opportunity.id} reload={reload}/></div>}
 </details>;
}
