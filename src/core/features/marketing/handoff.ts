import {createId} from '../../shared/ids';
import {payloadHash} from '../../platform/source-security';
import {IngestionRepository} from '../ingestion/repository';
import type {SignalEvent} from '../ingestion/contracts';
import {consentTag,MailchimpError,mailchimpSource,type ConnectionSettings,type HandoffField,type MailchimpConfig} from './contracts';
import {markUnresolved} from './connection';
import {consents,linkStatement,memberLinks,withdrawalStatement,type MemberLink} from './ledger';
import {mailchimpCall,MailchimpProviderError,refusalMessage,subscriberHash} from './provider';

export type Group='subscribed'|'unknown'|'stopped';
export type Action='send'|'unchanged'|'unsubscribe'|'check'|'none';
export interface PlanItem {contactId:string;name:string;email:string;company:string|null;group:Group;reason:string;consent:{source:string;basis:string;at:string}|null;memberId:string;member:MemberLink|null;action:Action;body?:{email_address:string;status_if_new:'subscribed';merge_fields:Record<string,string>};hash?:string}
interface ContactRow {id:string;name:string|null;email:string;phone:string|null;contactability:string;company:string|null;stop_type:string|null;stop_source:string|null}
const stoppedStatuses=['unsubscribed','cleaned'],requestBudget=100;
const latestStop=(column:string)=>`(SELECT s.${column} FROM signal_links l JOIN signals s ON s.id=l.signal_id WHERE l.record_type='contact' AND l.record_id=c.id AND s.type IN('email.unsubscribed','email.bounced') ORDER BY s.received_at DESC,s.id DESC LIMIT 1)`;
function stopReason(row:ContactRow,withdrawn:boolean,link:MemberLink|null){
 const mailchimp=row.stop_source===mailchimpSource;
 if(row.contactability==='do_not_contact')return row.stop_type==='email.unsubscribed'?(mailchimp?'Unsubscribed in Mailchimp':'Unsubscribed'):row.stop_type==='email.bounced'?(mailchimp?'Cleaned in Mailchimp after a permanent bounce':'Permanent bounce'):'Do not contact';
 if(link&&stoppedStatuses.includes(link.status))return link.status==='cleaned'?'Cleaned in Mailchimp after a permanent bounce':'Unsubscribed in Mailchimp';
 return withdrawn?'Marketing consent withdrawn':'Do not contact';
}
/** Every contact with an email falls in exactly one group; only subscribed contacts are ever sent, and only the selected fields. */
export async function plan(db:D1Database,settings:ConnectionSettings,fields:HandoffField[]){
 const audience=settings.audience;if(!audience)throw new MailchimpError(409,'Choose the Mailchimp audience first.');
 const rows=(await db.prepare(`SELECT c.id,c.name,c.email,c.phone,c.contactability,co.name AS company,${latestStop('type')} AS stop_type,${latestStop('source_id')} AS stop_source FROM contacts c LEFT JOIN companies co ON co.id=c.company_id WHERE c.email IS NOT NULL AND trim(c.email)<>'' ORDER BY lower(coalesce(c.name,c.email)),c.id`).all<ContactRow>()).results;
 const given=await consents(db),links=await memberLinks(db),selected=[...new Set(fields)].sort(),items:PlanItem[]=[];
 for(const row of rows){
  const consent=given.get(row.id)??null,memberId=subscriberHash(row.email),saved=links.get(row.id),member=saved&&saved.listId===audience.id&&saved.memberId===memberId?saved:null;
  const stopped=row.contactability==='do_not_contact'||consent?.state==='withdrawn'||Boolean(member&&stoppedStatuses.includes(member.status));
  const base={contactId:row.id,name:row.name??row.email,email:row.email.trim(),company:row.company,memberId,member};
  if(stopped){items.push({...base,group:'stopped',reason:stopReason(row,consent?.state==='withdrawn',member),consent:null,action:!member||member.reported?'check':['subscribed','pending'].includes(member.status)?'unsubscribe':'none'});continue;}
  if(consent?.state!=='given'){items.push({...base,group:'unknown',reason:'No marketing consent recorded in Orbit',consent:null,action:'none'});continue;}
  const merge:Record<string,string>={},[first='',...rest]=(row.name??'').trim().split(/\s+/).filter(Boolean);
  if(selected.includes('name')&&settings.mergeTags.includes('FNAME'))merge.FNAME=first;
  if(selected.includes('name')&&settings.mergeTags.includes('LNAME'))merge.LNAME=rest.join(' ');
  if(selected.includes('phone')&&settings.mergeTags.includes('PHONE')&&row.phone)merge.PHONE=row.phone;
  merge[consentTag]=`${consent.source}: ${consent.basis}`.slice(0,255);
  const body={email_address:row.email.trim(),status_if_new:'subscribed' as const,merge_fields:merge},hash=await payloadHash(JSON.stringify(body));
  items.push({...base,group:'subscribed',reason:`${consent.source}: ${consent.basis}`,consent:{source:consent.source,basis:consent.basis,at:consent.at},action:member?.hash===hash&&member.status==='subscribed'?'unchanged':'send',body,hash});
 }
 const digest=await payloadHash(JSON.stringify([audience.id,selected,items.map(item=>[item.contactId,item.email,item.group,item.action,item.hash??null])]));
 return {audience,fields:selected,items,digest};
}
function failureMessage(error:MailchimpProviderError){
 if(/forgotten/i.test(error.title))return 'This person was permanently deleted from Mailchimp. Only they can rejoin, through a Mailchimp signup form.';
 if(/compliance/i.test(error.title))return 'Mailchimp keeps this address unsubscribed for compliance. Only the person can rejoin.';
 if(error.status===400)return 'Mailchimp refused this contact’s details. Check the email address and phone number in Orbit.';
 return error.refused?refusalMessage(error):'Mailchimp did not confirm this contact. Orbit recorded nothing for it, and the next handoff checks it again.';
}
/** Mailchimp's own stop always wins: a member it reports unsubscribed or cleaned becomes an Orbit stop through the existing signal path. */
async function mailchimpStop(db:D1Database,item:PlanItem,status:string,listId:string,changedAt?:string){
 const occurredAt=changedAt&&!Number.isNaN(Date.parse(changedAt))&&Date.parse(changedAt)<=Date.now()?new Date(changedAt).toISOString():new Date().toISOString();
 const event:SignalEvent={eventId:`mailchimp:${await payloadHash(['mailchimp-member-v1',listId,item.memberId,status,changedAt??''].join('\n'))}`,type:status==='cleaned'?'email.bounced':'email.unsubscribed',subject:status==='cleaned'?'Mailchimp cleaned this address after a permanent bounce':'Unsubscribed in Mailchimp',email:item.email,occurredAt,...(status==='cleaned'?{permanentBounce:true}:{}),data:{provider:'mailchimp',memberStatus:status,listId}};
 const body=JSON.stringify(event);await new IngestionRepository(db).ingest(mailchimpSource,event,await payloadHash(body),body);
 await withdrawalStatement(db,null,item.contactId,'Mailchimp',event.subject).run();
}
/** Hands off exactly the previewed plan once per operation; PUT with status_if_new never re-subscribes an existing member. */
export async function handoff(db:D1Database,config:MailchimpConfig,apiKey:string,settings:ConnectionSettings,actor:string,input:{fields:HandoffField[];previewDigest:string;operationId:string}){
 if(await db.prepare("SELECT 1 FROM audit_entries WHERE action='mailchimp.handoff' AND entity_id=?").bind(input.operationId).first())throw new MailchimpError(409,'This handoff already ran. Preview again to hand off any later changes.');
 const current=await plan(db,settings,input.fields);
 if(current.digest!==input.previewDigest)throw new MailchimpError(409,'Contacts or consent changed since your preview. Preview again before handing off.');
 const claimed=await db.prepare("INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT ?,?,'mailchimp.handoff','mailchimp_handoff',?,?,? WHERE NOT EXISTS(SELECT 1 FROM audit_entries WHERE action='mailchimp.handoff' AND entity_id=?)").bind(createId(),actor,input.operationId,JSON.stringify({audience:current.audience.id,fields:current.fields,digest:current.digest}),new Date().toISOString(),input.operationId).run();
 if(claimed.meta.changes!==1)throw new MailchimpError(409,'This handoff already ran. Preview again to hand off any later changes.');
 const list=current.audience.id,counts={sent:0,unchanged:0,unsubscribed:0,checked:0,stoppedInMailchimp:0,refused:0,uncertain:0,remaining:0},failures:{contactId:string;name:string;message:string}[]=[],links:D1PreparedStatement[]=[],stops:{item:PlanItem;status:string;changedAt?:string}[]=[];
 let requests=0,halted=false;
 for(const item of current.items){
  if(item.action==='unchanged'){counts.unchanged++;continue;}
  if(item.action==='none')continue;
  if(halted||requests>=requestBudget){counts.remaining++;continue;}
  try{
   if(item.action==='send'){
    requests++;const member=await mailchimpCall<{id:string;unique_email_id?:string;status:string;last_changed?:string}>(apiKey,'PUT',`/lists/${list}/members/${item.memberId}`,item.body,config.fetcher);
    links.push(linkStatement(db,actor,item.contactId,{listId:list,memberId:member.id,uniqueEmailId:member.unique_email_id??null,status:member.status,hash:item.hash??null}));
    if(stoppedStatuses.includes(member.status)){counts.stoppedInMailchimp++;stops.push({item,status:member.status,changedAt:member.last_changed});}else counts.sent++;
    continue;
   }
   let status=item.member?.status??'',uniqueEmailId=item.member?.uniqueEmailId??null;
   if(item.action==='check'){
    requests++;
    try{const member=await mailchimpCall<{status:string;unique_email_id?:string}>(apiKey,'GET',`/lists/${list}/members/${item.memberId}?fields=status,unique_email_id`,undefined,config.fetcher);status=member.status;uniqueEmailId=member.unique_email_id??null;}
    catch(error){if(!(error instanceof MailchimpProviderError&&error.status===404))throw error;status='absent';}
   }
   if(status==='subscribed'||status==='pending'){
    if(requests>=requestBudget){counts.remaining++;continue;}
    requests++;const member=await mailchimpCall<{status:string;unique_email_id?:string}>(apiKey,'PATCH',`/lists/${list}/members/${item.memberId}`,{status:'unsubscribed'},config.fetcher);
    status=member.status;uniqueEmailId=member.unique_email_id??uniqueEmailId;counts.unsubscribed++;
   }else counts.checked++;
   links.push(linkStatement(db,actor,item.contactId,{listId:list,memberId:item.memberId,uniqueEmailId,status,hash:null}));
  }catch(error){
   if(!(error instanceof MailchimpProviderError))throw error;
   if(error.status===401||error.status===403||(error.status===404&&item.action==='send')){await markUnresolved(db,refusalMessage(error));halted=true;}
   if(error.refused)counts.refused++;else counts.uncertain++;
   failures.push({contactId:item.contactId,name:item.name,message:halted?refusalMessage(error):failureMessage(error)});
  }
 }
 if(links.length)await db.batch(links);
 for(const stop of stops)await mailchimpStop(db,stop.item,stop.status,list,stop.changedAt);
 await db.prepare("UPDATE audit_entries SET details_json=json_set(details_json,'$.counts',json(?)) WHERE action='mailchimp.handoff' AND entity_id=?").bind(JSON.stringify(counts),input.operationId).run();
 return {counts,failures,requests};
}
