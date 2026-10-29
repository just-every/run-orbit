import type {OpportunityDetail,WorkspacePresentation} from './operator-api';
import {formatDateTime,label,sourceLabel} from './formatters';

export function OpportunityEvidence({opportunity,presentation}:{opportunity:OpportunityDetail;presentation:WorkspacePresentation}){
 const contributions=opportunity.evaluation?.contributions??[],used=new Set(contributions.map(item=>item.signalId));
 const other=opportunity.signals.filter(signal=>!used.has(signal.id)),rec=opportunity.recommendation;
 return <section className="operator-surface operator-detail__section" data-testid="contributing-evidence">
  <h2>Contributing evidence</h2>
  <p>Why now: {rec?.explanation??opportunity.queueReason??'Review the customer evidence and choose your next step.'}</p>
  {contributions.length?<ul className="operator-evidence-list">{contributions.map(item=><li key={item.signalId}><div>
   <strong>{label(item.signalType)}</strong>
   <span>{opportunity.signals.find(signal=>signal.id===item.signalId)?.subject}</span>
   {rec?.evidenceSignalIds.includes(item.signalId)&&<span>Used for this recommendation</span>}
  </div><div>
   <span>{sourceLabel(item.source)} · {label(item.confidence)} · {formatDateTime(item.occurredAt,presentation)}</span>
  </div><b>{item.contribution>0?'+':''}{item.contribution}</b></li>)}</ul>:<p>No signals contribute to the current score.</p>}
  {other.length>0&&<><h3>Other signals</h3><ul className="operator-evidence-list">{other.map(signal=><li key={signal.id}><div>
   <strong>{signal.subject||label(signal.type)}</strong>
   <span>{label(signal.type)}</span>
  </div><div><span>{sourceLabel(signal.source)} · {label(signal.confidence)} · {formatDateTime(signal.occurredAt,presentation)}</span></div>
   <span>No points</span>
  </li>)}</ul></>}
  {!opportunity.signals.length&&<p>No customer signals yet. <a href="/app/settings/capture">Connect a source</a></p>}
 </section>;
}
