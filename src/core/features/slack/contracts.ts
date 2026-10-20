import type {SourceSecurity} from '../../platform/source-security';
export const eventKinds=['stage','won','due','handoff'] as const;
export type EventKind=typeof eventKinds[number];
export interface SlackConfig {security?:SourceSecurity;origin?:string;fetcher?:typeof fetch}
export interface Installation {id:string;team_id:string;bot_user_id:string;state:string;error:string|null;origin:string;connected_at:string;retry_at:string|null}
export interface Channel {id:string;name:string;events_json:string;enabled:number;last_error:string|null;retry_at:string|null}
export interface Notice {id:string;event_key:string;event_kind:EventKind;channel_id:string;record_type:'contact'|'company'|'opportunity';record_id:string|null;source_id:string|null;state:string;content_json:string|null;stage_from:string|null;stage_to:string|null;due_at:string|null;message_ts:string|null;error:string|null;retry_at:string|null;created_at:string;updated_at:string;acknowledged_by:string|null;acknowledged_at:string|null}
export class SlackError extends Error {constructor(public status:400|401|403|404|409|429|503,message:string){super(message);}}
