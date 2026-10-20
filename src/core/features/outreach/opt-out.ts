import { createId } from '../../shared/ids';
import { audit, RecordError } from '../records/shared';
import { WorkbenchError } from '../workbench/repository';
export type MessageType='one_to_one'|'sequence'|'workflow';
export type OptOutChoice='relationship'|'transactional'|'added';
export const messageTypes:MessageType[]=['one_to_one','sequence','workflow'];
/** Defaults for a type with no stored row: one-to-one off on a new installation, sequence and workflow email on. The migration stores one-to-one on for an installation upgraded with users present. */
const defaults:Record<MessageType,{carries:number;basis:string}>={one_to_one:{carries:0,basis:'default for a new installation'},sequence:{carries:1,basis:'default'},workflow:{carries:1,basis:'default'}};
const settingSql=(type:string)=>`SELECT COALESCE((SELECT carries FROM opt_out_settings WHERE message_type='${type}'),${defaults[type as MessageType].carries}) AS carries,COALESCE((SELECT removal_allowed FROM opt_out_settings WHERE message_type='${type}'),1) AS removal_allowed`;
/** Kept for transports without the supported installation-origin capability path. */
export const relayRefusal='This relay cannot carry your opt-out link yet (OUT-013)';
/** A one-to-one message replies in an existing thread when its recipient has a genuine email reply (never an automatic one) recorded on the deal. */
const replySql=(opportunity:string,contact:string)=>`EXISTS(SELECT 1 FROM signals s JOIN signal_links lo ON lo.signal_id=s.id AND lo.record_type='opportunity' AND lo.record_id=${opportunity} JOIN signal_links lc ON lc.signal_id=s.id AND lc.record_type='contact' AND lc.record_id=${contact} WHERE s.type='email.replied')`;
/** On a transport that cannot carry opt-out, sequence and workflow email is always refused, and one-to-one email that needs opt-out is refused unless it is such a reply, which is sent labelled. */
export function relayRefuses(type:MessageType,wanted:boolean,reply:boolean){return type!=='one_to_one'||wanted&&!reply;}
export function relayRefusalAudit(db:D1Database,actor:string,entityType:'draft'|'outbound_message',entityId:string,type:MessageType='one_to_one'){return audit(db,actor,'opt_out.relay_refused',entityType,entityId,{messageType:type,reason:relayRefusal});}
interface Setting {message_type:MessageType;carries:number;removal_allowed:number;basis:string;updated_by:string|null;updated_by_name:string|null;updated_at:string|null}
export async function optOutSettings(db:D1Database){
 const rows=(await db.prepare('SELECT s.*,o.display_name AS updated_by_name FROM opt_out_settings s LEFT JOIN operators o ON o.id=s.updated_by').all<Setting>()).results;
 const counts=(await db.prepare("SELECT COALESCE(b.carries,-1) AS carries,COUNT(*) AS n FROM outbound_messages m LEFT JOIN outbound_message_opt_out b ON b.message_id=m.id WHERE m.state IN('scheduled','draft') GROUP BY COALESCE(b.carries,-1)").all<{carries:number;n:number}>()).results;
 const count=(carries:number)=>counts.find(row=>row.carries===carries)?.n??0;
 return {types:messageTypes.map(type=>{const row=rows.find(item=>item.message_type===type);return row?{type,carries:row.carries===1,removalAllowed:row.removal_allowed===1,basis:row.basis,updatedBy:row.updated_by_name,updatedAt:row.updated_at}:{type,carries:defaults[type].carries===1,removalAllowed:true,basis:defaults[type].basis,updatedBy:null,updatedAt:null};}),
  approvedUnsent:{carrying:count(1),notCarrying:count(0),approvedBeforeSetting:count(-1)},
  relayRefused:(await db.prepare("SELECT COUNT(*) AS n FROM audit_entries WHERE action='opt_out.relay_refused'").first<{n:number}>())!.n};
}
export async function setOptOut(db:D1Database,actor:string,type:MessageType,input:{carries:boolean;removalAllowed:boolean}){
 if(!await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor).first())throw new RecordError(403,'Only the installation owner changes opt-out settings until TEAM-005 adds the administrator role.');
 const before=(await db.prepare(settingSql(type)).first<{carries:number;removal_allowed:number}>())!;
 const now=new Date().toISOString();
 await db.batch([db.prepare("INSERT INTO opt_out_settings(message_type,carries,removal_allowed,basis,updated_by,updated_at) VALUES(?,?,?,'set by the owner',?,?) ON CONFLICT(message_type) DO UPDATE SET carries=excluded.carries,removal_allowed=excluded.removal_allowed,basis=excluded.basis,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(type,input.carries?1:0,input.removalAllowed?1:0,actor,now),
  // ACTION-005: drafts not yet approved at their current revision show a changed opt-out state, so they need review again.
  ...(type==='one_to_one'?[db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Opt-out setting changed',updated_at=? WHERE is_stale=0 AND NOT EXISTS(SELECT 1 FROM outbound_messages m WHERE m.draft_id=drafts.id AND m.revision=drafts.revision)").bind(now)]:[]),
  audit(db,actor,'opt_out.setting.changed','message_type',type,{previous:{carries:before.carries===1,removalAllowed:before.removal_allowed===1},current:input})]);
 return optOutSettings(db);
}
/** The opt-out state a one-to-one draft would be approved with now, and why. `transport` is false where the transport cannot carry Orbit's opt-out; there `refusal` names why approval is refused. */
export async function draftOptOut(db:D1Database,draftId:string,transport=true){
 const row=await db.prepare(`SELECT s.carries,s.removal_allowed,c.choice,${replySql('d.opportunity_id','d.recipient_contact_id')} AS reply FROM drafts d CROSS JOIN (${settingSql('one_to_one')}) s LEFT JOIN draft_opt_out c ON c.draft_id=d.id WHERE d.id=?`).bind(draftId).first<{carries:number;removal_allowed:number;choice:OptOutChoice|null;reply:number}>();
 if(!row)throw new WorkbenchError(404,'Draft not found.');
 const setting=row.carries===1,removalAllowed=row.removal_allowed===1,choice=row.choice,reply=row.reply===1;
 const wanted=setting?!(choice&&choice!=='added'&&removalAllowed):choice==='added';
 const carries=wanted&&transport,marking:OptOutChoice|'transport'|null=wanted&&!transport?'transport':setting&&!wanted?choice:!setting&&wanted?'added':null;
 return {setting,removalAllowed,choice,transport,carries,marking,reply,refusal:wanted&&!transport&&relayRefuses('one_to_one',wanted,reply)?relayRefusal:null};
}
/** Dispatch re-checks a message on the managed relay: one whose approval bound opt-out (including through another provider), marked it uncarried, or predates OUT-020 is refused unless it is a reply in an existing thread. */
export async function relayRefusedAtDispatch(db:D1Database,messageId:string,capable=false){
 return Boolean(await db.prepare(`SELECT 1 FROM outbound_messages m LEFT JOIN outbound_message_opt_out b ON b.message_id=m.id WHERE m.id=? AND (${capable?"b.marking='transport'":"b.message_id IS NULL OR b.carries=1 OR b.marking='transport'"}) AND NOT ${replySql('m.opportunity_id','m.contact_id')}`).bind(messageId).first());
}
export async function markDraftOptOut(db:D1Database,draftId:string,actor:string,choice:OptOutChoice|null){
 const state=await draftOptOut(db,draftId);
 if(choice&&choice!=='added'&&!state.setting)throw new WorkbenchError(409,'This message carries no opt-out, so there is nothing to remove.');
 if(choice&&choice!=='added'&&!state.removalAllowed)throw new WorkbenchError(409,'An administrator has forbidden removing opt-out from one-to-one email.');
 if(choice==='added'&&state.setting)throw new WorkbenchError(409,'One-to-one email already carries opt-out.');
 if(choice===state.choice)return draftOptOut(db,draftId);
 const now=new Date().toISOString(),entry=createId();
 await db.batch([choice?db.prepare('INSERT INTO draft_opt_out VALUES(?,?,?,?) ON CONFLICT(draft_id) DO UPDATE SET choice=excluded.choice,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(draftId,choice,actor,now):db.prepare('DELETE FROM draft_opt_out WHERE draft_id=?').bind(draftId),
  // ACTION-005: a reviewed draft whose opt-out state changes must be reviewed again.
  db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Opt-out state changed',updated_at=? WHERE id=?").bind(now,draftId),
  db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'draft.opt_out_changed',?,?,'operator',?,'outreach',?)").bind(entry,now,now,actor,JSON.stringify({draftId,choice})),
  db.prepare("INSERT INTO timeline_entry_records(timeline_entry_id,record_type,record_id) SELECT ?,'opportunity',opportunity_id FROM drafts WHERE id=?").bind(entry,draftId)]);
 return draftOptOut(db,draftId);
}
/** Statements that bind the reviewed opt-out state to the approved message, aborting the approval if the setting or marking moved since it was read. */
export function bindOptOut(db:D1Database,messageId:string,draftId:string,state:Awaited<ReturnType<typeof draftOptOut>>){
 return [db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'opt_out_changed',NULL WHERE NOT EXISTS(SELECT 1 FROM (${settingSql('one_to_one')}) WHERE carries=? AND removal_allowed=?) OR COALESCE((SELECT choice FROM draft_opt_out WHERE draft_id=?),'')<>?`).bind(state.setting?1:0,state.removalAllowed?1:0,draftId,state.choice??''),
  db.prepare('INSERT INTO outbound_message_opt_out(message_id,carries,marking) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM outbound_messages WHERE id=?)').bind(messageId,state.carries?1:0,state.marking,messageId)];
}
/** Delivery reads the bound state; undefined for a message approved before OUT-020, which keeps its original transport behaviour. */
export async function boundOptOut(db:D1Database,messageId:string){
 const row=await db.prepare('SELECT carries FROM outbound_message_opt_out WHERE message_id=?').bind(messageId).first<{carries:number}>();
 return row?row.carries===1:undefined;
}
