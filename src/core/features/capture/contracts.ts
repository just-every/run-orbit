/**
 * capture.source.v1: what a mail or calendar source supplies to Orbit.
 *
 * A source declares the limited read scope it was granted, pulls pages after an
 * opaque cursor it owns, and hands Orbit raw RFC 5322 messages and iCalendar
 * text. Orbit stores the cursor with each page's effects, so a crash resumes
 * from the last committed page and replay identity (Message-ID, or UID with
 * SEQUENCE) keeps a re-read page from duplicating anything. Gmail's cursor is
 * a history ID and Microsoft Graph's is a delta link; neither is interpreted
 * here. The file import is the first adapter: one page, no cursor, no credential.
 */
export interface CaptureScope {mail?:{folders:string[]};calendars?:string[];calendarWindow?:{start:string;end:string}}
export type CaptureItem = {kind:'message';raw:string} | {kind:'calendar';raw:string};
export interface CapturePage {items:CaptureItem[];cursor:string|null;more:boolean}
export interface CaptureSourceAdapter {
 readonly adapter:string;
 readonly scope:CaptureScope;
 /** Read the page after `cursor` with the stored credential. Never writes to the provider. */
 pull(cursor:string|null,credential:string|null):Promise<CapturePage>;
}
/** `revoked`: the grant no longer works and intake stops until reconnected. `unavailable`: try again later. */
export class CaptureProviderError extends Error {constructor(readonly code:'revoked'|'unavailable',message:string){super(message);}}
export class CaptureError extends Error {constructor(readonly status:400|403|404|409|413|503,message:string){super(message);}}
export const FILE_SOURCE_ID='capture-files';
export const MAX_ITEMS_PER_IMPORT=500;
