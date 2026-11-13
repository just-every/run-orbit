import {payloadHash} from '../../../platform/source-security';
import {WorkbenchError} from '../../workbench/repository';
import {renderDraft} from '../../drafts/render';
import {nativeMailDatabase} from '../record-mail-storage';
export interface MailboxBinding{sourceId:string;connectionId:string;address:string;provider:string}
export async function sendMailboxes(db:D1Database,actor:string){
 return (await nativeMailDatabase(db).prepare(`SELECT a.source_id AS sourceId,a.connection_id AS connectionId,a.mailbox_address AS address,a.provider,c.name,a.retry_at AS retryAt FROM mailbox_send_authorizations a JOIN capture_sources c ON c.id=a.source_id AND c.connection_id=a.connection_id JOIN capture_credentials k ON k.source_id=c.id WHERE a.operator_id=? AND a.state='authorized' AND c.state IN('connected','syncing') ORDER BY c.name,c.id`).bind(actor).all<MailboxBinding&{name:string;retryAt:string|null}>()).results;
}
export async function mailboxReview(db:D1Database,draftId:string,actor:string,sourceId?:string){
 if(!sourceId)return undefined;
 const mailbox=(await sendMailboxes(db,actor)).find(row=>row.sourceId===sourceId);
 if(!mailbox)throw new WorkbenchError(409,'This mailbox has no current send authorization for you. Reauthorize it in Settings before reviewing again.');
 const rendered=await renderDraft(db,draftId,actor);
 return {mailbox,hash:await payloadHash(JSON.stringify({actor,mailbox:{sourceId:mailbox.sourceId,connectionId:mailbox.connectionId,address:mailbox.address,provider:mailbox.provider},review:rendered.review}))};
}
export function mailboxApprovalFence(db:D1Database,actor:string,binding:MailboxBinding){
 return db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'mailbox_approval_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM mailbox_send_authorizations a JOIN capture_sources c ON c.id=a.source_id AND c.connection_id=a.connection_id JOIN capture_credentials k ON k.source_id=c.id WHERE a.source_id=? AND a.connection_id=? AND a.mailbox_address=? AND a.provider=? AND a.operator_id=? AND a.state='authorized' AND c.state IN('connected','syncing'))`).bind(binding.sourceId,binding.connectionId,binding.address,binding.provider,actor);
}
