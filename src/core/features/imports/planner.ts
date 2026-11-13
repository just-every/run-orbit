import {newTask} from '../tasks/mutations';
import {manualEntryPayload} from '../records/manual';
import { planD1Import,canonicalJson,sha256,type D1ImportContext,type MappingResult,type SourceRecord,type TargetEffect } from '../../../modules/import-kit/d1/index';
import { contactEmailKey,companyDomainKey } from '../records/identity';
import { privacyMatcher,activeSuppressionTokens } from '../records/suppression';
import { readImport,nativeId,email,positive,ids,type Row } from './source';
import { tables,type NativeValue } from './targets';
import type { StopValue } from './targets-stop';
import {mailboxListSql} from './mailboxes';
import type { ImportInput } from './contracts';
import {plannedOwner,importOwnerSnapshots} from './owner-targets';
import {mapImportOwners,importOwners} from './owners';
import {namedCompanies} from './named-companies';

/** A custom field keeps a whole number or decimal as a number, and everything else as text. */
function customValues(values:Record<string,string>){return Object.fromEntries(Object.entries(values).map(([name,value])=>[name,/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(value)?Number(value):value]));}

export async function prepareImport(input:ImportInput,context:D1ImportContext,originals:import('../../../modules/import-kit/d1/index').SourceBundle['artifacts']=[],diagnostics:import('../../../modules/import-kit/d1/index').SourceBundle['diagnostics']=[]){
 const {source,rows,namespace}=readImport(input),db=context.storage.database,at=new Date().toISOString(),results=new Map<SourceRecord,MappingResult>(),references=new Map<string,string>();
 source.artifacts.push(...originals);
 source.diagnostics.push(...diagnostics);
 const ownerMappingTable=mapImportOwners(rows,input,await importOwners(db));
 for(const row of rows)if(['deal','task'].includes(row.kind)&&row.ownerMapping){row.source.payload={...row.source.payload as any,chosenOwner:row.ownerMapping.ownerId};row.source.payloadHash=sha256(canonicalJson(row.source.payload));}
 const settings=await db.prepare('SELECT free_mail_domains_json FROM workspace_settings').first();
 const stages=new Set((await db.prepare('SELECT id FROM pipeline_stages').all()).results.map(r=>r.id));
 const shapes:Record<string,Record<string,any>>={};
 for(const [kind,table] of Object.entries(tables)){const columns=(await db.prepare(`PRAGMA table_info(${table})`).all()).results;shapes[kind]=Object.fromEntries(columns.map(c=>[c.name,c.dflt_value==null?null:c.dflt_value.startsWith("'")?c.dflt_value.slice(1,-1).replaceAll("''", "'"):Number(c.dflt_value)]));}
 const nativeKind=(kind:string)=>['call','meeting'].includes(kind)?'note':kind;
 const identityKey=(row:Row)=>row.error?null:row.kind==='contact'?contactEmailKey(row.data.email):row.kind==='company'?companyDomainKey(row.data.domain,JSON.parse(settings?.free_mail_domains_json??'[]')):null;
 const stopEmails=new Set<string>(),consentHolds=new Set<string>(),matchEmail=await privacyMatcher(db as unknown as D1Database),activeStops=await activeSuppressionTokens(db as unknown as D1Database),creationStops=await activeSuppressionTokens(db as unknown as D1Database,true);
 const contactKeys=JSON.stringify(rows.filter(row=>row.kind==='contact').flatMap(row=>{const address=email(row.data.email??'');return address?[contactEmailKey(address)]:[];}));
 const known=new Set((await db.prepare("SELECT email_key AS key FROM contacts WHERE email_key IN(SELECT value FROM json_each(?)) UNION SELECT identity_key AS key FROM record_aliases WHERE record_type='contact' AND identity_key IN(SELECT value FROM json_each(?))").bind(contactKeys,contactKeys).all()).results.map(r=>r.key));
 const emailTokens=new Map<string,string[]>();
 for(const row of rows){if(row.kind==='suppression'){const address=email(row.data.email??'');if(address)stopEmails.add(address);else row.error??='Suppression email is invalid.';}if(row.kind==='contact'){
  const address=email(row.data.email??'');if(row.data.email&&!address)row.error??='Email is invalid; provide one address per row.';
  if(address){const tokens=await matchEmail(address);emailTokens.set(address,tokens);if(tokens.some(token=>activeStops.has(token)||!known.has(contactEmailKey(address))&&creationStops.has(token)))stopEmails.add(address);}
  if(address&&(positive(row.data.dnc)||!!row.data.bounce||positive(row.data.quarantined)))stopEmails.add(address);else if(address&&!permission(row))consentHolds.add(address);
 }}
 // A missing permission holds only people new to Orbit: a contact already here keeps the contactability its operators set.
 for(const address of consentHolds)if(!known.has(contactEmailKey(address)))stopEmails.add(address);
 rows.push(...namedCompanies(rows));
 // Resolve only explicit source IDs or unambiguous native identity keys. Existing records are linked, never overwritten.
 const emails=[...stopEmails].sort(),stopId=nativeId(namespace,'suppression',sha256(canonicalJson(emails)));
 const existing=new Set<Row>(),duplicates=new Set<string>();
 const identityRows=new Map<string,Row[]>();for(const row of rows){const key=identityKey(row);if(key){const group=identityRows.get(`${row.kind}:${key}`)??[];group.push(row);identityRows.set(`${row.kind}:${key}`,group);}}for(const group of identityRows.values())if(new Set(group.map(r=>r.id)).size>1)for(const row of group)row.error??='Several source IDs share this native identity. Consolidate them explicitly before importing.';
 const markerRows=(await db.prepare('SELECT kind,id,original_json FROM crm_import_targets WHERE id IN(SELECT value FROM json_each(?))').bind(JSON.stringify(rows.filter(r=>r.kind!=='suppression').flatMap(r=>[nativeId(namespace,r.kind,r.id),...r.kind==='task'?[nativeId(namespace,'task-series',r.id),nativeId(namespace,'task-entry',r.id)]:[]]))).all()).results;
 const nativeOriginals=new Map(markerRows.map(r=>[`${r.kind}:${r.id}`,r.original_json]));
 const currentIds=new Map<string,Set<string>>(),identities=new Map<string,string[]>();
 for(const kind of ['company','contact','deal','note','call','meeting','task']){const candidates=rows.filter(r=>r.kind===kind),ids=candidates.map(r=>nativeId(namespace,kind,r.id));currentIds.set(kind,new Set((await db.prepare(`SELECT id FROM ${tables[nativeKind(kind)]} WHERE id IN(SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)).all()).results.map(r=>r.id)));
  if(kind==='contact'||kind==='company'){const keys=JSON.stringify(candidates.map(identityKey).filter(Boolean)),column=kind==='contact'?'email_key':'primary_domain_key';
   const matches=(await db.prepare(`SELECT ${column} AS identity_key,id FROM ${tables[kind]} WHERE ${column} IN(SELECT value FROM json_each(?)) UNION SELECT identity_key,survivor_id AS id FROM record_aliases WHERE record_type=? AND identity_key IN(SELECT value FROM json_each(?))`).bind(keys,kind,keys).all()).results;
   for(const match of matches){const key=`${kind}:${match.identity_key}`,list=identities.get(key)??[];if(!list.includes(match.id))list.push(match.id);identities.set(key,list);}
  }
 }
 for(const row of rows){
  const key=`${row.kind}:${row.id}`;if(references.has(key)){duplicates.add(key);continue;}
  if(row.kind==='suppression'){references.set(key,stopId);continue;}
  let id=nativeId(namespace,row.kind,row.id),current=currentIds.get(row.kind)!.has(id);
  if(current&&!nativeOriginals.has(`${nativeKind(row.kind)}:${id}`))existing.add(row);
  if(!current&&(row.kind==='contact'||row.kind==='company')){
   const identity=identityKey(row);
   const matches=identity?identities.get(`${row.kind}:${identity}`)??[]:[];
   if(matches.length>1)row.error??='Identity matches several existing records.';else if(matches.length){id=matches[0];existing.add(row);}
  }
  references.set(key,id);
 }
 // A linked native contact keeps its company and fields. Do not create an unused company for it.
 for(let index=rows.length-1;index>=0;index--){const row=rows[index];if(row.derivedContacts?.every(contact=>existing.has(contact)||contact.error||duplicates.has(`${contact.kind}:${contact.id}`)))rows.splice(index,1);}
 const ownerSnapshots=await importOwnerSnapshots(db,rows.filter(row=>['contact','company'].includes(row.kind)).map(row=>({kind:row.kind,id:references.get(`${row.kind}:${row.id}`)!})));
 const companyFor=new Map(rows.filter(row=>row.derivedContacts).flatMap(row=>row.derivedContacts!.map(contact=>[contact,row] as const)));
 function permission(row:Row){return row.data.permission?.toLowerCase()==='subscribed'||(!row.data.permission&&input.contactability==='confirmed_contactable');}
 function linked(row:Row,kind:string,field:string){const values=ids(row.data[field],row.separator);return values.map(value=>{const key=`${kind}:${value}`,match=references.get(key);if(!match||duplicates.has(key)||rows.some(other=>other.kind===kind&&other.id===value&&other.error))throw new Error(`This row names a ${kind==='deal'?'deal':kind} ID that is not in the ${kind==='deal'?'deals':kind==='company'?'companies':'contacts'} file. Add that file, or check the ID.`);return match;});}
 for(const row of rows.sort((a,b)=>['suppression','company','contact','deal','note','call','meeting','task'].indexOf(a.kind)-['suppression','company','contact','deal','note','call','meeting','task'].indexOf(b.kind))){try{
  if(row.error)throw new Error(row.error);if(duplicates.has(`${row.kind}:${row.id}`))throw new Error('Duplicate source ID in this file.');
  if(row.kind==='suppression'){const reference=nativeId(namespace,'suppression-reference',row.id);results.set(row.source,{effects:[{targetKind:'reference',targetId:reference,value:{row:{id:reference,record_kind:'suppression',record_id:stopId,source_id:row.id,mailbox:email(row.data.email)!},links:[]}}]});continue;}
  const ownerMapping=row.ownerMapping,ownerEffects=ownerMapping&&['contact','company'].includes(row.kind)?plannedOwner(ownerSnapshots,namespace,row.kind,references.get(`${row.kind}:${row.id}`)!,row.id,ownerMapping,context.authorization.principalId,at,input.account):[];
  if(existing.has(row)){const reference=nativeId(namespace,'reference',`${row.kind}:${row.id}`);results.set(row.source,{effects:[{targetKind:'reference',targetId:reference,value:{row:{id:reference,record_kind:row.kind,record_id:references.get(`${row.kind}:${row.id}`)!,source_id:row.id,mailbox:row.kind==='contact'?email(row.data.email)??null:null},links:[]}},...ownerEffects],unmapped:[{reason:'Already in Orbit, with the same email or website domain. Orbit keeps the saved record and does not apply differences from the file. Only a stop in the file (unsubscribed, bounced or Do not contact) changes whether Orbit may email them.'}]});continue;}
  const id=references.get(`${row.kind}:${row.id}`)!,original=nativeOriginals.get(`${nativeKind(row.kind)}:${id}`);
  if(original&&row.kind==='task'){const seriesId=nativeId(namespace,'task-series',row.id),entryId=nativeId(namespace,'task-entry',row.id),series=nativeOriginals.get(`task-series:${seriesId}`),entry=nativeOriginals.get(`note:${entryId}`);if(!series||!entry)throw new Error('The imported task source is withdrawn. Start a fresh reviewed export.');results.set(row.source,{effects:[{targetKind:'task-series',targetId:seriesId,value:JSON.parse(series)},{targetKind:'task',targetId:id,value:JSON.parse(original)},{targetKind:'note',targetId:entryId,value:JSON.parse(entry)}]});continue;}
  if(original){results.set(row.source,{effects:[{targetKind:nativeKind(row.kind),targetId:id,value:JSON.parse(original)},...ownerEffects]});continue;}
  const data=row.data,native:Record<string,any>={...shapes[nativeKind(row.kind)],id,created_at:at,updated_at:at},links:Record<string,any>[]=[];
  const provenance={vendor:input.vendor,account:input.account,sourceId:row.id,owner:data.owner??null,...ownerMapping?{ownerId:ownerMapping.ownerId}:{},stage:data.stage??null,description:data.description??null};
  if(['company','contact','deal'].includes(row.kind))native.custom_fields_json=JSON.stringify({...customValues(row.custom),import_source:JSON.stringify(provenance)});
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
   Object.assign(native,{title:data.title,lifecycle:'open',stage_id:stage,owner_id:ownerMapping?.ownerId??null,company_id:companies[0]??null,value_cents:Math.round(amount*100),expected_close_at:close?.toISOString()??null,score:0,band:'low',queue_state:'none',queue_reason:'Imported history; no action approved'});
   for(const [i,contact] of [...new Set(contacts)].entries())links.push({opportunity_id:id,contact_id:contact,is_primary:i===0?1:0,created_at:at});
  }
  if(['note','call','meeting'].includes(row.kind)){
   if(!data.text)throw new Error('Note text is required.');if(!data.occurred_at||!Number.isFinite(Date.parse(data.occurred_at))||Date.parse(data.occurred_at)>Date.now())throw new Error('Map a valid note occurrence time no later than now.');
   for(const kind of ['contact','company','deal'])for(const recordId of linked(row,kind,`${kind}_ids`))links.push({timeline_entry_id:id,record_type:kind==='deal'?'opportunity':kind,record_id:recordId});
   if(!links.length)throw new Error('A note requires at least one explicit record association.');
   for(const field of ['created_at','updated_at'])delete native[field];const activity=row.kind!=='note';if(activity&&(!Number.isInteger(Number(data.duration))||Number(data.duration)<0))throw new Error('Call and meeting duration must be whole non-negative minutes.');
   Object.assign(native,{kind:activity?`manual.${row.kind}`:'import.note',occurred_at:new Date(data.occurred_at).toISOString(),recorded_at:at,actor_type:'import',actor_id:namespace,source:input.vendor,payload_json:JSON.stringify({...manualEntryPayload({text:data.text,durationMinutes:row.kind==='note'?undefined:Number(data.duration),contactIds:linked(row,'contact','contact_ids')}),importSource:provenance})});
  }
  if(row.kind==='task'){
   const associations=['deal','contact','company'].flatMap(kind=>linked(row,kind,`${kind}_ids`).map(recordId=>({kind:kind==='deal'?'opportunity':kind,recordId}))),primary=associations[0];
   if(!primary)throw new Error('A task requires at least one explicit record association.');
   if((data.text?.length??0)>20000)throw new Error('Task notes exceed 20,000 characters. Export a shorter note explicitly.');
   if(!data.title||data.title.length>300||!Number.isFinite(Date.parse(data.due_at)))throw new Error('Task needs a title and a valid due time.');
   const task=newTask({title:data.title,recordType:primary.kind as any,recordId:primary.recordId,ownerId:ownerMapping?.ownerId??null,dueAt:data.due_at,priority:data.priority==='HIGH'?'high':data.priority==='LOW'?'low':'normal',type:data.task_type==='CALL'?'call':data.task_type==='EMAIL'?'email':'other',notes:data.text??'',recurrence:'none',timezone:'UTC',reminderMinutes:null},context.authorization.principalId,at);
   Object.assign(native,task,{id,series_id:nativeId(namespace,'task-series',row.id),status:data.status==='COMPLETED'?'completed':'open'});
   const seriesId=native.series_id,entryId=nativeId(namespace,'task-entry',row.id),series={row:{id:seriesId,cancelled_at:null,cancelled_by:null,created_at:at},links:[]};
   const entry={row:{id:entryId,kind:'task.created',occurred_at:at,recorded_at:at,actor_type:'import',actor_id:namespace,source:input.vendor,payload_json:JSON.stringify({taskId:id,title:data.title,ownerId:task.owner_id,dueAt:task.due_at,status:native.status,importSource:provenance})},links:associations.map(record=>({timeline_entry_id:entryId,record_type:record.kind,record_id:record.recordId})).sort((a,b)=>`${a.record_type}:${a.record_id}`.localeCompare(`${b.record_type}:${b.record_id}`)),taskId:id};
   results.set(row.source,{effects:[{targetKind:'task-series',targetId:seriesId,value:series},{targetKind:'task',targetId:id,value:{row:native,links:[]}},{targetKind:'note',targetId:entryId,value:entry}]});continue;
  }
  links.sort((a,b)=>row.kind==='deal'?a.contact_id.localeCompare(b.contact_id):`${a.record_type}:${a.record_id}`.localeCompare(`${b.record_type}:${b.record_id}`));
  if(Object.values(native).some(v=>typeof v==='number'&&!Number.isFinite(v)))throw new Error('Native record has an unsupported default.');
  results.set(row.source,{effects:[{targetKind:nativeKind(row.kind),targetId:id,value:{row:native,links,...row.kind==='contact'?{suppressionTokens:emailTokens.get(native.email)??[]}:{} } as any},...ownerEffects],...row.derivedContacts?{unmapped:[{reason:'New company, from the Company name column of the contacts file. Orbit does not reuse a company it already has just because the name matches.'}]}:{}});
 }catch(error){row.error=(error as Error).message;results.set(row.source,{effects:[],rejection:row.error});
  // The exact original remains in kit custody. Rejected rows need only their location and reason in the resumable plan, avoiding unindexed personal-data copies.
  row.source.sourceId=`rejected:${sha256(row.source.sourceId)}`;row.source.payload={rejected:true,...row.reviewColumns?{reviewColumns:row.reviewColumns}:{}};row.source.payloadHash=sha256(canonicalJson(row.source.payload));}}
 for(const row of rows)if(!row.error&&row.unmapped.length){const result=results.get(row.source)!;result.unmapped=[...result.unmapped??[],...row.unmapped.map(column=>({field:`column:${column}`,reason:`Column “${column}” is not imported. Orbit keeps it only in its private copy of the original file.`}))];}
 // Each task projection has its own source identity. Erasure and preserved
 // undo receipts address one native target per source, just like owner effects.
 const taskSources:SourceRecord[]=[];
 for(const row of rows){const result=results.get(row.source);if(row.kind!=='task'||!result||result.rejection)continue;
  const projections=result.effects.filter(effect=>effect.targetKind!=='task');result.effects=result.effects.filter(effect=>effect.targetKind==='task');
  for(const effect of projections){const kind=effect.targetKind==='note'?'task-entry':'task-series',payload={sourceRowId:row.id,taskId:references.get(`task:${row.id}`)!},projection:SourceRecord={...row.source,kind,payload,payloadHash:sha256(canonicalJson(payload))};taskSources.push(projection);results.set(projection,{effects:[effect]});}
 }
 // Ownership has its own source identity, so erasure can withdraw either native target without sharing a reversible effect.
 const ownershipSources:SourceRecord[]=[];
 const referenceKinds=new Map((await db.prepare("SELECT target_id,json_extract(record_json,'$.sourceKind') AS source_kind FROM ik_provenance WHERE target_kind='reference' AND reversed=0 AND target_id IN(SELECT value FROM json_each(?))").bind(JSON.stringify(rows.flatMap(row=>results.get(row.source)?.effects.filter(effect=>effect.targetKind==='reference').map(effect=>effect.targetId)??[]))).all<{target_id:string;source_kind:string}>()).results.map(row=>[row.target_id,row.source_kind]));
 for(const row of rows){const result=results.get(row.source);if(!result||result.rejection)continue;const reference=result.effects.find(effect=>effect.targetKind==='reference');if(reference&&row.kind!=='suppression')row.source.kind=referenceKinds.get(reference.targetId)??`${row.kind}-reference`;const effects=result.effects.filter(effect=>effect.targetKind.endsWith('-owner'));if(!effects.length)continue;result.effects=result.effects.filter(effect=>!effect.targetKind.endsWith('-owner'));
  const history=(effects[0].value as any).history,payload={ownerMapping:row.ownerMapping!,sourceRowId:row.id,mailbox:row.kind==='contact'?row.data.email??null:null,recordId:effects[0].targetId,actorId:history.actor,previousOwnerId:history.previous},ownerSource:SourceRecord={...row.source,sourceId:nativeId(namespace,'owner-source',`${row.kind}:${row.id}:${effects[0].targetId}`),kind:`${row.kind}-owner`,payload,payloadHash:sha256(canonicalJson(payload))};ownershipSources.push(ownerSource);results.set(ownerSource,{effects});
 }
 if(ownerMappingTable.length){const payload={owners:ownerMappingTable},ownerSource:SourceRecord={namespace,kind:'owner-mapping',sourceId:nativeId(namespace,'owner-mapping',canonicalJson(payload)),payload,payloadHash:sha256(canonicalJson(payload)),artifactHash:source.artifacts[0].sha256,location:{artifact:source.artifacts[0].name,pointer:'/owner-mapping'}};ownershipSources.push(ownerSource);results.set(ownerSource,{effects:[]});}
 // All positive stops and no-consent holds publish in the first atomic kit entry, before any customer creation.
 const saved=await db.prepare('SELECT value_json FROM crm_import_stops WHERE id=?').bind(stopId).first();
 const value:StopValue=saved?JSON.parse(saved.value_json):{emails,proofs:[],contacts:[],at};
 if(!saved&&emails.length){const match=await privacyMatcher(db as unknown as D1Database),tokens=[...new Set((await Promise.all(emails.map(address=>match(address)))).flat())];value.proofs=tokens.map(token=>({mailboxDigest:token,id:nativeId(namespace,'proof',`${stopId}:${token}`),present:1}));
 const contacts=(await db.prepare(`SELECT c.id,c.contactability,c.contactability_revision,${mailboxListSql('c')} AS mailboxes_json FROM contacts c WHERE lower(trim(c.email)) IN(SELECT value FROM json_each(?)) OR c.id IN(SELECT survivor_id FROM record_aliases WHERE record_type='contact' AND lower(trim(identity_key)) IN(SELECT value FROM json_each(?))) ORDER BY c.id`).bind(JSON.stringify(emails),JSON.stringify(emails)).all()).results;
 value.contacts=await Promise.all(contacts.map(async c=>{const mailboxes=JSON.parse(c.mailboxes_json) as string[],mailboxDigests=[...new Set((await Promise.all(mailboxes.map(address=>match(address)))).flat())].sort();return{id:c.id,contactability:'do_not_contact',contactability_revision:c.contactability_revision+1,prior:c.contactability,priorRevision:c.contactability_revision,mailboxes,mailboxDigests};}));}
 const payload={emails},safety:SourceRecord={namespace,kind:'safety',sourceId:stopId,payload,payloadHash:sha256(canonicalJson(payload)),artifactHash:source.artifacts[0].sha256,location:{artifact:source.artifacts[0].name,pointer:'/suppression-first'}};
 const effect:TargetEffect={targetKind:'suppression',targetId:stopId,value:value as any};source.records=[safety,...taskSources.filter(record=>record.kind==='task-series'),...rows.map((r,i)=>duplicates.has(`${r.kind}:${r.id}`)?{...r.source,sourceId:`duplicate-row-${i}:${sha256(r.id)}`} :r.source),...ownershipSources,...taskSources.filter(record=>record.kind==='task-entry')];results.set(safety,{effects:emails.length?[effect]:[]});
 const plan=await planD1Import(source,{version:'orbit-csv-v1',map:record=>{const original=record.kind==='safety'?safety:[...rows.map(row=>row.source),...ownershipSources,...taskSources].find(other=>other.kind===record.kind&&other.location.artifact===record.location.artifact&&other.location.row===record.location.row),result=original?results.get(original):undefined;if(!result)throw new Error('Import source mapping is unavailable.');return result;}},{...context,namespace});
 return plan;
}
