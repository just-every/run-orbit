import {AccessService} from '../access/service';
import {AccessError} from '../access/errors';
import {isFullOperator,fullOperatorFence} from '../access/identity-class';
import {salesAdmin,salesProfile} from '../teams/policy';
import {salesCanEdit} from '../teams/record-access';
import type {AuthenticatedOperator} from '../identity';
import type {Fact} from './facts';
import {CaptureError} from './contracts';

export const isMailboxLifecyclePath=(path:string)=>/^\/api\/v1\/capture\/(?:providers|sources|oauth\/(?:google|microsoft)\/(?:start|callback)|sources\/[^/]+\/(?:options|scope|sync|disconnect))$/.test(path);
export const mailboxOwnerSql="(SELECT actor_id FROM audit_entries WHERE action='capture.connected' AND entity_type='capture_source' AND entity_id=c.id ORDER BY occurred_at DESC,id DESC LIMIT 1)";
export async function mailboxOwner(db:D1Database,id:string){return db.prepare(`SELECT ${mailboxOwnerSql} AS owner FROM capture_sources c WHERE c.id=?`).bind(id).first<string>('owner');}
/** Source permission is distinct from every customer record and field grant. */
export async function sourceConnectionAccess(db:D1Database,operator:AuthenticatedOperator,sourceId?:string){
 try{
  const profile=await salesProfile(db,operator.operatorId),legacy=await isFullOperator(db,operator.operatorId);
  if(!legacy&&(!profile||profile.role==='read-only'||!profile.permissions.includes('source.connect')))throw new CaptureError(403,'Source connection permission is required.');
  if(sourceId&&!legacy&&!await salesAdmin(db,operator.operatorId)&&!await db.prepare(`SELECT 1 FROM capture_sources c WHERE c.id=? AND c.adapter IN('google','microsoft') AND ${mailboxOwnerSql}=?`).bind(sourceId,operator.operatorId).first())throw new CaptureError(403,'This mailbox belongs to another operator.');
  const access=new AccessService(db),context=await access.authorizeLegacy(operator,crypto.randomUUID(),'source.connect');
  if(legacy)access.addDependencyFences(context,fullOperatorFence(context),'capture-source-class');
  const fences=access.fence(context).map(statement=>db.prepare(statement.sql).bind(...statement.bindings));
  if(sourceId&&!legacy&&!await salesAdmin(db,operator.operatorId))fences.push(db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'capture_mailbox_owner',NULL WHERE NOT EXISTS(SELECT 1 FROM capture_sources c WHERE c.id=? AND c.adapter IN('google','microsoft') AND ${mailboxOwnerSql}=?)`).bind(sourceId,operator.operatorId));
  return fences;
 }catch(error){if(error instanceof AccessError)throw new CaptureError(error.status,error.message);throw error;}
}
export async function sourceGlobalAccess(db:D1Database,operator:AuthenticatedOperator){
 if(!await isFullOperator(db,operator.operatorId)&&!await salesAdmin(db,operator.operatorId))throw new CaptureError(403,'Only a sales administrator manages workspace sources.');
 return sourceConnectionAccess(db,operator);
}
/** Polling a personal mailbox retains its connecting operator's current authority. */
export async function sourcePollAccess(db:D1Database,id:string){
 const owner=await mailboxOwner(db,id);if(!owner)return null;const profile=await salesProfile(db,owner);
 if(profile&&(profile.role==='read-only'||!profile.permissions.includes('source.connect')))throw new CaptureError(403,'The connecting operator no longer has source permission.');
 if(!profile&&!await isFullOperator(db,owner))throw new CaptureError(403,'The connecting operator is no longer active.');
 return profile?owner:null;
}
/** A personal mailbox cannot append evidence or proposals to a hidden account. */
export async function permittedCaptureFact(db:D1Database,actor:string,fact:Fact){
 const profile=await salesProfile(db,actor);if(await isFullOperator(db,actor)||profile?.role==='sales-admin'&&profile.fields.includes('*'))return true;
 const participants=fact.kind==='message'&&fact.bounce?.recipient?[{email:fact.bounce.recipient}]:fact.participants;
 const emails=JSON.stringify(participants.map(person=>person.email));
 const contacts=(await db.prepare("SELECT c.id,c.company_id FROM contacts c WHERE lower(trim(c.email)) IN(SELECT value FROM json_each(?)) OR EXISTS(SELECT 1 FROM record_aliases a WHERE a.record_type='contact' AND a.survivor_id=c.id AND a.identity_key IN(SELECT value FROM json_each(?)))").bind(emails,emails).all<{id:string;company_id:string|null}>()).results;
 const records=contacts.flatMap(contact=>[{kind:'contact',id:contact.id},...(contact.company_id?[{kind:'company',id:contact.company_id}]:[])]);

 for(const record of records){const fields=record.kind==='contact'?['mail','notes','name','phone','email','company_id','contactability']:['mail','notes','name','primary_domain'];if(!await salesCanEdit(db,actor,record.kind,record.id,fields))return false;if(record.kind==='contact'){
  const references=JSON.stringify(fact.kind==='message'?[...new Set([...(fact.references.match(/<[^<>\s]+>/g)??[]),...(fact.bounce?.originalMessageId?[fact.bounce.originalMessageId]:[])])]:[]);
  const deals=(await db.prepare('SELECT opportunity_id AS id FROM opportunity_contacts WHERE contact_id=? UNION SELECT opportunity_id FROM outbound_messages WHERE contact_id=? AND opportunity_id IS NOT NULL AND message_id IN(SELECT value FROM json_each(?)) UNION SELECT opportunity_id FROM record_mail_outbound_messages WHERE contact_id=? AND opportunity_id IS NOT NULL AND message_id IN(SELECT value FROM json_each(?))').bind(record.id,record.id,references,record.id,references).all<{id:string}>()).results;
  for(const deal of deals)if(!await salesCanEdit(db,actor,'opportunity',deal.id,['mail','notes','title','lifecycle','queue_state','queue_reason','company_id']))return false;
 }}
 // An unknown participant/domain can create account proposals; personal capture keeps those for a global administrator.
 const known=new Set((await db.prepare('SELECT lower(trim(email)) AS email FROM contacts UNION SELECT lower(trim(email)) FROM operators').all<{email:string}>()).results.map(row=>row.email));
 return participants.every(person=>known.has(person.email));
}

export async function captureAuthorityFence(db:D1Database,actor:string){
 const epoch=await db.prepare("SELECT policy_epoch FROM access_workspaces WHERE id='workspace'").first<number>('policy_epoch');
 return db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_sales_authority',NULL WHERE NOT EXISTS(SELECT 1 FROM access_workspaces w JOIN operators o ON o.id=? JOIN sales_roles r ON r.operator_id=o.id WHERE w.id='workspace' AND w.policy_epoch=? AND o.status='active' AND r.role<>'read-only' AND EXISTS(SELECT 1 FROM json_each(r.permissions_json) WHERE value='source.connect')) AND NOT EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active')").bind(actor,epoch,actor);
}
