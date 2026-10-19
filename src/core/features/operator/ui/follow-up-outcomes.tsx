import './follow-up-outcomes.css';
import { formatDate } from './formatters';
export interface Outcomes {firstAcceptedAt:string|null;accepted:number;delivered:number;humanReplies:number;meetingsBooked:number;stageAdvances:number;lifecycle:string;closedAt:string|null;inferredReports:number;automaticReplies:number}
/** SEQUENCE-002: delivery, human replies, meetings and deal movement are measured apart; opens and automatic replies are shown but never counted as success. */
export function FollowUpOutcomes({outcomes}:{outcomes:Outcomes}){
 if(!outcomes.firstAcceptedAt)return null;
 const deal=outcomes.lifecycle==='won'?`Won${outcomes.closedAt?` · ${formatDate(outcomes.closedAt)}`:''}`:outcomes.lifecycle==='lost'?`Lost${outcomes.closedAt?` · ${formatDate(outcomes.closedAt)}`:''}`:'Open';
 return <div className="follow-up-outcomes" data-testid="follow-up-outcomes"><h3>Follow-up outcomes</h3><p>Since the first accepted message on {formatDate(outcomes.firstAcceptedAt)}.</p>
  <dl className="operator-data-fields">
   <div data-field="accepted"><dt>Accepted by mail provider</dt><dd>{outcomes.accepted}</dd></div>
   <div data-field="delivered"><dt>Delivery reported</dt><dd>{outcomes.delivered}</dd></div>
   <div data-field="humanReplies"><dt>Human replies</dt><dd>{outcomes.humanReplies}</dd></div>
   <div data-field="meetingsBooked"><dt>Meetings booked</dt><dd>{outcomes.meetingsBooked}</dd></div>
   <div data-field="stageAdvances"><dt>Stage advances</dt><dd>{outcomes.stageAdvances}</dd></div>
   <div data-field="deal"><dt>Deal outcome</dt><dd>{deal}</dd></div>
  </dl>
  <p>Not counted as success: {outcomes.inferredReports} open or click {outcomes.inferredReports===1?'report':'reports'} (inferred) and {outcomes.automaticReplies} automatic {outcomes.automaticReplies===1?'reply':'replies'}.</p></div>;
}
