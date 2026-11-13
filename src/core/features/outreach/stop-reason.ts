/** Why a scheduled follow-up stopped, in the words the owner reads in NOW and Notifications. */
export function stopReason(type:string){
 return type==='email.replied'?'Customer replied, so the scheduled follow-up was cancelled'
  :type==='meeting.booked'?'Customer booked a meeting, so the scheduled follow-up was cancelled'
  :'Customer asked to stop email, so the scheduled follow-up was cancelled';
}
export const doNotContactReason='Contact is now Do not contact, so the scheduled follow-up was cancelled';
/** SEQUENCE-002: a stage move or close ends the deal's scheduled follow-up in the same commit; reopening revives nothing. */
export const stageChangedReason='Deal stage changed, so the scheduled follow-up was cancelled';
export function closedReason(state:'won'|'lost'){return `Deal closed ${state}, so the scheduled follow-up was cancelled`;}

/** A draft can need review without ever having authorized a scheduled message.
 * Also correct explanations stored by earlier versions when that draft is read. */
export function staleDraftReason(reason:string|null){
 return reason?.replace(/, so the scheduled follow-up was cancelled$/, '')??null;
}
