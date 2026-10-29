import type {WorkspacePresentation} from './operator-api';
import {formatDateTime} from './formatters';
export interface Outcomes {firstAcceptedAt:string|null;accepted:number;delivered:number;humanReplies:number;meetingsBooked:number;stageAdvances:number;lifecycle:string;closedAt:string|null;inferredReports:number;automaticReplies:number}
/** SEQUENCE-002: delivery, human replies, meetings and deal movement are measured apart; opens and automatic replies are
 * named but never counted as success. One fold at the foot of a deal, absent until its first accepted message. */
export function FollowUpResults({outcomes,presentation}:{outcomes:Outcomes|undefined;presentation:WorkspacePresentation}){
 if(!outcomes?.firstAcceptedAt)return null;
 const n=(count:number,one:string,many:string)=>`${count} ${count===1?one:many}`;
 return <details className="r-fold r-fold--foot" data-testid="follow-up-outcomes"><summary>Follow-up results since {formatDateTime(outcomes.firstAcceptedAt,presentation)}</summary>
  <p className="r-muted">{[`${outcomes.accepted} accepted by the mail provider`,n(outcomes.delivered,'delivery report','delivery reports'),n(outcomes.humanReplies,'reply','replies'),n(outcomes.meetingsBooked,'meeting booked','meetings booked'),n(outcomes.stageAdvances,'stage move','stage moves')].join(' · ')}.{outcomes.inferredReports||outcomes.automaticReplies?` Not counted: ${n(outcomes.inferredReports,'open or click report','open or click reports')} and ${n(outcomes.automaticReplies,'automatic reply','automatic replies')}.`:''}</p>
 </details>;
}
