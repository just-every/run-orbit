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
const cal=z.object({triggerEvent:z.enum(['BOOKING_CREATED','BOOKING_CANCELLED']),createdAt:z.iso.datetime(),payload:z.object({uid:z.string().min(1),attendees:z.array(z.object({email:z.email(),name:z.string().optional()})).min(1),title:z.string().optional()})});
const calendly=z.object({event:z.enum(['invitee.created','invitee.canceled']),created_at:z.iso.datetime(),payload:z.object({uri:z.url(),email:z.email(),name:z.string().optional(),event:z.url()})});
/** Verify the vendor's unmodified bytes before interpreting its payload. */
export async function bookingEvent(vendor:'calcom'|'calendly',secret:string,raw:string,header:string,now=Date.now()):Promise<SignalEvent>{
 let timestamp:string|undefined;
 if(vendor==='calendly'){
  const parts=header.split(',').map(part=>part.trim().split('='));
  const times=parts.filter(([key])=>key==='t');timestamp=times.length===1?times[0]?.[1]:undefined;
  const signatures=parts.filter(([key])=>key==='v1').map(([,value])=>value??'');
  if(!timestamp||!/^\d{10}$/.test(timestamp)||Math.abs(now-Number(timestamp)*1000)>180000||!(await Promise.all(signatures.map(signature=>verify(secret,`${timestamp}.${raw}`,signature)))).some(Boolean))throw new IngestionError(401,'Booking signature is invalid or expired.');
 }else if(!await verify(secret,raw,header))throw new IngestionError(401,'Booking signature is invalid.');
 let body:unknown;try{body=JSON.parse(raw);}catch{throw new IngestionError(400,'Invalid booking payload.');}
 const parsed=vendor==='calcom'?cal.safeParse(body):calendly.safeParse(body);
 if(!parsed.success)throw new IngestionError(400,'Use a booking created or cancelled webhook with an invitee email.');
 const value=parsed.data;
 let identity:string,email:string,occurredAt:string,cancelled:boolean;
 if('triggerEvent' in value){
  occurredAt=value.createdAt;if(Math.abs(now-Date.parse(occurredAt))>300000)throw new IngestionError(401,'Booking event is outside the five-minute delivery window.');
  identity=`${value.triggerEvent}:${value.payload.uid}:${value.payload.attendees[0]!.email.toLowerCase()}`;email=value.payload.attendees[0]!.email;cancelled=value.triggerEvent==='BOOKING_CANCELLED';
 }else{occurredAt=value.created_at;identity=`${value.event}:${value.payload.uri}`;email=value.payload.email;cancelled=value.event==='invitee.canceled';}
 if(Date.parse(occurredAt)>now)throw new IngestionError(400,'Booking event time is in the future.');
 return {eventId:`${vendor}:${await payloadHash(identity)}`,type:cancelled?'meeting.cancelled':'meeting.booked',subject:cancelled?'Meeting cancelled':'Meeting booked',email,occurredAt,data:{provider:vendor}};
}
