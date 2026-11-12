import {createId} from '../../shared/ids';
import {payloadHash} from '../../platform/source-security';
import {capturePrivacy} from '../capture/privacy';
import {contactEmailKey} from '../records/identity';
import {audit,requireRecord} from '../records/shared';
import {ZoomError,zoomSource,type ZoomConfig,type ZoomMeeting,type ZoomRow} from './contracts';
import {authorized,connectionFence,refused} from './connection';
import {readMeeting} from './provider';
export const meetingRow=(db:D1Database,signalId:string)=>db.prepare('SELECT * FROM zoom_meetings WHERE signal_id=?').bind(signalId).first<ZoomRow>();
/** Exact normalized mailbox or retained alias; multiple candidates are explicitly unresolved. Names never match. */
export async function participantMatches(db:D1Database,emails:string[]){
 const result:{email:string;contactId:string|null;state:'matched'|'ambiguous'|'unknown'|'operator'|'not-supplied'}[]=[];
 for(const email of [...new Set(emails)]){
  const key=contactEmailKey(email);
  if(!key){result.push({email:'',contactId:null,state:'not-supplied'});continue;}
  if(await db.prepare('SELECT 1 FROM operators WHERE lower(trim(email))=?').bind(key).first()){result.push({email:key,contactId:null,state:'operator'});continue;}
  const matches=(await db.prepare("SELECT id FROM contacts WHERE email_key=? UNION SELECT c.id FROM record_aliases a JOIN contacts c ON c.id=a.survivor_id WHERE a.record_type='contact' AND a.identity_key=?").bind(key,key).all<{id:string}>()).results;
  result.push({email:key,contactId:matches.length===1?matches[0]!.id:null,state:matches.length===1?'matched':matches.length?'ambiguous':'unknown'});
 }
 return result;
}
export async function meetingPrivacy(db:D1Database,meeting:{uuid:string;topic:string;start:string;end:string;participants:string[]}){
 return capturePrivacy(db,{kind:'event',uid:meeting.uuid,eventId:'zoom:'+meeting.uuid,hash:'',recurrenceId:null,originalAt:meeting.start,sequence:0,phase:'booked',occurredAt:meeting.start,subject:meeting.topic,start:meeting.start,end:meeting.end,participants:meeting.participants.map(email=>({email,name:'',role:'attendee'})),headers:'',body:JSON.stringify(meeting),quote:[]});
}
export async function preview(db:D1Database,config:ZoomConfig,actor:string,meetingId:string,opportunityId:string){
 const deal=await requireRecord(db,'opportunity',opportunityId),auth=await authorized(db,config);
 let meeting:ZoomMeeting;try{meeting=await readMeeting(config,auth,meetingId);}catch(error){if(error instanceof ZoomError&&error.status===403)await refused(db,error.message);throw error;}
 const privacy=await meetingPrivacy(db,meeting);if(await privacy.blocked())throw new ZoomError(409,'This meeting contains evidence removed by erasure. It cannot be imported again.');
 const selected={id:opportunityId,title:String(deal.title)},digest=await payloadHash(JSON.stringify({actor,selected,meeting}));
 return {meeting,deal:selected,digest,participants:await participantMatches(db,meeting.participants),ownership:'Zoom runs the meeting; attaching it sends no invitation and changes no outreach state.',auth,privacy};
}
export async function attach(db:D1Database,config:ZoomConfig,actor:string,input:{meetingId:string;opportunityId:string;previewDigest:string}){
 const reviewed=await preview(db,config,actor,input.meetingId,input.opportunityId);
 if(reviewed.digest!==input.previewDigest)throw new ZoomError(409,'The meeting or chosen deal changed. Review its exact details again.');
 const existing=await db.prepare('SELECT signal_id,opportunity_id FROM zoom_meetings WHERE meeting_uuid=?').bind(reviewed.meeting.uuid).first<{signal_id:string;opportunity_id:string}>();
 if(existing){if(existing.opportunity_id!==input.opportunityId)throw new ZoomError(409,'This exact Zoom occurrence is already attached to another deal.');return {signalId:existing.signal_id,planHref:'/app/meetings/'+existing.signal_id,replayed:true};}
 const id=createId(),entryId=createId(),at=(config.now?.()??new Date()).toISOString(),{meeting,participants}=reviewed;
 const payload=JSON.stringify({eventId:'zoom:'+meeting.uuid,type:'meeting.booked',subject:meeting.topic,occurredAt:meeting.start,data:{capturePrivacyKeys:reviewed.privacy.keys,start:meeting.start,end:meeting.end,participants:meeting.participants,meetingId:meeting.id,meetingUuid:meeting.uuid,joinUrl:meeting.joinUrl,hostId:meeting.hostId,duration:meeting.duration}});
 const links=[{type:'opportunity',id:input.opportunityId},...participants.flatMap(person=>person.contactId?[{type:'contact',id:person.contactId}]:[])];
 const statements=[connectionFence(db,reviewed.auth.ciphertext),...reviewed.privacy.fences(),
  db.prepare('INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json) VALUES(?,?,?,\'meeting.booked\',?,?,?,?,\'observed\',\'Reviewed exact Zoom meeting and deal\',?,?)').bind(id,zoomSource,'zoom:'+meeting.uuid,meeting.topic,meeting.start,at,await payloadHash(payload),at,payload),
  db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'signal.recorded',?,?,'operator',?,'zoom',?)").bind(entryId,meeting.start,at,actor,JSON.stringify({signalId:id,type:'meeting.booked',subject:meeting.topic,text:'Zoom meeting scheduled',meetingId:meeting.id,joinUrl:meeting.joinUrl})),
  ...links.flatMap(ref=>[db.prepare('INSERT INTO signal_links VALUES(?,?,?,?,?)').bind(id,ref.type,ref.id,ref.type==='opportunity'?'Explicit reviewed choice':'Exact email',at),db.prepare('INSERT INTO timeline_entry_records VALUES(?,?,?)').bind(entryId,ref.type,ref.id)]),
  db.prepare("INSERT INTO zoom_meetings(signal_id,meeting_id,meeting_uuid,opportunity_id,join_url,host_id,duration,state,recording) VALUES(?,?,?,?,?,?,?,'scheduled',?)").bind(id,meeting.id,meeting.uuid,input.opportunityId,meeting.joinUrl,meeting.hostId,meeting.duration,meeting.recording),
  audit(db,actor,'zoom.meeting-attached','signal',id,{meetingId:meeting.id,opportunityId:input.opportunityId})];
 await db.batch(statements);
 return {signalId:id,planHref:'/app/meetings/'+id,replayed:false};
}
