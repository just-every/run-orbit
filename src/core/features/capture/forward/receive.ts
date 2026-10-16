import type {SourceSecurity} from '../../../platform/source-security';
import {captureItems} from '../sources';
import {addressedTo,type MailboxConfig} from './address';
import {forwardingConfirmation} from './confirmation';
import {forwardSource,rememberConfirmation} from './source';

export const MAX_FORWARDED_BYTES=10*1024*1024;
export type ForwardOutcome = {result:'refused';reason:string} | {result:'confirmation'} | {result:'captured';summary:Awaited<ReturnType<typeof captureItems>>};

/**
 * One message delivered to the Orbit address, by Cloudflare Email Routing or
 * SendGrid Inbound Parse. Only the installation's tagged address is accepted.
 * The message then follows the same capture rules as an imported .eml file:
 * known participants only, replies and bookings stop outreach at once, and
 * everything else waits as a proposal.
 */
export async function receiveForwarded(db:D1Database,security:SourceSecurity|undefined,config:MailboxConfig|null,input:{recipients:string[];raw:string}):Promise<ForwardOutcome>{
 if(!config||!security)return {result:'refused',reason:'This Orbit has no mail address.'};
 const live=await forwardSource(db,security);
 if(!live||!addressedTo(input.recipients,config,live.credential.tag))return {result:'refused',reason:'Unknown address.'};
 const confirmation=forwardingConfirmation(input.raw);
 if(confirmation){await rememberConfirmation(db,security,live,confirmation);return {result:'confirmation'};}
 const summary=await captureItems(db,live.source,[{kind:'message',raw:input.raw}],{includeUnknown:false});
 // The owner sent this message on purpose: say on the source why it was not stored.
 const reason=Object.keys(summary.skipReasons)[0];
 await db.prepare("UPDATE capture_sources SET last_error=?,last_error_at=?,updated_at=? WHERE id=? AND connection_id IS ? AND state<>'disconnected'")
  .bind(reason?`Last message not stored: ${reason}.`:null,reason?new Date().toISOString():null,new Date().toISOString(),live.source.id,live.source.connection_id).run();
 return {result:'captured',summary};
}

/** Count an oversized message on the source rather than bouncing mail the owner chose to send. */
export async function recordOversized(db:D1Database,security:SourceSecurity|undefined,config:MailboxConfig|null,recipients:string[]){
 if(!config||!security)return false;
 const live=await forwardSource(db,security);
 if(!live||!addressedTo(recipients,config,live.credential.tag))return false;
 await db.prepare("UPDATE capture_sources SET skipped_count=skipped_count+1,last_error=?,last_error_at=?,updated_at=? WHERE id=? AND connection_id IS ? AND state<>'disconnected'")
  .bind('A message larger than 10 MB was not stored.',new Date().toISOString(),new Date().toISOString(),live.source.id,live.source.connection_id).run();
 return true;
}
