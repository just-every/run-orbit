import {Hono} from 'hono';
import {z} from 'zod';
import {boundedRequestBody,RequestBodyTooLarge} from '../../platform/bounded-request-body';
import {payloadHash} from '../../platform/source-security';
import {audit} from '../records/shared';
import {ZoomError,zoomSource,type ZoomConfig,type ZoomRow} from './contracts';
import {authorized,connectionFence,openConnection} from './connection';
import {meetingPrivacy,participantMatches} from './repository';
import {pastParticipants} from './provider';
export async function zoomHmac(secret:string,value:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
async function signed(secret:string,raw:string,timestamp:string,signature:string,now:Date){
 if(!/^\d{10}$/.test(timestamp)||Math.abs(now.getTime()-Number(timestamp)*1000)>300000||!/^v0=[a-f0-9]{64}$/i.test(signature))return false;
 const expected='v0='+await zoomHmac(secret,`v0:${timestamp}:${raw}`);let difference=0;for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^signature.toLowerCase().charCodeAt(i);return difference===0;
}
const envelope=z.object({event:z.enum(['endpoint.url_validation','meeting.ended','meeting.deleted']),event_ts:z.number().int().positive(),payload:z.object({plainToken:z.string().min(1).max(1000).optional(),object:z.object({id:z.union([z.number().int().positive(),z.string().regex(/^\d{9,11}$/)]),uuid:z.string().min(1).max(200),end_time:z.iso.datetime().optional()}).passthrough().optional()}).passthrough()});
export function zoomWebhookRoutes(db:D1Database,config:ZoomConfig){
 const app=new Hono();
 app.onError((error,c)=>error instanceof ZoomError?c.json({error:error.message},error.status):c.json({error:'Zoom delivery could not be applied. No completion was confirmed.'},503));
 app.post('/',async c=>{
  let raw:string;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(await boundedRequestBody(c.req.raw,262144));}catch(error){throw new ZoomError(error instanceof RequestBodyTooLarge?413:400,'Zoom delivery is unreadable or too large.');}
  const saved=await openConnection(db,config),now=config.now?.()??new Date(),timestamp=c.req.header('x-zm-request-timestamp')??'';
  if(!await signed(saved.credentials.webhookSecret,raw,timestamp,c.req.header('x-zm-signature')??'',now))throw new ZoomError(401,'Zoom signature is invalid or stale.');
  const digest=await payloadHash(raw);
  if(await db.prepare('SELECT 1 FROM zoom_deliveries WHERE digest=?').bind(digest).first())throw new ZoomError(409,'This Zoom delivery was already received.');
  let json:unknown;try{json=JSON.parse(raw);}catch{throw new ZoomError(400,'Zoom delivery must be valid JSON.');}
  const parsed=envelope.safeParse(json);if(!parsed.success)throw new ZoomError(400,'Zoom delivery does not name a supported event and exact occurrence.');
  const event=parsed.data,receipt=db.prepare('INSERT INTO zoom_deliveries VALUES(?,?)').bind(digest,now.toISOString());
  if(event.event==='endpoint.url_validation'){
   if(!event.payload.plainToken)throw new ZoomError(400,'Zoom validation needs its plain token.');
   await db.batch([connectionFence(db,saved.ciphertext),receipt]);
   return c.json({plainToken:event.payload.plainToken,encryptedToken:await zoomHmac(saved.credentials.webhookSecret,event.payload.plainToken)});
  }
  const object=event.payload.object;if(!object)throw new ZoomError(400,'Zoom delivery needs a meeting occurrence.');
  const row=await db.prepare('SELECT * FROM zoom_meetings WHERE meeting_uuid=? AND meeting_id=?').bind(object.uuid,String(object.id)).first<ZoomRow>();
  // Do not import from an unsolicited callback, nor recreate an erased meeting.
  if(!row||row.state==='cancelled'||event.event_ts<=row.last_event_at||(event.event==='meeting.ended'&&row.state==='completed')){
   await db.batch([connectionFence(db,saved.ciphertext),receipt]);return c.json({ignored:true});
  }
  const fence=db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'zoom_meeting_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM zoom_meetings WHERE signal_id=? AND state=? AND last_event_at=?)").bind(row.signal_id,row.state,row.last_event_at);
  if(event.event==='meeting.deleted'){
   await db.batch([connectionFence(db,saved.ciphertext),fence,receipt,
    db.prepare("UPDATE zoom_meetings SET state='cancelled',cancelled_at=?,last_event_at=? WHERE signal_id=?").bind(now.toISOString(),event.event_ts,row.signal_id),
    db.prepare("UPDATE signals SET type='meeting.cancelled' WHERE id=?").bind(row.signal_id),
    db.prepare("UPDATE timeline_entries SET payload_json=json_set(payload_json,'$.type','meeting.cancelled','$.text','Zoom meeting cancelled') WHERE source='zoom' AND json_extract(payload_json,'$.signalId')=?").bind(row.signal_id),
    db.prepare("UPDATE handoff_tasks SET status='cancelled',revision=lower(hex(randomblob(16))),updated_at=? WHERE status='open' AND id IN(SELECT handoff_id FROM zoom_plan_actions WHERE signal_id=?)").bind(now.toISOString(),row.signal_id),
    audit(db,null,'zoom.meeting-cancelled','signal',row.signal_id),db.prepare('UPDATE signal_sources SET last_accepted_at=? WHERE id=?').bind(now.toISOString(),zoomSource)]);
   return c.json({cancelled:true,signalId:row.signal_id});
  }
  if(!object.end_time)throw new ZoomError(400,'Zoom completion needs its recorded end time.');
  const signal=await db.prepare('SELECT subject,payload_json FROM signals WHERE id=?').bind(row.signal_id).first<{subject:string;payload_json:string}>();
  if(!signal)throw new ZoomError(409,'This meeting was erased.');
  let people:Awaited<ReturnType<typeof pastParticipants>>=[],attendanceState='available';
  try{const auth=await authorized(db,config);if(auth.ciphertext!==saved.ciphertext)throw new ZoomError(409,'Zoom connection changed during delivery.');people=await pastParticipants(config,auth.token,row.meeting_uuid);}catch(error){
   if(!(error instanceof ZoomError))throw error;
   if(error.status===409)throw error;
   attendanceState=error.status===403?'permission-denied':'unavailable';
   // A denied metadata read stays visible. The authenticated ended event still proves completion.
  }
  const original=JSON.parse(signal.payload_json) as {data:{start:string;end:string;participants:string[]}},participants=await participantMatches(db,people.map(person=>person.email));
  const privacy=await meetingPrivacy(db,{uuid:row.meeting_uuid,topic:signal.subject,start:original.data.start,end:original.data.end,participants:[...original.data.participants,...people.map(person=>person.email).filter(Boolean)]});
  if(await privacy.blocked())throw new ZoomError(409,'Completion contains evidence removed by erasure.');
  const activity=await db.prepare("SELECT id FROM timeline_entries WHERE source='zoom' AND json_extract(payload_json,'$.signalId')=?").bind(row.signal_id).first<{id:string}>();
  if(!activity)throw new ZoomError(409,'The attached meeting activity is no longer available.');
  // Preserve the immutable attach payload. Current phase and attendance belong to this same attached activity.
  await db.batch([connectionFence(db,saved.ciphertext),fence,...privacy.fences(),receipt,
   db.prepare("UPDATE zoom_meetings SET state='completed',attendance_json=?,attendance_state=?,completed_at=?,completion_entry_id=?,completion_digest=?,completion_timestamp=?,last_event_at=? WHERE signal_id=?").bind(JSON.stringify(people),attendanceState,object.end_time,activity.id,digest,timestamp,event.event_ts,row.signal_id),
   db.prepare("UPDATE signals SET type='meeting.completed' WHERE id=?").bind(row.signal_id),
   db.prepare("UPDATE timeline_entries SET payload_json=json_set(payload_json,'$.type','meeting.completed','$.text','Zoom meeting completed','$.completedAt',?) WHERE id=?").bind(object.end_time,activity.id),
   ...participants.flatMap(person=>person.contactId?[db.prepare("INSERT OR IGNORE INTO signal_links VALUES(?,'contact',?,'Exact attendance email',?)").bind(row.signal_id,person.contactId,now.toISOString()),db.prepare("INSERT OR IGNORE INTO timeline_entry_records VALUES(?,'contact',?)").bind(activity.id,person.contactId)]:[]),
   audit(db,null,'zoom.meeting-completed','signal',row.signal_id),db.prepare('UPDATE signal_sources SET last_accepted_at=? WHERE id=?').bind(now.toISOString(),zoomSource)]);
  return c.json({completed:true,signalId:row.signal_id,attendanceState});
 });
 return app;
}
