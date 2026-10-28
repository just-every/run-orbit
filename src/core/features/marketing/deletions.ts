import type {MiddlewareHandler} from 'hono';
import {createId} from '../../shared/ids';
import {audit} from '../records/shared';
import {MailchimpError,type MailchimpConfig} from './contracts';
import {connection,connectionSettings,markUnresolved,openSealed,sourceRow} from './connection';
import {mailchimpCall,MailchimpProviderError,refusalMessage} from './provider';

/**
 * DATA-003 for INTEGRATE-007: erasing a contact linked to a Mailchimp member requests that member's permanent deletion.
 * Each request is tracked apart from the erasure as append-only audit entries under its own ID. They carry the audience ID,
 * the subscriber hash and the connection it was requested under, never an email or contact ID, so the erasure leaves them in place.
 * The hash is removed as soon as Mailchimp confirms the deletion.
 */
export type DeletionState='queued'|'deleted'|'failed'|'uncertain'|'paused'|'held';
interface Deletion {id:string;listId:string;memberId:string|null;connection:string|null;state:DeletionState;reason:string|null;requestedAt:string;updatedAt:string}
const entity='mailchimp_deletion',open=['queued','paused','uncertain'];
const notConnected='Mailchimp is not connected. Connect it again to finish this deletion.';
const heldReason='Mailchimp was connected again, or Orbit was restored from an archive, after this deletion was requested. Confirm it to send it with the current connection.';

async function stored(db:D1Database,unfinished:boolean){
 const rows=(await db.prepare(`SELECT entity_id,action,details_json,occurred_at FROM audit_entries a WHERE entity_type=?${unfinished?" AND NOT EXISTS(SELECT 1 FROM audit_entries d WHERE d.entity_type=a.entity_type AND d.entity_id=a.entity_id AND d.action='mailchimp.deletion' AND json_extract(d.details_json,'$.state')='deleted')":''} ORDER BY occurred_at,rowid`).bind(entity).all<{entity_id:string;action:string;details_json:string;occurred_at:string}>()).results;
 const requests=new Map<string,Deletion>();
 for(const row of rows){
  let details:any={};try{details=JSON.parse(row.details_json);}catch{details={};}
  if(row.action==='mailchimp.deletion-requested'){requests.set(row.entity_id,{id:row.entity_id,listId:String(details.listId??''),memberId:typeof details.memberId==='string'?details.memberId:null,connection:typeof details.connection==='string'?details.connection:null,state:'queued',reason:null,requestedAt:row.occurred_at,updatedAt:row.occurred_at});continue;}
  const request=requests.get(row.entity_id);if(!request||row.action!=='mailchimp.deletion')continue;
  request.state=details.state;request.reason=typeof details.reason==='string'?details.reason:null;request.updatedAt=row.occurred_at;
  if(typeof details.connection==='string')request.connection=details.connection;
 }
 return [...requests.values()];
}
/** A request waits while Mailchimp is not connected, and one made under another connection (a reconnect, or an archive restore) is held for the owner. */
function current(request:Deletion,connected:boolean,connectedAt:string|null):Deletion{
 if(!open.includes(request.state))return request;
 if(!connected)return {...request,state:'paused',reason:request.state==='paused'&&request.reason?request.reason:notConnected};
 return request.connection===connectedAt?request:{...request,state:'held',reason:heldReason};
}
const mark=(db:D1Database,request:Deletion,state:DeletionState,reason:string|null)=>request.state===state&&request.reason===reason?null:audit(db,null,'mailchimp.deletion',entity,request.id,{state,reason}).run();
function deleted(db:D1Database,id:string){return db.batch([audit(db,null,'mailchimp.deletion',entity,id,{state:'deleted',reason:null}),db.prepare("UPDATE audit_entries SET details_json=json_remove(details_json,'$.memberId') WHERE entity_type=? AND entity_id=? AND action='mailchimp.deletion-requested'").bind(entity,id)]);}

/** The erasure hook: one request per Mailchimp member the contact was linked to, none for a contact Mailchimp never held. It reads the links before the erasure empties the contact's audit trail. */
export async function mailchimpErasure(db:D1Database,contactId:string,actor:string){
 const links=new Map<string,{listId:string;memberId:string;status:string}>();
 for(const row of (await db.prepare("SELECT details_json FROM audit_entries WHERE entity_type='contact' AND entity_id=? AND action='mailchimp.member' ORDER BY occurred_at,rowid").bind(contactId).all<{details_json:string}>()).results){
  try{const link=JSON.parse(row.details_json);if(/^[a-z0-9]{1,32}$/i.test(link.listId)&&/^[a-f0-9]{32}$/.test(link.memberId))links.set(`${link.listId}/${link.memberId}`,{listId:link.listId,memberId:link.memberId,status:String(link.status??'')});}catch{/* a blanked entry links nothing */}
 }
 const connectedAt=connectionSettings(await sourceRow(db))?.connectedAt??null;
 return [...links.values()].filter(link=>link.status!=='absent').map(link=>audit(db,actor,'mailchimp.deletion-requested',entity,createId(),{listId:link.listId,memberId:link.memberId,connection:connectedAt}));
}
/** Sends every waiting request once. A 204, or a 404 for the member of an audience this account still has, is a verified deletion; the erasure itself never waits for it. */
export async function processMailchimpDeletions(db:D1Database,config:MailchimpConfig){
 const waiting=(await stored(db,true)).filter(request=>open.includes(request.state));if(!waiting.length)return;
 const status=await connection(db),connectedAt=status.settings?.connectedAt??null;
 if(status.state!=='connected'){for(const request of waiting)await mark(db,request,'paused',request.state==='paused'&&request.reason?request.reason:notConnected);return;}
 const {apiKey}=await openSealed(db,config);
 for(const request of waiting){
  if(request.connection!==connectedAt||!request.memberId)continue;
  try{await mailchimpCall(apiKey,'POST',`/lists/${request.listId}/members/${request.memberId}/actions/delete-permanent`,undefined,config.fetcher);await deleted(db,request.id);}
  catch(error){
   if(!(error instanceof MailchimpProviderError))throw error;
   if(error.status===404){
    // Mailchimp answers 404 both for an absent member and for an audience this account does not hold; only the first is a deletion.
    try{await mailchimpCall(apiKey,'GET',`/lists/${request.listId}?fields=id`,undefined,config.fetcher);await deleted(db,request.id);}
    catch(read){if(!(read instanceof MailchimpProviderError))throw read;await mark(db,request,read.status===404?'failed':'uncertain',read.status===404?'The connected Mailchimp account has no audience with this ID, so Orbit cannot confirm the deletion. Connect the account that holds it, then confirm the deletion.':'Mailchimp did not confirm the deletion. Orbit asks again after the next change.');}
    continue;
   }
   if(error.status===401||error.status===403){await markUnresolved(db,refusalMessage(error));await mark(db,request,'paused',refusalMessage(error));return;}
   if(error.status===429){await mark(db,request,'queued',refusalMessage(error));return;}
   await mark(db,request,error.refused?'failed':'uncertain',error.refused?`Mailchimp refused the deletion (${error.status} ${error.title}). Check the member in Mailchimp, then confirm the deletion.`:'Mailchimp did not answer, so the deletion is not confirmed. Orbit asks again after the next change.');
  }
 }
}
/** Orbit's processor path: after each accepted change, an erasure among them, waiting deletions are sent. */
export function mailchimpDeletionProcessing(db:D1Database,config:MailchimpConfig):MiddlewareHandler{
 return async(c,next)=>{await next();if(['GET','HEAD','OPTIONS'].includes(c.req.method)||c.res.status>=400||c.req.path.startsWith('/api/v1/settings/mailchimp')||c.req.path.includes('/archive/'))return;try{await processMailchimpDeletions(db,config);}catch{c.header('X-Orbit-Mailchimp','Deletion processing failed; inspect the Mailchimp settings');}};
}
export async function deletionViews(db:D1Database){
 const status=await connection(db),audience=status.settings?.audience;
 return (await stored(db,false)).reverse().slice(0,100).map(request=>{const view=current(request,status.state==='connected',status.settings?.connectedAt??null);return {id:view.id,state:view.state,reason:view.reason,requestedAt:view.requestedAt,updatedAt:view.updatedAt,audience:audience?.id===view.listId?audience.name:null};});
}
/** The owner's confirmation: a held, refused or unconfirmed request is sent again with the current connection. */
export async function confirmDeletion(db:D1Database,config:MailchimpConfig,id:string,actor:string){
 const status=await connection(db);if(status.state!=='connected')throw new MailchimpError(409,'Connect Mailchimp and choose its audience, then confirm the deletion.');
 const request=(await stored(db,true)).find(item=>item.id===id);if(!request)throw new MailchimpError(404,'This deletion is finished or does not exist.');
 await audit(db,actor,'mailchimp.deletion',entity,id,{state:'queued',reason:null,connection:status.settings?.connectedAt}).run();
 await processMailchimpDeletions(db,config);
}
