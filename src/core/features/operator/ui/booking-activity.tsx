import type {BookingEvidence} from '../../ingestion/booking-webhooks';
import type {WorkspacePresentation} from './operator-api';
import {formatDateTime} from './formatters';
/** Provider reports and missing completion are distinct, including after the scheduled time. */
export function BookingActivity({value,presentation}:{value:unknown;presentation:WorkspacePresentation}){
 if(!value||typeof value!=='object')return null;const booking=value as BookingEvidence;
 const past=booking.endTime&&Date.parse(booking.endTime)<Date.now();
 return <div style={{overflowWrap:'anywhere'}}> <p>{booking.provider==='calcom'?'Cal.com':'Calendly'} · {booking.state==='completed'?'Ended · provider report (attendance not confirmed)':booking.state}</p>
 <p>Provider ID: {booking.providerId}</p><p>Attendees: {booking.attendees.map(a=>a.email).join(', ')}</p>
 <p>{booking.context}</p><p>Start: {booking.startTime?formatDateTime(booking.startTime,presentation):'Not supplied by provider'} · End: {booking.endTime?formatDateTime(booking.endTime,presentation):'Not supplied by provider'}</p>
 {booking.oldStartTime&&<p>Previous start: {formatDateTime(booking.oldStartTime,presentation)}{booking.oldEndTime?` · Previous end: ${formatDateTime(booking.oldEndTime,presentation)}`:''}</p>}
 {past&&['booked','rescheduled'].includes(booking.state)&&<p>Time passed, completion not reported</p>}
 </div>;
}
