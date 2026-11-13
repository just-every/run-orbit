import {z} from 'zod';
import {ZoomError,type ZoomConfig,type ZoomCredentials,type ZoomMeeting} from './contracts';
const tokenSchema=z.object({access_token:z.string().min(1),token_type:z.string().refine(value=>value.toLowerCase()==='bearer'),scope:z.string().default('')});
async function response(config:ZoomConfig,url:string,init:RequestInit){
 let result:Response;try{result=await(config.fetcher??fetch)(url,{...init,redirect:'manual',signal:AbortSignal.timeout(15000)});}catch{throw new ZoomError(502,'Zoom is unavailable. No meeting was changed. Try again after checking the connection.');}
 if([401,403].includes(result.status))throw new ZoomError(403,'Zoom refused access. Check the app credentials and granted meeting permissions in Settings.');
 if(result.status===404)throw new ZoomError(404,'Zoom could not read that meeting. Check its exact ID and this app’s access.');
 if(!result.ok)throw new ZoomError(502,'Zoom could not complete the read. No meeting was changed.');
 try{return await result.json();}catch{throw new ZoomError(502,'Zoom returned an unreadable response. No meeting was changed.');}
}
/** Account credentials go only to Zoom's documented token endpoint; no token is persisted or returned to a browser. */
export async function zoomToken(config:ZoomConfig,credentials:ZoomCredentials){
 const value=tokenSchema.safeParse(await response(config,'https://zoom.us/oauth/token',{method:'POST',headers:{Authorization:'Basic '+btoa(credentials.clientId+':'+credentials.clientSecret),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'account_credentials',account_id:credentials.accountId}).toString()}));
 if(!value.success)throw new ZoomError(502,'Zoom returned no usable access token.');
 return {token:value.data.access_token,scopes:value.data.scope.split(/\s+/).filter(Boolean)};
}
export function zoomRead(config:ZoomConfig,token:string,path:string){return response(config,'https://api.zoom.us/v2'+path,{method:'GET',headers:{Authorization:'Bearer '+token}});}
const meetingSchema=z.object({id:z.union([z.number().int().positive(),z.string().regex(/^\d{9,11}$/)]),uuid:z.string().min(1).max(200),type:z.number(),topic:z.string().min(1).max(2000),start_time:z.iso.datetime(),duration:z.number().int().min(1).max(1440),host_id:z.string().min(1).max(200),join_url:z.url(),settings:z.object({auto_recording:z.enum(['none','local','cloud']).optional(),meeting_invitees:z.array(z.object({email:z.email()})).max(1000).optional()}).optional()});
export async function readMeeting(config:ZoomConfig,auth:{token:string;scopes:string[]},id:string):Promise<ZoomMeeting>{
 const parsed=meetingSchema.safeParse(await zoomRead(config,auth.token,'/meetings/'+encodeURIComponent(id)));
 if(!parsed.success)throw new ZoomError(502,'Zoom did not return complete scheduled meeting details.');
 const meeting=parsed.data,url=new URL(meeting.join_url);
 if(String(meeting.id)!==id)throw new ZoomError(409,'Zoom returned a different meeting ID. Nothing was attached.');
 if(meeting.type!==2)throw new ZoomError(409,'Choose a scheduled, non-recurring Zoom meeting so the reviewed occurrence is exact.');
 if(url.protocol!=='https:'||url.username||url.password||!/(^|\.)zoom\.(us|com)$/.test(url.hostname))throw new ZoomError(502,'Zoom returned an unsupported meeting link.');
 const recording=meeting.settings?.auto_recording==='none'?'disabled':auth.scopes.some(scope=>scope.startsWith('cloud_recording:')||scope==='recording:read:admin')?'permission-held-unused':'permission-not-granted';
 return {id,uuid:meeting.uuid,topic:meeting.topic,start:meeting.start_time,end:new Date(Date.parse(meeting.start_time)+meeting.duration*60000).toISOString(),duration:meeting.duration,hostId:meeting.host_id,joinUrl:meeting.join_url,participants:[...new Set((meeting.settings?.meeting_invitees??[]).map(person=>person.email.trim().toLowerCase()))],recording};
}
const participantsSchema=z.object({participants:z.array(z.object({user_email:z.string().default(''),join_time:z.iso.datetime().optional(),leave_time:z.iso.datetime().optional()})).max(300),next_page_token:z.string().optional()});
/** Only attendance metadata, never recording files or transcript content. Zoom requires double encoding for slash-bearing UUIDs. */
export async function pastParticipants(config:ZoomConfig,token:string,uuid:string){
 const encoded=uuid.startsWith('/')||uuid.includes('//')?encodeURIComponent(encodeURIComponent(uuid)):encodeURIComponent(uuid),people:{email:string;joinedAt:string|null;leftAt:string|null}[]=[];
 let next='';
 for(let page=0;page<10;page++){
  const parsed=participantsSchema.safeParse(await zoomRead(config,token,`/past_meetings/${encoded}/participants?page_size=300${next?'&next_page_token='+encodeURIComponent(next):''}`));
  if(!parsed.success)throw new ZoomError(502,'Zoom returned unreadable attendance. Attendance remains unresolved.');
  for(const person of parsed.data.participants){const email=z.email().safeParse(person.user_email.trim().toLowerCase());people.push({email:email.success?email.data:'',joinedAt:person.join_time??null,leftAt:person.leave_time??null});}
  next=parsed.data.next_page_token??'';if(!next)return people;
 }
 throw new ZoomError(502,'Zoom attendance exceeds this read. Attendance remains unresolved.');
}
