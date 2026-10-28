import {normalizedTypedFields,typedFieldFences,typedFieldSave,type TypedField} from './typed-fields';
import {fieldLabel,valueText} from '../operator/ui/data-value';
import {importProvenance} from '../operator/ui/import-provenance';
import {legacyActorContext} from '../access/legacy-database';
import {reconcileLegacyOwnership} from '../ownership/legacy';
import {readOwnership,ownershipForRecords} from '../ownership/read';
import {closedReason,stageChangedReason} from '../outreach/stop-reason';
import {assertRequiredFields,stagePolicy,stagePolicyFence,type StagePolicy} from '../pipelines/stage-policy';
import {movementHistory,movementPayload} from '../pipelines/movement';
import {contactPrimaryCompanyActivity} from '../relationships';
import { suppressionContextFence, suppressionHashes, suppressionPredicate, clearSuppressionStatements, suppressionStatements, contactSuppressionStatements } from './suppression';
import { opportunityAssignmentPolicy } from '../../../ext/records';
import { eligibleOpportunityOwners } from '../ownership/writes';
import { contactEmailKey, companyDomainKey } from './identity';
import { RecordSeedRepository } from './seed-repository';
import { evaluationStatements } from '../workbench/evaluation-repository';
import { createId } from '../../shared/ids';
import { schemas } from './schema';
import { audit, mutationJob, RecordError, requireRecord, tables, timeline, type RecordKind } from './shared';
const changeLabels:Record<string,string>={company_id:'Company',stage_id:'Stage',owner_id:'Owner',value_cents:'Value',expected_close_at:'Expected close date',primary_domain:'Website domain'};
const bookkeeping=new Set(['updated_at','email_key','primary_domain_key']);
/** The timeline says which fields an edit changed, so the owner reads who changed what. */
function changedText(before:Record<string,any>,after:Record<string,any>,definitions:TypedField[]){
 const changed=Object.keys(after).filter(key=>key!=='custom_fields_json'&&!bookkeeping.has(key)&&key in before&&(before[key]??null)!==(after[key]??null));
 const lines=changed.map(key=>changeLabels[key]??fieldLabel(key));
 const text=lines.length?[`Changed ${lines.join(', ')}`]:[];
 const oldValues=JSON.parse(before.custom_fields_json),newValues=JSON.parse(after.custom_fields_json);
 const labels=new Map(definitions.map(field=>[field.field_key,field.label]));
 const display=(key:string,value:unknown)=>value===undefined||value===null||value===''?'Empty':valueText(importProvenance(key,value)??value);
 for(const key of new Set([...Object.keys(oldValues),...Object.keys(newValues)])){
  if(oldValues[key]!==newValues[key]){
   const label=labels.get(key)??fieldLabel(key),previousImport=importProvenance(key,oldValues[key]);
   if(previousImport&&typeof newValues[key]==='string'&&!importProvenance(key,newValues[key]))text.push(`Changed ${label}: Replaced import details from ${previousImport.imported_from} with ${newValues[key]===''?'empty text':`text: ${newValues[key]}`}`);
   else text.push(`Changed ${label}: ${display(key,oldValues[key])} → ${display(key,newValues[key])}`);
  }
 }
 return text.length?{text:text.join('\n')}:null;
}
export class RecordsRepository extends RecordSeedRepository {
 constructor(readonly db:D1Database){super(db);}
 async prepareSave(kind:RecordKind,input:unknown,actor:string,id?:string, options:{ordinaryEdit?:boolean}={}){
  const before=id?await requireRecord(this.db,kind,id):null;
  const links=kind==='opportunity'&&before?(await this.db.prepare('SELECT contact_id,is_primary FROM opportunity_contacts WHERE opportunity_id=?').bind(id).all<{contact_id:string;is_primary:number}>()).results:[];
  let source=input;
  if(kind==='opportunity'&&before&&input&&typeof input==='object'&&!Array.isArray(input)){
   const provided=input as Record<string,unknown>;
   source={...provided,
    custom_fields:Object.hasOwn(provided,'custom_fields')?provided.custom_fields:JSON.parse(before.custom_fields_json),
    contact_ids:Object.hasOwn(provided,'contact_ids')?provided.contact_ids:links.map(link=>link.contact_id),
    primary_contact_id:Object.hasOwn(provided,'primary_contact_id')?provided.primary_contact_id:links.find(link=>link.is_primary)?.contact_id??null
   };
  }
  const parsed=schemas[kind].safeParse(source);if(!parsed.success)throw new RecordError(400,parsed.error.issues.map(i=>i.message).join(' '));
  const data:Record<string,any>={...parsed.data};id??=createId();
  const policies:StagePolicy[]=[];let stageMovement:ReturnType<typeof movementPayload>|undefined;
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
   if(!before&&data.owner_id===undefined)data.owner_id=opportunityAssignmentPolicy.ownerForNewOpportunity({actorId:actor,eligibleOperatorIds:await eligibleOpportunityOwners(this.db)});
   const current=await stagePolicy(this.db,data.stage_id);policies.push(current);
   if(before&&before.stage_id!==data.stage_id){
    const previous=await stagePolicy(this.db,before.stage_id);policies.push(previous);
    if(previous.pipeline_id!==current.pipeline_id)throw new RecordError(409,'Review an explicit pipeline move before changing pipelines.');
    stageMovement=movementPayload(previous,current);
   }
   assertRequiredFields(current,{...before,...data,contact_ids:contacts,primary_contact_id:primary??null});
   if(data.owner_id&&!await this.db.prepare("SELECT id FROM operators WHERE id=? AND status='active'").bind(data.owner_id).first())throw new RecordError(400,'Owner must be an active operator.');
   for(const contact of contacts)await requireRecord(this.db,'contact',contact);
  }
  const previousFields=JSON.parse(before?.custom_fields_json??'{}');
  const typedSave=await typedFieldSave(this.db,kind,id,data.custom_fields,previousFields);
  data.custom_fields_json=JSON.stringify(normalizedTypedFields(data.custom_fields,previousFields,typedSave.fields));delete data.custom_fields;data.updated_at=now;
  const changes=before?changedText(before,data,typedSave.fields):{};
  const associationsChanged=kind==='opportunity'&&before&&(links.length!==contacts.length||links.some(link=>!contacts.includes(link.contact_id)||Boolean(link.is_primary)!==(link.contact_id===primary)));
  const columns=Object.keys(data),values=columns.map(k=>data[k]??null);
  const statements:D1PreparedStatement[]=policies.length?stagePolicyFence(this.db,policies,before?{id,stage_id:before.stage_id,updated_at:before.updated_at}:undefined):[];
  const emailTokens=kind==='contact'?await suppressionHashes(this.db,data.email):[];
  statements.push(...typedSave.statements);
  statements.push(...suppressionContextFence(this.db,emailTokens));
  // Only a trusted internal operator call with an explicit field can clear. HTTP edits/imports opt out.
  const explicitClear=kind==='contact'&&!!before&&!options.ordinaryEdit&&(input as any)?.contactability==='contactable';
  if(explicitClear&&!await this.db.prepare("SELECT id FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)").bind(actor).first())throw new RecordError(409,'An active operator must review this action.');
  if(kind==='contact'&&before?.contactability==='do_not_contact'&&!explicitClear)statements.push(...await contactSuppressionStatements(this.db,id));
  if(kind==='contact'&&data.contactability==='do_not_contact')statements.push(...await suppressionStatements(this.db,[data.email]));
  if(explicitClear)statements.push(this.db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'contact_clear_class',NULL WHERE NOT EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id))").bind(actor),...clearSuppressionStatements(this.db,emailTokens));
  const contactabilityValue=(update:boolean)=>`CASE WHEN ${update&&!explicitClear?"contactability='do_not_contact' OR ":''}${suppressionPredicate(emailTokens)} THEN 'do_not_contact' ELSE ? END`;

  // Validation and authority fences still run; an ordinary no-op changes no record or history.
  if(before&&options.ordinaryEdit&&!changes&&!associationsChanged)return {id,statements,key,keyColumn,kind,changed:false};

  if(before)statements.push(this.db.prepare(`UPDATE ${tables[kind]} SET ${columns.map(k=>`${k}=${kind==='contact'&&k==='contactability'?contactabilityValue(true):'?'}`).join(',')} WHERE id=?`).bind(...values,id));
  else {
   if(kind==='opportunity')Object.assign(data,{lifecycle:'open',score:0,band:'low',queue_state:'none'});
   data.id=id;data.created_at=now;const keys=Object.keys(data);
   statements.push(this.db.prepare(`INSERT INTO ${tables[kind]}(${keys.join(',')}) VALUES(${keys.map(k=>kind==='contact'&&k==='contactability'?contactabilityValue(false):'?').join(',')})`).bind(...keys.map(k=>data[k]??null)));
  }
  if(kind==='opportunity'){
   statements.push(this.db.prepare('DELETE FROM opportunity_contacts WHERE opportunity_id=? AND contact_id NOT IN(SELECT value FROM json_each(?))').bind(id,JSON.stringify(contacts)),this.db.prepare('UPDATE opportunity_contacts SET is_primary=0 WHERE opportunity_id=?').bind(id));
   for(const contact of contacts)statements.push(this.db.prepare('INSERT INTO opportunity_contacts VALUES(?,?,?,?) ON CONFLICT(opportunity_id,contact_id) DO UPDATE SET is_primary=excluded.is_primary').bind(id,contact,contact===primary?1:0,now));
   statements.push(...evaluationStatements(this.db,id,actor,'Opportunity fields or associations changed'),this.db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Opportunity fields or associations changed',updated_at=? WHERE opportunity_id=?").bind(now,id));
   for(const field of ['stage_id','owner_id'])if(before&&before[field]!==data[field])statements.push(...timeline(this.db,actor,kind,id,field==='stage_id'?'stage.changed':'owner.changed',field==='stage_id'?stageMovement:{previous:before[field],current:data[field]}));
   if(before&&before.stage_id!==data.stage_id)statements.push(this.db.prepare("UPDATE outbound_messages SET state='cancelled',failure=?,updated_at=? WHERE opportunity_id=? AND state='scheduled'").bind(stageChangedReason,now,id));
  }
  if(kind==='contact'&&before&&Object.hasOwn(data,'company_id'))statements.push(...contactPrimaryCompanyActivity(this.db,actor,id,before.company_id??null,data.company_id??null,now));
  if(kind==='contact')statements.push(this.db.prepare("UPDATE outbound_messages SET state='cancelled',failure='Contact set do-not-contact',updated_at=? WHERE contact_id=? AND state='scheduled' AND EXISTS(SELECT 1 FROM contacts WHERE id=? AND contactability='do_not_contact')").bind(now,id,id));
  if(kind==='contact')statements.push(this.db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Contact changed',updated_at=? WHERE recipient_contact_id=?").bind(now,id));
  if(explicitClear)statements.push(audit(this.db,actor,'contactability.cleared','contact',id));
  const history=associationsChanged?{text:[changes&&'text' in changes?changes.text:null,'Changed Associated contacts'].filter(Boolean).join('\n')}:changes;
  if(history)statements.push(...timeline(this.db,actor,kind,id,before?'record.updated':'record.created',history));
  statements.push(audit(this.db,actor,before?'record.updated':'record.created',kind,id));
  return {id,statements,key,keyColumn,kind,changed:true};
 }
 async save(kind:RecordKind,input:unknown,actor:string,id?:string,options:{ordinaryEdit?:boolean}={}){
  const prepared=await this.prepareSave(kind,input,actor,id,options);id=prepared.id;const {statements,key,keyColumn}=prepared;
  try{await this.db.batch(statements);}catch(error){if(/identity_guards|CHECK constraint failed: value\s*=\s*1/.test(String(error))){const current=await requireRecord(this.db,kind,id).catch(()=>null);await typedFieldFences(this.db,kind,id,(input as any)?.custom_fields??{},JSON.parse(current?.custom_fields_json??'{}'));throw new RecordError(409,'Custom fields changed concurrently. Review their definitions and values before saving.');}if(/runtime_controls.value/.test(String(error)))throw new RecordError(409,'The opportunity or pipeline rules changed. Reload before saving.');if(String(error).includes('UNIQUE')||String(error).includes('RECORD_IDENTITY_CONFLICT')){const duplicate=key&&keyColumn?await this.db.prepare(`SELECT id FROM ${tables[kind]} WHERE ${keyColumn}=? AND id<>? UNION SELECT survivor_id AS id FROM record_aliases WHERE record_type=? AND identity_key=? AND survivor_id<>?`).bind(key,id,kind,key,id).first<{id:string}>():null;throw new RecordError(409,'Identity or association changed concurrently; reload records.',duplicate?.id);}throw error;}
  return {id,changed:prepared.changed};
 }
 // Scoped record reads omit native ownership enrichment, as the collaborator route does.
 async detail(kind:RecordKind,id:string,options:{ownership?:boolean}={}){const record=await requireRecord(this.db,kind,id);if(kind==='opportunity'){const policy=await stagePolicy(this.db,record.stage_id);Object.assign(record,{pipeline_id:policy.pipeline_id,pipeline_name:policy.pipeline_name,stage_name:policy.stage_name});}const entries=await this.db.prepare("SELECT t.*,CASE WHEN t.actor_type='agent' THEN json_extract(t.payload_json,'$.preparedBy.label') ELSE o.display_name END AS actor_name,s.name AS source_name,e.type AS signal_type FROM timeline_entries t JOIN timeline_entry_records r ON r.timeline_entry_id=t.id LEFT JOIN operators o ON t.actor_type='operator' AND o.id=t.actor_id LEFT JOIN signal_sources s ON s.id=t.source LEFT JOIN signals e ON e.id=t.id WHERE r.record_type=? AND r.record_id=? ORDER BY t.occurred_at DESC,t.id ASC").bind(kind,id).all();
 const contacts=kind==='company'?await this.db.prepare('SELECT c.*,CASE WHEN c.company_id=? THEN 1 ELSE 0 END AS relationship_primary FROM contacts c WHERE c.company_id=? OR EXISTS(SELECT 1 FROM contact_company_relationships r WHERE r.contact_id=c.id AND r.company_id=?) ORDER BY c.name,c.id').bind(id,id,id).all():kind==='opportunity'?await this.db.prepare('SELECT c.*,oc.is_primary FROM contacts c JOIN opportunity_contacts oc ON oc.contact_id=c.id WHERE oc.opportunity_id=?').bind(id).all():{results:[]};
 const opportunities=kind==='company'?await this.db.prepare('SELECT o.*,s.name AS stage_name,p.display_name AS owner_name FROM opportunities o JOIN pipeline_stages s ON s.id=o.stage_id LEFT JOIN operators p ON p.id=o.owner_id WHERE company_id=?').bind(id).all():kind==='contact'?await this.db.prepare('SELECT o.*,s.name AS stage_name,p.display_name AS owner_name FROM opportunities o JOIN opportunity_contacts oc ON oc.opportunity_id=o.id JOIN pipeline_stages s ON s.id=o.stage_id LEFT JOIN operators p ON p.id=o.owner_id WHERE oc.contact_id=?').bind(id).all():{results:[]};
 const company=record.company_id?await this.db.prepare('SELECT * FROM companies WHERE id=?').bind(record.company_id).first():null;
 const ownership=kind!=='opportunity'&&options.ownership!==false&&!legacyActorContext(this.db)?(await reconcileLegacyOwnership(this.db),await readOwnership(this.db,kind,id)):undefined;
 return {record,company,...(ownership?{ownership}:{}),timeline:entries.results,movementHistory:kind==='opportunity'?movementHistory(entries.results):[],contacts:contacts.results,opportunities:opportunities.results,openValueCents:opportunities.results.reduce((sum:number,o:any)=>sum+(o.lifecycle==='open'?o.value_cents:0),0)};}
 async search(kind:RecordKind,query:string,filters:Record<string,string>={},options:{ownership?:boolean}={}){
  if(kind!=='opportunity'&&options.ownership!==false&&!legacyActorContext(this.db))await reconcileLegacyOwnership(this.db);
  const clauses=['1=1'],values:string[]=[];if(query.trim()){
   const match=query.trim().split(/\s+/).map(token=>`"${token.replaceAll('"','""')}"*`).join(' AND ');
   clauses.push(`id IN (SELECT record_id FROM record_search WHERE record_search MATCH ? AND record_type=? UNION SELECT r.record_id FROM timeline_search s JOIN timeline_entry_records r ON r.timeline_entry_id=s.entry_id WHERE timeline_search MATCH ? AND r.record_type=?)`);values.push(match,kind,match,kind);
  }
  if(kind!=='opportunity'&&filters.owner_id){clauses.push(filters.owner_id==='unassigned'?`NOT EXISTS(SELECT 1 FROM record_ownership x WHERE x.record_type=? AND x.record_id=${tables[kind]}.id AND x.owner_id IS NOT NULL)`:`EXISTS(SELECT 1 FROM record_ownership x WHERE x.record_type=? AND x.record_id=${tables[kind]}.id AND x.owner_id=?)`);values.push(kind,...(filters.owner_id==='unassigned'?[]:[filters.owner_id]));}
  if(kind==='opportunity'&&filters.owner_id==='unassigned'){clauses.push('owner_id IS NULL');delete filters.owner_id;}
  if(kind==='opportunity')for(const field of ['lifecycle','stage_id','owner_id','band','queue_state'])if(filters[field]){clauses.push(`${field}=?`);values.push(filters[field]);}
  if(kind==='opportunity'&&filters.pipeline_id){clauses.push('stage_id IN(SELECT stage_id FROM pipeline_stage_rules WHERE pipeline_id=?)');values.push(filters.pipeline_id);}
  const selection=kind==='opportunity'?'*,(SELECT pipeline_id FROM pipeline_stage_rules WHERE stage_id=opportunities.stage_id) AS pipeline_id,(SELECT name FROM companies WHERE id=opportunities.company_id) AS company_name,(SELECT name FROM pipeline_stages WHERE id=opportunities.stage_id) AS stage_name':kind==='contact'?'*,(SELECT name FROM companies WHERE id=contacts.company_id) AS company_name':'*';
  const records=(await this.db.prepare(`SELECT ${selection} FROM ${tables[kind]} WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC,id LIMIT 50`).bind(...values).all()).results;
  if(kind!=='opportunity'&&options.ownership!==false&&!legacyActorContext(this.db)){const owners=await ownershipForRecords(this.db,kind,records.map(record=>String(record.id)));return records.map(record=>({...record,ownership:owners.get(String(record.id))??{ownerId:null,ownerName:null,revision:0}}));}
  return records;
 }
 async lifecycle(id:string,state:'open'|'won'|'lost',reason:string,actor:string){await requireRecord(this.db,'opportunity',id);if(state!=='open'&&!reason.trim())throw new RecordError(400,'Give a closing reason.');const now=new Date().toISOString();await this.db.batch([this.db.prepare("UPDATE opportunities SET lifecycle=?,closed_at=?,closed_by=?,close_reason=?,queue_state='none',queue_reason=?,next_due_at=NULL,updated_at=? WHERE id=?").bind(state,state==='open'?null:now,state==='open'?null:actor,state==='open'?null:reason,state==='open'?'Operator reopened':'Operator closed',now,id),this.db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Opportunity lifecycle changed' WHERE opportunity_id=?").bind(id),...(state==='open'?[]:[this.db.prepare("UPDATE outbound_messages SET state='cancelled',failure=?,updated_at=? WHERE opportunity_id=? AND state='scheduled'").bind(closedReason(state),now,id)]),...(state==='open'?[mutationJob(this.db,id,actor,'Operator reopened')]:[]),...timeline(this.db,actor,'opportunity',id,'lifecycle.changed',{state,reason}),audit(this.db,actor,'lifecycle.changed','opportunity',id,{state,reason})]);return {id,state};}
}
