import { privacyMatcher, suppressionContextFence, contactSuppressionStatements, suppressionStatements, suppressionPredicate } from './suppression';
import {invalidateSuppressedWork} from './suppression-effects';
import { audit, RecordError, requireRecord, tables, timeline } from './shared';
import {mergeReviewToken,mergeReviewFence,type MergeReview} from './merge-review';
export class ImportMergeRepository {
 constructor(readonly db:D1Database){}
 async candidates(kind:'contact'|'company'):Promise<Record<string,any>[][]>{
  const records=(await this.db.prepare(`SELECT * FROM ${tables[kind]} ORDER BY id`).all<Record<string,any>>()).results;const groups=new Map<string,Record<string,any>[]>();
  for(const row of records){const name=row.name?.trim().toLowerCase().replace(/\s+/g,' ');if(!name)continue;const group=groups.get(name)??[];group.push(row);groups.set(name,group);}
  const candidates=[...groups.values()].filter(group=>group.length>1),companyIds=[...new Set(candidates.flat().map(record=>record.company_id).filter(Boolean))];
  const companies=kind==='contact'&&companyIds.length?(await this.db.prepare('SELECT id,name FROM companies WHERE id IN(SELECT value FROM json_each(?))').bind(JSON.stringify(companyIds)).all<{id:string;name:string}>()).results:[],companyNames=new Map(companies.map(company=>[company.id,company.name]));
  // Enrich only after hashing the native row: display context is not a merge field.
  return Promise.all(candidates.map(group=>Promise.all(group.map(async record=>({...record,...kind==='contact'?{companyName:companyNames.get(record.company_id)??null}:{},mergeReviewToken:await mergeReviewToken(record)})))));
 }
 async merge(kind:'contact'|'company',survivorId:string,retiredId:string,choices:Record<string,'survivor'|'retired'>,actor:string,reviewed:MergeReview){
  if(survivorId===retiredId)throw new RecordError(400,'Choose two different records.');const survivor=await requireRecord(this.db,kind,survivorId),retired=await requireRecord(this.db,kind,retiredId);
  if(!reviewed||reviewed.survivor!==await mergeReviewToken(survivor)||reviewed.retired!==await mergeReviewToken(retired))throw new RecordError(409,'Records changed; find matching names again and review the current values before merging.');
  const fields=kind==='contact'?['name','email','phone','job_title','timezone','company_id','contactability','custom_fields_json']:['name','primary_domain','custom_fields_json'];const values:Record<string,any>={};
  for(const field of fields){if(survivor[field]!==retired[field]&&!choices[field])throw new RecordError(400,`Choose the surviving value for ${field}.`);values[field]=choices[field]==='retired'?retired[field]:survivor[field];}
  if(kind==='contact'&&(survivor.contactability==='do_not_contact'||retired.contactability==='do_not_contact'))values.contactability='do_not_contact';
  const keyColumn=kind==='contact'?'email_key':'primary_domain_key',key=choices[kind==='contact'?'email':'primary_domain']==='retired'?retired[keyColumn]:survivor[keyColumn];values[keyColumn]=key;values.updated_at=new Date().toISOString();
  const aliases=kind==='contact'?(await this.db.prepare("SELECT identity_key FROM record_aliases WHERE record_type='contact' AND survivor_id IN(?,?)").bind(survivorId,retiredId).all<{identity_key:string}>()).results:[];
  const match=kind==='contact'?await privacyMatcher(this.db):null;
  const tokens=match?[...new Set((await Promise.all([survivor.email,retired.email,...aliases.map(alias=>alias.identity_key)].map(email=>match(email)))).flat())]:[];
  const statements:D1PreparedStatement[]=[mergeReviewFence(this.db,kind,[survivor,retired]),...suppressionContextFence(this.db,tokens)];
  if(kind==='contact'&&values.contactability==='do_not_contact')statements.push(...await contactSuppressionStatements(this.db,survivorId),...await contactSuppressionStatements(this.db,retiredId),...await suppressionStatements(this.db,[values.email]));
  statements.push(this.db.prepare('INSERT INTO record_merge_claims VALUES(?,?,?,?)').bind(kind,retiredId,survivorId,values.updated_at),this.db.prepare(`UPDATE ${tables[kind]} SET ${keyColumn}=NULL WHERE id=?`).bind(retiredId));
  for(const oldKey of [survivor[keyColumn],retired[keyColumn]])if(oldKey&&oldKey!==key)statements.push(this.db.prepare('INSERT INTO record_aliases VALUES(?,?,?,?,?) ON CONFLICT(record_type,identity_key) DO UPDATE SET survivor_id=excluded.survivor_id').bind(kind,oldKey,survivorId,retiredId,values.updated_at));
  statements.push(this.db.prepare('UPDATE record_merge_claims SET survivor_id=? WHERE record_type=? AND survivor_id=?').bind(survivorId,kind,retiredId),this.db.prepare('UPDATE record_aliases SET survivor_id=? WHERE record_type=? AND survivor_id=?').bind(survivorId,kind,retiredId));
  if(kind==='company')for(const table of ['contacts','opportunities'])statements.push(this.db.prepare(`UPDATE ${table} SET company_id=? WHERE company_id=?`).bind(survivorId,retiredId));
  else {
   statements.push(this.db.prepare('DELETE FROM ai_previews WHERE recipient_contact_id IN(?,?)').bind(survivorId,retiredId),this.db.prepare('UPDATE opportunity_contacts SET is_primary=0 WHERE contact_id=? AND opportunity_id IN(SELECT opportunity_id FROM opportunity_contacts WHERE contact_id=?)').bind(retiredId,survivorId),this.db.prepare('INSERT OR IGNORE INTO opportunity_contacts SELECT opportunity_id,?,is_primary,created_at FROM opportunity_contacts WHERE contact_id=?').bind(survivorId,retiredId),this.db.prepare('UPDATE drafts SET recipient_contact_id=?,is_stale=1,stale_reason=\'Contact merged\' WHERE recipient_contact_id=?').bind(survivorId,retiredId),this.db.prepare('UPDATE outbound_messages SET contact_id=? WHERE contact_id=?').bind(survivorId,retiredId));
  }
  for(const [table,field]of [['timeline_entry_records','timeline_entry_id'],['signal_links','signal_id']]){
   if(table==='timeline_entry_records')statements.push(this.db.prepare('INSERT OR IGNORE INTO timeline_entry_records SELECT timeline_entry_id,record_type,? FROM timeline_entry_records WHERE record_type=? AND record_id=?').bind(survivorId,kind,retiredId));
   else statements.push(this.db.prepare('INSERT OR IGNORE INTO signal_links SELECT signal_id,record_type,?,linking_basis,linked_at FROM signal_links WHERE record_type=? AND record_id=?').bind(survivorId,kind,retiredId));
   statements.push(this.db.prepare(`DELETE FROM ${table} WHERE record_type=? AND record_id=?`).bind(kind,retiredId));
  }
  const keys=Object.keys(values);statements.push(this.db.prepare(`UPDATE ${tables[kind]} SET ${keys.map(k=>`${k}=${kind==='contact'&&k==='contactability'?`CASE WHEN contactability='do_not_contact' OR ${suppressionPredicate(tokens)} OR EXISTS(SELECT 1 FROM contacts WHERE id='${retiredId}' AND contactability='do_not_contact') THEN 'do_not_contact' ELSE ? END`:'?'}`).join(',')} WHERE id=?`).bind(...keys.map(k=>values[k]),survivorId),this.db.prepare(`DELETE FROM ${tables[kind]} WHERE id=?`).bind(retiredId),...timeline(this.db,actor,kind,survivorId,'record.merged',{retiredId,choices}),audit(this.db,actor,'record.merged',kind,survivorId,{retiredId,choices}));
  if(kind==='contact')statements.push(...invalidateSuppressedWork(this.db,survivorId),this.db.prepare('UPDATE opportunity_contacts SET is_primary=1 WHERE contact_id=? AND NOT EXISTS(SELECT 1 FROM opportunity_contacts p WHERE p.opportunity_id=opportunity_contacts.opportunity_id AND p.is_primary=1)').bind(survivorId));
  try{await this.db.batch(statements);}catch(error){if(String(error).includes('runtime_controls.value'))throw new RecordError(409,'Record or suppression context changed; find matching names again and review the current values before merging.');if(String(error).includes('UNIQUE'))throw new RecordError(409,'The record was already merged or its identity changed. Reload before merging.');throw error;}return {id:survivorId,retiredId};
 }
}
