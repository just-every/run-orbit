import type {SourceSecurity} from '../../platform/source-security';
import type {ProviderFetch} from '../capture/providers/config';
export const zoomSource='zoom';
export const ownership='Zoom runs the meeting. Orbit keeps its reviewed deal activity, preparation and follow-up.';
export interface ZoomConfig {security?:SourceSecurity;fetcher?:ProviderFetch;origin?:string;now?:()=>Date}
export interface ZoomCredentials {accountId:string;clientId:string;clientSecret:string;webhookSecret:string}
export interface ZoomMeeting {id:string;uuid:string;topic:string;start:string;end:string;duration:number;hostId:string;joinUrl:string;participants:string[];recording:'disabled'|'permission-not-granted'|'permission-held-unused'}
export interface ZoomRow {signal_id:string;meeting_id:string;meeting_uuid:string;opportunity_id:string;join_url:string;host_id:string;duration:number;state:'scheduled'|'completed'|'cancelled';recording:string;attendance_json:string;attendance_state:string;completed_at:string|null;completion_entry_id:string|null;cancelled_at:string|null;last_event_at:number}
export class ZoomError extends Error {constructor(readonly status:400|401|403|404|409|413|502|503,message:string){super(message);}}
