/** Why a scheduled follow-up stopped, in the words the owner reads in NOW and Notifications. */
export function stopReason(type:string){
 return type==='email.replied'?'Customer replied, so the scheduled follow-up was cancelled'
  :type==='meeting.booked'?'Customer booked a meeting, so the scheduled follow-up was cancelled'
  :'Customer asked to stop email, so the scheduled follow-up was cancelled';
}
export const doNotContactReason='Contact is now Do not contact, so the scheduled follow-up was cancelled';
