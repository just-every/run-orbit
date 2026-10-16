import { suppressionContextFence, suppressionHashes, suppressionPredicate, clearSuppressionStatements, suppressionStatements, contactSuppressionStatements } from './suppression';
import { opportunityAssignmentPolicy } from '../../../ext/records';
import { contactEmailKey, companyDomainKey } from './identity';
import { RecordSeedRepository } from './seed-repository';
import { evaluationStatements } from '../workbench/evaluation-repository';
import { createId } from '../../shared/ids';
import { schemas } from './schema';
import { audit, mutationJob, RecordError, requireRecord, tables, timeline, type RecordKind } from './shared';
export class RecordsRepository extends RecordSeedRepository {
 constructor(readonly db:D1Database){super(db);}
 async prepareSave(kind:RecordKind,input:unknown,actor:string,id?:string, options:{ordinaryEdit?:boolean}={}){
  const parsed=schemas[kind].safeParse(input);if(!parsed.success)throw new RecordError(400,parsed.error.issues.map(i=>i.message).join(' '));
  const data:Record<string,any>={...parsed.data}; const before=id?await requireRecord(this.db,kind,id):null;id??=createId();
  const now=new Date().toISOString();
  if(data.company_id)await requireRecord(this.db,'company',data.company_id);
  let key:string|null=null,keyColumn:string|null=null;
  if(kind==='contact'&&data.timezone){try{new Intl.DateTimeFormat('en',{timeZone:data.timezone});}catch{throw new RecordError(400,'Unknown contact timezone.');}}
  if(kind==='contact'){
   data.email=data.email===undefined?(before?.email??null):(data.email?.trim().toLowerCase()||null);
   key=contactEmailKey(data.email);keyColumn='email_key';
   if(options.ordinaryEdit&&before?.contactability==='do_not_contact'&&data.contactability==='contactable')throw new RecordError(409,'Use the reviewed operator action to clear do-not-contact.');
   data.contactability??=before?.contactability??'contactable';
  }
  if(kind==='company'){
   data.primary_domain=data.primary_domain?.trim().toLowerCase().replace(/^www\./,'')||null;
   if(data.primary_domain&&!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(data.primary_domain))throw new RecordError(400,'Enter a primary domain without a URL path.');
   const settings=await this.db.prepare('SELECT free_mail_domains_json FROM workspace_settings').first<{free_mail_domains_json:string}>();
   key=companyDomainKey(data.primary_domain,JSON.parse(settings?.free_mail_domains_json??'[]')); keyColumn='primary_domain_key';
  }
  if(keyColumn){data[keyColumn]=key;if(key){const duplicate=await this.db.prepare(`SELECT id FROM ${tables[kind]} WHERE ${keyColumn}=? AND id<>? UNION SELECT survivor_id AS id FROM record_aliases WHERE record_type=? AND identity_key=? AND survivor_id<>?`).bind(key,id,kind,key,id).first<{id:string}>();if(duplicate)throw new RecordError(409,'Identity already belongs to another record.',duplicate.id);}}
  const contacts:string[]=data.contact_ids??[];delete data.contact_ids;const primary=data.primary_contact_id;delete data.primary_contact_id;
  if(kind==='opportunity'){
   if(!before&&data.owner_id===undefined)data.owner_id=opportunityAssignmentPolicy.ownerForNewOpportunity({actorId:actor});
   if(!await this.db.prepare('SELECT id FROM pipeline_stages WHERE id=?').bind(data.stage_id).first())throw new RecordError(400,'Unknown stage.');
   if(data.owner_id&&!await this.db.prepare("SELECT id FROM operators WHERE id=? AND status='active'").bind(data.owner_id).first())throw new RecordError(400,'Owner must be an active operator.');
   for(const contact of contacts)await requireRecord(this.db,'contact',contact);
  }
  data.custom_fields_json=JSON.stringify(data.custom_fields);delete data.custom_fields;data.updated_at=now;
  const columns=Object.keys(data),values=columns.map(k=>data[k]??null);
  const statements:D1PreparedStatement[]=[];
  const emailTokens=kind==='contact'?await suppressionHashes(this.db,data.email):[];
  statements.push(...suppressionContextFence(this.db,emailTokens));
  // Only a trusted internal operator call with an explicit field can clear. HTTP edits/imports opt out.
  const explicitClear=kind==='contact'&&!!before&&!options.ordinaryEdit&&(input as any)?.contactability==='contactable';
  if(explicitClear&&!await this.db.prepare("SELECT id FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)").bind(actor).first())throw new RecordError(409,'An active operator must review this action.');
  if(kind==='contact'&&before?.contactability==='do_not_contact'&&!explicitClear)statements.push(...await contactSuppressionStatements(this.db,id));
  if(kind==='contact'&&data.contactability==='do_not_contact')statements.push(...await suppressionStatements(this.db,[data.email]));
  if(explicitClear)statements.push(this.db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'contact_clear_class',NULL WHERE NOT EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id))").bind(actor),...clearSuppressionStatements(this.db,emailTokens));
  const contactabilityValue=(update:boolean)=>`CASE WHEN ${update&&!explicitClear?"contactability='do_not_contact' OR ":''}${suppressionPredicate(emailTokens)} THEN 'do_not_contact' ELSE ? END`;

  if(before)statements.push(this.db.prepare(`UPDATE ${tables[kind]} SET ${columns.map(k=>`${k}=${kind==='contact'&&k==='contactability'?contactabilityValue(true):'?'}`).join(',')} WHERE id=?`).bind(...values,id));
  else {
   if(kind==='opportunity')Object.assign(data,{lifecycle:'open',score:0,band:'low',queue_state:'none'});
   data.id=id;data.created_at=now;const keys=Object.keys(data);
   statements.push(this.db.prepare(`INSERT INTO ${tables[kind]}(${keys.join(',')}) VALUES(${keys.map(k=>kind==='contact'&&k==='contactability'?contactabilityValue(false):'?').join(',')})`).bind(...keys.map(k=>data[k]??null)));
  }
  if(kind==='opportunity'){
   statements.push(this.db.prepare('DELETE FROM opportunity_contacts WHERE opportunity_id=?').bind(id));
   for(const contact of contacts)statements.push(this.db.prepare('INSERT INTO opportunity_contacts VALUES(?,?,?,?)').bind(id,contact,contact===primary?1:0,now));
   statements.push(...evaluationStatements(this.db,id,actor,'Opportunity fields or associations changed'),this.db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Opportunity fields or associations changed',updated_at=? WHERE opportunity_id=?").bind(now,id));
   for(const field of ['stage_id','owner_id'])if(before&&before[field]!==data[field])statements.push(...timeline(this.db,actor,kind,id,field==='stage_id'?'stage.changed':'owner.changed',{previous:before[field],current:data[field]}));
  }
  if(kind==='contact')statements.push(this.db.prepare("UPDATE outbound_messages SET state='cancelled',failure='Contact set do-not-contact',updated_at=? WHERE contact_id=? AND state='scheduled' AND EXISTS(SELECT 1 FROM contacts WHERE id=? AND contactability='do_not_contact')").bind(now,id,id));
  if(kind==='contact')statements.push(this.db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Contact changed',updated_at=? WHERE recipient_contact_id=?").bind(now,id));
  if(explicitClear)statements.push(audit(this.db,actor,'contactability.cleared','contact',id));
  statements.push(...timeline(this.db,actor,kind,id,before?'record.updated':'record.created',{}),audit(this.db,actor,before?'record.updated':'record.created',kind,id));
  return {id,statements,key,keyColumn,kind};
 }
 async save(kind:RecordKind,input:unknown,actor:string,id?:string,options:{ordinaryEdit?:boolean}={}){
  const prepared=await this.prepareSave(kind,input,actor,id,options);id=prepared.id;const {statements,key,keyColumn}=prepared;
  try{await this.db.batch(statements);}catch(error){if(String(error).includes('UNIQUE')||String(error).includes('RECORD_IDENTITY_CONFLICT')){const duplicate=key&&keyColumn?await this.db.prepare(`SELECT id FROM ${tables[kind]} WHERE ${keyColumn}=? AND id<>? UNION SELECT survivor_id AS id FROM record_aliases WHERE record_type=? AND identity_key=? AND survivor_id<>?`).bind(key,id,kind,key,id).first<{id:string}>():null;throw new RecordError(409,'Identity or association changed concurrently; reload records.',duplicate?.id);}throw error;}
  return {id};
 }
 async detail(kind:RecordKind,id:string){const record=await requireRecord(this.db,kind,id);const entries=await this.db.prepare("SELECT t.*,o.display_name AS actor_name,s.name AS source_name,e.type AS signal_type FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id LEFT JOIN operators o ON t.actor_type='operator' AND o.id=t.actor_id LEFT JOIN signal_sources s ON s.id=t.source LEFT JOIN signals e ON e.id=t.id WHERE r.record_type=? AND r.record_id=? ORDER BY t.occurred_at DESC,t.id ASC").bind(kind,id).all();
 const contacts=kind==='company'?await this.db.prepare('SELECT * FROM contacts WHERE company_id=? ORDER BY name,id').bind(id).all():kind==='opportunity'?await this.db.prepare('SELECT c.*,oc.is_primary FROM contacts c JOIN opportunity_contacts oc ON oc.contact_id=c.id WHERE oc.opportunity_id=?').bind(id).all():{results:[]};
 const opportunities=kind==='company'?await this.db.prepare('SELECT o.*,s.name AS stage_name,p.display_name AS owner_name FROM opportunities o JOIN pipeline_stages s ON s.id=o.stage_id LEFT JOIN operators p ON p.id=o.owner_id WHERE company_id=?').bind(id).all():kind==='contact'?await this.db.prepare('SELECT o.*,s.name AS stage_name,p.display_name AS owner_name FROM opportunities o JOIN opportunity_contacts oc ON oc.opportunity_id=o.id JOIN pipeline_stages s ON s.id=o.stage_id LEFT JOIN operators p ON p.id=o.owner_id WHERE oc.contact_id=?').bind(id).all():{results:[]};
 const company=record.company_id?await this.db.prepare('SELECT * FROM companies WHERE id=?').bind(record.company_id).first():null;
 return {record,company,timeline:entries.results,contacts:contacts.results,opportunities:opportunities.results,openValueCents:opportunities.results.reduce((sum:number,o:any)=>sum+(o.lifecycle==='open'?o.value_cents:0),0)};}
 async search(kind:RecordKind,query:string,filters:Record<string,string>={}){
  const clauses=['1=1'],values:string[]=[];if(query.trim()){
   const match=query.trim().split(/\s+/).map(token=>`"${token.replaceAll('"','""')}"*`).join(' AND ');
   clauses.push(`id IN (SELECT record_id FROM record_search WHERE record_search MATCH ? AND record_type=? UNION SELECT r.record_id FROM timeline_search s JOIN timeline_entry_records r ON r.timeline_entry_id=s.entry_id WHERE timeline_search MATCH ? AND r.record_type=?)`);values.push(match,kind,match,kind);
  }
  if(kind==='opportunity')for(const field of ['lifecycle','stage_id','owner_id','band','queue_state'])if(filters[field]){clauses.push(`${field}=?`);values.push(filters[field]);}
  return (await this.db.prepare(`SELECT * FROM ${tables[kind]} WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC,id LIMIT 50`).bind(...values).all()).results;
 }
 async lifecycle(id:string,state:'open'|'won'|'lost',reason:string,actor:string){await requireRecord(this.db,'opportunity',id);if(state!=='open'&&!reason.trim())throw new RecordError(400,'Give a closing reason.');const now=new Date().toISOString();await this.db.batch([this.db.prepare("UPDATE opportunities SET lifecycle=?,closed_at=?,closed_by=?,close_reason=?,queue_state='none',queue_reason=?,next_due_at=NULL,updated_at=? WHERE id=?").bind(state,state==='open'?null:now,state==='open'?null:actor,state==='open'?null:reason,state==='open'?'Operator reopened':'Operator closed',now,id),this.db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Opportunity lifecycle changed' WHERE opportunity_id=?").bind(id),...(state==='open'?[mutationJob(this.db,id,actor,'Operator reopened')]:[]),...timeline(this.db,actor,'opportunity',id,'lifecycle.changed',{state,reason}),audit(this.db,actor,'lifecycle.changed','opportunity',id,{state,reason})]);return {id,state};}
}
