import {z} from 'zod';
import {payloadHash} from '../../platform/source-security';
import {IngestionError,type SignalEvent} from './contracts';

const hex=(value:Uint8Array)=>Array.from(value,b=>b.toString(16).padStart(2,'0')).join('');
export async function signSource(secret:string,body:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body))));
}
async function verify(secret:string,message:string,signature:string){
 if(!/^[a-f0-9]{64}$/i.test(signature))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g)!,b=>parseInt(b,16)),new TextEncoder().encode(message));
}
const date=z.iso.datetime({offset:true});
const attendee=z.object({email:z.email(),name:z.string().optional()});
const details=z.object({uid:z.string().min(1).max(512),attendees:z.array(attendee).min(1).max(100),title:z.string().max(2000).optional(),startTime:date.optional(),endTime:date.optional(),rescheduleUid:z.string().min(1).max(512).optional(),rescheduleStartTime:date.optional(),rescheduleEndTime:date.optional()});
const cal=z.discriminatedUnion('triggerEvent',[
 z.object({triggerEvent:z.enum(['BOOKING_CREATED','BOOKING_CANCELLED','BOOKING_RESCHEDULED']),createdAt:date,payload:details}),
 // Cal.com documents a flat booking payload for this scheduled-end report.
 details.extend({triggerEvent:z.literal('MEETING_ENDED'),endTime:date}),
]);
const calendly=z.object({event:z.enum(['invitee.created','invitee.canceled']),created_at:date,payload:z.object({uri:z.url(),email:z.email(),name:z.string().optional(),event:z.url(),old_invitee:z.url().nullable().optional(),new_invitee:z.url().nullable().optional(),rescheduled:z.boolean().optional()})});
export interface BookingEvidence {
 provider:'calcom'|'calendly';providerId:string;relatedId?:string;attendees:{email:string;name?:string}[];
 state:'booked'|'rescheduled'|'cancelled'|'completed';startTime?:string;endTime?:string;oldStartTime?:string;oldEndTime?:string;context:string;
}
const decodedEvents=new WeakSet<SignalEvent>();
export const bookingEvidence=(event:SignalEvent)=>decodedEvents.has(event)?event.data?.booking as BookingEvidence:undefined;
/** Interpret only documented relationships; absence of a provider time is explicit. */
export async function decodeBooking(vendor:'calcom'|'calendly',raw:string):Promise<SignalEvent>{
 let body:unknown;try{body=JSON.parse(raw);}catch{throw new IngestionError(400,'Invalid booking payload.');}
 const parsed=vendor==='calcom'?cal.safeParse(body):calendly.safeParse(body);
 if(!parsed.success)throw new IngestionError(400,'Use a supported booking webhook with attendee identity.');
 const value=parsed.data;
 let identity:string,occurredAt:string,booking:BookingEvidence;
 if('triggerEvent' in value){
  const p='payload' in value?value.payload:value;
  occurredAt='createdAt' in value?value.createdAt:value.endTime;
  const state=value.triggerEvent==='BOOKING_CANCELLED'?'cancelled':value.triggerEvent==='BOOKING_RESCHEDULED'?'rescheduled':value.triggerEvent==='MEETING_ENDED'?'completed':'booked';
  if(state==='rescheduled'&&!p.rescheduleUid)throw new IngestionError(400,'A reschedule must identify the previous booking.');
  booking={provider:vendor,providerId:p.uid,...(state==='rescheduled'?{relatedId:p.rescheduleUid}:{}),attendees:p.attendees,state,startTime:p.startTime,endTime:p.endTime,oldStartTime:p.rescheduleStartTime,oldEndTime:p.rescheduleEndTime,context:p.title??'Meeting'};
  identity=`${value.triggerEvent}:${p.uid}:${p.attendees[0]!.email.toLowerCase()}`;
 }else{
  const p=value.payload;occurredAt=value.created_at;
  const rescheduled=value.event==='invitee.created'?Boolean(p.old_invitee):p.rescheduled===true;
  if(rescheduled&&!(value.event==='invitee.created'?p.old_invitee:p.new_invitee))throw new IngestionError(400,'A reschedule must identify both invitees.');
  booking={provider:vendor,providerId:value.event==='invitee.canceled'&&rescheduled?p.new_invitee!:p.uri,relatedId:rescheduled?(value.event==='invitee.created'?p.old_invitee!:p.uri):undefined,attendees:[{email:p.email,...(p.name?{name:p.name}:{})}],state:rescheduled?'rescheduled':value.event==='invitee.canceled'?'cancelled':'booked',context:p.event};
  identity=`${value.event}:${p.uri}`;
 }
 const event:SignalEvent={eventId:`${vendor}:${await payloadHash(identity)}`,type:booking.state==='completed'?'meeting.ended':`meeting.${booking.state}`,subject:`Meeting ${booking.state==='completed'?'ended · provider report':booking.state}`,email:booking.attendees.length===1?booking.attendees[0]!.email:undefined,occurredAt:new Date(occurredAt).toISOString(),data:{booking}};
 decodedEvents.add(event);return event;
}
/** Verify the vendor's unmodified bytes before interpreting its payload. */
export async function bookingEvent(vendor:'calcom'|'calendly',secret:string,raw:string,header:string,now=Date.now()):Promise<SignalEvent>{
 if(vendor==='calendly'){
  const parts=header.split(',').map(part=>part.trim().split('='));
  const times=parts.filter(([key])=>key==='t'),timestamp=times.length===1?times[0]?.[1]:undefined;
  const signatures=parts.filter(([key])=>key==='v1').map(([,value])=>value??'');
  if(!timestamp||!/^\d{10}$/.test(timestamp)||Math.abs(now-Number(timestamp)*1000)>180000||!(await Promise.all(signatures.map(signature=>verify(secret,`${timestamp}.${raw}`,signature)))).some(Boolean))throw new IngestionError(401,'Booking signature is invalid or expired.');
 }else if(!await verify(secret,raw,header))throw new IngestionError(401,'Booking signature is invalid.');
 const event=await decodeBooking(vendor,raw);
 if(vendor==='calcom'&&Math.abs(now-Date.parse(event.occurredAt))>300000)throw new IngestionError(401,'Booking event is outside the five-minute delivery window.');
 if(Date.parse(event.occurredAt)>now)throw new IngestionError(400,'Booking event time is in the future.');
 return event;
}
