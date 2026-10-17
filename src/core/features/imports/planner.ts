import { planD1Import,canonicalJson,sha256,type D1ImportContext,type MappingResult,type SourceRecord,type TargetEffect } from '../../../modules/import-kit/d1/index';
import { contactEmailKey,companyDomainKey } from '../records/identity';
import { privacyMatcher,activeSuppressionTokens } from '../records/suppression';
import { readImport,nativeId,email,positive,ids,type Row } from './source';
import { tables,type NativeValue } from './targets';
import type { StopValue } from './targets-stop';
import {mailboxListSql} from './mailboxes';
import type { ImportInput } from './contracts';
import {namedCompanies} from './named-companies';
import {resolveImportOwners,importedOwnerEffects} from './owners';

/** A custom field keeps a whole number or decimal as a number, and everything else as text. */
function customValues(values:Record<string,string>){return Object.fromEntries(Object.entries(values).map(([name,value])=>[name,/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(value)?Number(value):value]));}

export async function prepareImport(input:ImportInput,context:D1ImportContext){
 const {source,rows,namespace}=readImport(input),db=context.storage.database,at=new Date().toISOString(),results=new Map<SourceRecord,MappingResult>(),references=new Map<string,string>();
 await resolveImportOwners(db,input,rows);
 const settings=await db.prepare('SELECT free_mail_domains_json FROM workspace_settings').first();
 const stages=new Set((await db.prepare('SELECT id FROM pipeline_stages').all()).results.map(r=>r.id));
 const shapes:Record<string,Record<string,any>>={};
 for(const [kind,table] of Object.entries(tables)){const columns=(await db.prepare(`PRAGMA table_info(${table})`).all()).results;shapes[kind]=Object.fromEntries(columns.map(c=>[c.name,c.dflt_value==null?null:c.dflt_value.startsWith("'")?c.dflt_value.slice(1,-1).replaceAll("''", "'"):Number(c.dflt_value)]));}
 const identityKey=(row:Row)=>row.error?null:row.kind==='contact'?contactEmailKey(row.data.email):row.kind==='company'?companyDomainKey(row.data.domain,JSON.parse(settings?.free_mail_domains_json??'[]')):null;
 const stopEmails=new Set<string>(),consentHolds=new Set<string>(),matchEmail=await privacyMatcher(db as unknown as D1Database),activeStops=await activeSuppressionTokens(db as unknown as D1Database);
 const emailTokens=new Map<string,string[]>();
 for(const row of rows){if(row.kind==='suppression'){const address=email(row.data.email??'');if(address)stopEmails.add(address);else row.error??='Suppression email is invalid.';}if(row.kind==='contact'){
  const address=email(row.data.email??'');if(row.data.email&&!address)row.error??='Email is invalid; provide one address per row.';
  if(address){const tokens=await matchEmail(address);emailTokens.set(address,tokens);if(tokens.some(token=>activeStops.has(token)))stopEmails.add(address);}
  if(address&&(positive(row.data.dnc)||!!row.data.bounce||positive(row.data.quarantined)))stopEmails.add(address);else if(address&&!permission(row))consentHolds.add(address);
 }}
 // A missing permission holds only people new to Orbit: a contact already here keeps the contactability its operators set.
 const known=new Set((await db.prepare("SELECT email_key AS key FROM contacts WHERE email_key IN(SELECT value FROM json_each(?)) UNION SELECT identity_key AS key FROM record_aliases WHERE record_type='contact' AND identity_key IN(SELECT value FROM json_each(?))").bind(JSON.stringify([...consentHolds].map(contactEmailKey)),JSON.stringify([...consentHolds].map(contactEmailKey))).all()).results.map(r=>r.key));
 for(const address of consentHolds)if(!known.has(contactEmailKey(address)))stopEmails.add(address);
 rows.push(...namedCompanies(rows));
 // Resolve only explicit source IDs or unambiguous native identity keys. Existing records are linked, never overwritten.
 const emails=[...stopEmails].sort(),stopId=nativeId(namespace,'suppression',sha256(canonicalJson(emails)));
 const existing=new Set<Row>(),duplicates=new Set<string>();
 const identityRows=new Map<string,Row[]>();for(const row of rows){const key=identityKey(row);if(key){const group=identityRows.get(`${row.kind}:${key}`)??[];group.push(row);identityRows.set(`${row.kind}:${key}`,group);}}for(const group of identityRows.values())if(new Set(group.map(r=>r.id)).size>1)for(const row of group)row.error??='Several source IDs share this native identity. Consolidate them explicitly before importing.';
 const markerRows=(await db.prepare('SELECT kind,id,original_json FROM crm_import_targets WHERE id IN(SELECT value FROM json_each(?))').bind(JSON.stringify(rows.filter(r=>r.kind!=='suppression').flatMap(r=>[nativeId(namespace,r.kind,r.id),nativeId(namespace,'owner-history',`${r.kind}:${r.id}`)]))).all()).results;
 const originals=new Map(markerRows.map(r=>[`${r.kind}:${r.id}`,r.original_json]));
 for(const row of rows)row.source.payloadHash=sha256(canonicalJson(row.source.payload));

 const currentIds=new Map<string,Set<string>>(),identities=new Map<string,string[]>();
 for(const kind of ['company','contact','deal','note']){const candidates=rows.filter(r=>r.kind===kind),ids=candidates.map(r=>nativeId(namespace,kind,r.id));currentIds.set(kind,new Set((await db.prepare(`SELECT id FROM ${tables[kind]} WHERE id IN(SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)).all()).results.map(r=>r.id)));
  if(kind==='contact'||kind==='company'){const keys=JSON.stringify(candidates.map(identityKey).filter(Boolean)),column=kind==='contact'?'email_key':'primary_domain_key';
   const matches=(await db.prepare(`SELECT ${column} AS identity_key,id FROM ${tables[kind]} WHERE ${column} IN(SELECT value FROM json_each(?)) UNION SELECT identity_key,survivor_id AS id FROM record_aliases WHERE record_type=? AND identity_key IN(SELECT value FROM json_each(?))`).bind(keys,kind,keys).all()).results;
   for(const match of matches){const key=`${kind}:${match.identity_key}`,list=identities.get(key)??[];if(!list.includes(match.id))list.push(match.id);identities.set(key,list);}
  }
 }
 for(const row of rows){
  const key=`${row.kind}:${row.id}`;if(references.has(key)){duplicates.add(key);continue;}
  if(row.kind==='suppression'){references.set(key,stopId);continue;}
  let id=nativeId(namespace,row.kind,row.id),current=currentIds.get(row.kind)!.has(id);
  if(current&&!originals.has(`${row.kind}:${id}`))existing.add(row);
  if(!current&&(row.kind==='contact'||row.kind==='company')){
   const identity=identityKey(row);
   const matches=identity?identities.get(`${row.kind}:${identity}`)??[]:[];
   if(matches.length>1)row.error??='Identity matches several existing records.';else if(matches.length){id=matches[0];existing.add(row);}
  }
  references.set(key,id);
 }
 // A linked native contact keeps its company and fields. Do not create an unused company for it.
 for(let index=rows.length-1;index>=0;index--){const row=rows[index];if(row.derivedContacts?.every(contact=>existing.has(contact)||contact.error||duplicates.has(`${contact.kind}:${contact.id}`)))rows.splice(index,1);}
 const companyFor=new Map(rows.filter(row=>row.derivedContacts).flatMap(row=>row.derivedContacts!.map(contact=>[contact,row] as const)));
 function permission(row:Row){return row.data.permission?.toLowerCase()==='subscribed'||(!row.data.permission&&input.contactability==='confirmed_contactable');}
 function linked(row:Row,kind:string,field:string){const values=ids(row.data[field],row.separator);return values.map(value=>{const key=`${kind}:${value}`,match=references.get(key);if(!match||duplicates.has(key)||rows.some(other=>other.kind===kind&&other.id===value&&other.error))throw new Error(`This row names a ${kind==='deal'?'deal':kind} ID that is not in the ${kind==='deal'?'deals':kind==='company'?'companies':'contacts'} file. Add that file, or check the ID.`);return match;});}
 for(const row of rows.sort((a,b)=>['suppression','company','contact','deal','note'].indexOf(a.kind)-['suppression','company','contact','deal','note'].indexOf(b.kind))){try{
  if(row.error)throw new Error(row.error);if(duplicates.has(`${row.kind}:${row.id}`))throw new Error('Duplicate source ID in this file.');
  if(row.kind==='suppression'){const reference=nativeId(namespace,'suppression-reference',row.id);results.set(row.source,{effects:[{targetKind:'reference',targetId:reference,value:{row:{id:reference,record_kind:'suppression',record_id:stopId,source_id:row.id,mailbox:email(row.data.email)!},links:[]}}]});continue;}
  if(existing.has(row)){const reference=nativeId(namespace,'reference',`${row.kind}:${row.id}`);results.set(row.source,{effects:[{targetKind:'reference',targetId:reference,value:{row:{id:reference,record_kind:row.kind,record_id:references.get(`${row.kind}:${row.id}`)!,source_id:row.id,mailbox:row.kind==='contact'?email(row.data.email)??null:null},links:[]}}],unmapped:[{reason:'Already in Orbit, with the same email or website domain. Orbit keeps the saved record and does not apply differences from the file. Only a stop in the file (unsubscribed, bounced or Do not contact) changes whether Orbit may email them. Owner mappings do not replace an existing native owner; open the record to review an owner change explicitly.'}]});continue;}
  const id=references.get(`${row.kind}:${row.id}`)!,original=originals.get(`${row.kind}:${id}`);
  if(original){const effects:TargetEffect[]=[{targetKind:row.kind,targetId:id,value:JSON.parse(original)}];for(const [kind,targetId] of [[`${row.kind}-owner`,id],['note',nativeId(namespace,'owner-history',`${row.kind}:${row.id}`)]]){const saved=originals.get(`${kind}:${targetId}`);if(saved)effects.push({targetKind:kind,targetId,value:JSON.parse(saved)});}const mapped=(row.source.payload as any).ownerMapping,owner=effects.find(effect=>effect.targetKind===`${row.kind}-owner`);const ownershipReview=(row.kind==='contact'||row.kind==='company')&&((owner?.value as any)?.owner_id??null)!==(mapped?.ownerId??null);results.set(row.source,{effects,...ownershipReview?{unmapped:[{field:'owner-review',reason:'This record was imported before. A changed owner mapping needs an explicit owner review on its native record; this import will not overwrite its owner. Apply reports a changed source instead of replacing its saved ownership. Use the native owner control for the change.'}]}:{}});continue;}
  const data=row.data,native:Record<string,any>={...shapes[row.kind],id,created_at:at,updated_at:at},links:Record<string,any>[]=[];
  const provenance={vendor:input.vendor,account:input.account,sourceId:row.id,owner:data.owner??null,stage:data.stage??null,description:data.description??null};
  if(row.kind!=='note')native.custom_fields_json=JSON.stringify({...customValues(row.custom),import_source:JSON.stringify(provenance)});
  if(row.kind==='company'){
   if(!data.name)throw new Error('Company name is required.');const domain=data.domain?.trim().toLowerCase().replace(/^www\./,'')||null;
   if(domain&&!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain))throw new Error('Company domain must be a domain without a URL path.');
   Object.assign(native,{name:data.name,primary_domain:domain,primary_domain_key:companyDomainKey(domain,JSON.parse(settings?.free_mail_domains_json??'[]'))});
  }
  if(row.kind==='contact'){
   const named=companyFor.get(row),companies=named?[references.get(`company:${named.id}`)!]:linked(row,'company','company_ids');if(named?.error)throw new Error('The company supplied by Company Name was rejected.');if(companies.length>1)throw new Error('Orbit has one primary company per contact. Choose one source company ID.');
   const name=data.name||[data.first_name,data.last_name].filter(Boolean).join(' ')||null,address=data.email?email(data.email):null;if(!name&&!address)throw new Error('Contact needs a name or email.');
   Object.assign(native,{name,email:address,email_key:contactEmailKey(address),phone:data.phone||null,job_title:data.job_title||null,company_id:companies[0]??null,contactability:address&&!stopEmails.has(address)&&permission(row)?'contactable':'do_not_contact',contactability_revision:0});
  }
  if(row.kind==='deal'){
   const companies=linked(row,'company','company_ids'),contacts=linked(row,'contact','contact_ids');if(companies.length>1)throw new Error('Choose one company ID for the deal.');
   const stage=input.stages[data.stage];if(!stage||!stages.has(stage))throw new Error('Map this row’s source stage to a current Orbit stage.');
   const amount=data.amount?Number(data.amount):0;if(!Number.isFinite(amount)||amount<0||Math.round(amount*100)>100000000000)throw new Error('Amount must be a non-negative decimal in the workspace currency.');
   if(!data.title)throw new Error('Deal title is required.');const close=data.close_date?new Date(data.close_date):null;if(close&&!Number.isFinite(+close))throw new Error('Close date is invalid.');
   Object.assign(native,{title:data.title,lifecycle:'open',stage_id:stage,owner_id:null,company_id:companies[0]??null,value_cents:Math.round(amount*100),expected_close_at:close?.toISOString()??null,score:0,band:'low',queue_state:'none',queue_reason:'Imported history; no action approved'});
   for(const [i,contact] of [...new Set(contacts)].entries())links.push({opportunity_id:id,contact_id:contact,is_primary:i===0?1:0,created_at:at});
  }
  if(row.kind==='note'){
   if(!data.text)throw new Error('Note text is required.');if(!data.occurred_at||!Number.isFinite(Date.parse(data.occurred_at))||Date.parse(data.occurred_at)>Date.now())throw new Error('Map a valid note occurrence time no later than now.');
   for(const kind of ['contact','company','deal'])for(const recordId of linked(row,kind,`${kind}_ids`))links.push({timeline_entry_id:id,record_type:kind==='deal'?'opportunity':kind,record_id:recordId});
   if(!links.length)throw new Error('A note requires at least one explicit record association.');
   for(const field of ['created_at','updated_at'])delete native[field];Object.assign(native,{kind:'import.note',occurred_at:new Date(data.occurred_at).toISOString(),recorded_at:at,actor_type:'source',actor_id:null,source:input.vendor,payload_json:JSON.stringify({text:data.text,importSource:provenance})});
  }
  links.sort((a,b)=>row.kind==='deal'?a.contact_id.localeCompare(b.contact_id):`${a.record_type}:${a.record_id}`.localeCompare(`${b.record_type}:${b.record_id}`));
  if(Object.values(native).some(v=>typeof v==='number'&&!Number.isFinite(v)))throw new Error('Native record has an unsupported default.');
  results.set(row.source,{effects:[{targetKind:row.kind,targetId:id,value:{row:native,links,...row.kind==='contact'?{suppressionTokens:emailTokens.get(native.email)??[]}:{} } as any},...importedOwnerEffects(row,id,namespace,at)],...row.derivedContacts?{unmapped:[{reason:'New company, from the Company name column of the contacts file. Orbit does not reuse a company it already has just because the name matches.'}]}:{}});
 }catch(error){row.error=(error as Error).message;results.set(row.source,{effects:[],rejection:row.error});
  // The exact original remains in kit custody. Rejected rows need only their location and reason in the resumable plan, avoiding unindexed personal-data copies.
  row.source.sourceId=`rejected:${sha256(row.source.sourceId)}`;row.source.payload={rejected:true,...row.ownerMapping?{ownerMapping:{value:row.ownerMapping.value,ownerId:row.ownerMapping.ownerId}}:{},...row.reviewColumns?{reviewColumns:row.reviewColumns}:{}};row.source.payloadHash=sha256(canonicalJson(row.source.payload));}}
 for(const row of rows)if(!row.error&&row.unmapped.length){const result=results.get(row.source)!;result.unmapped=[...result.unmapped??[],...row.unmapped.map(column=>({field:`column:${column}`,reason:`Column “${column}” is not imported. Orbit keeps it only in its private copy of the original file.`}))];}
 // All positive stops and no-consent holds publish in the first atomic kit entry, before any customer creation.
 const saved=await db.prepare('SELECT value_json FROM crm_import_stops WHERE id=?').bind(stopId).first();
 const value:StopValue=saved?JSON.parse(saved.value_json):{emails,proofs:[],contacts:[],at};
 if(!saved&&emails.length){const match=await privacyMatcher(db as unknown as D1Database),tokens=[...new Set((await Promise.all(emails.map(address=>match(address)))).flat())];value.proofs=tokens.map(token=>({mailboxDigest:token,id:nativeId(namespace,'proof',`${stopId}:${token}`),present:1}));
 const contacts=(await db.prepare(`SELECT c.id,c.contactability,c.contactability_revision,${mailboxListSql('c')} AS mailboxes_json FROM contacts c WHERE lower(trim(c.email)) IN(SELECT value FROM json_each(?)) OR c.id IN(SELECT survivor_id FROM record_aliases WHERE record_type='contact' AND lower(trim(identity_key)) IN(SELECT value FROM json_each(?))) ORDER BY c.id`).bind(JSON.stringify(emails),JSON.stringify(emails)).all()).results;
 value.contacts=await Promise.all(contacts.map(async c=>{const mailboxes=JSON.parse(c.mailboxes_json) as string[],mailboxDigests=[...new Set((await Promise.all(mailboxes.map(address=>match(address)))).flat())].sort();return{id:c.id,contactability:'do_not_contact',contactability_revision:c.contactability_revision+1,prior:c.contactability,priorRevision:c.contactability_revision,mailboxes,mailboxDigests};}));}
 const payload={emails},safety:SourceRecord={namespace,kind:'safety',sourceId:stopId,payload,payloadHash:sha256(canonicalJson(payload)),artifactHash:source.artifacts[0].sha256,location:{artifact:source.artifacts[0].name,pointer:'/suppression-first'}};
 const effect:TargetEffect={targetKind:'suppression',targetId:stopId,value:value as any};source.records=[safety,...rows.map((r,i)=>duplicates.has(`${r.kind}:${r.id}`)?{...r.source,sourceId:`duplicate-row-${i}:${sha256(r.id)}`} :r.source)];results.set(safety,{effects:emails.length?[effect]:[]});
 // Keep review labels attributed to source rows, so Kit erasure withdraws them, without making a user rename change the source identity.
 for(const row of rows)if(row.ownerMapping)source.diagnostics.push({severity:'warning',code:'ORBIT_OWNER_MAPPING',message:JSON.stringify(row.ownerMapping),kind:row.source.kind,sourceId:row.source.sourceId,location:row.source.location});
 const plan=await planD1Import(source,{version:'orbit-csv-v1',map:record=>results.get(record)??results.get(rows.find(r=>r.source.kind===record.kind&&r.source.location.artifact===record.location.artifact&&r.source.location.row===record.location.row)?.source??safety)!},{...context,namespace});
 return plan;
}
