import type {AuthenticatedOperator} from '../../identity';
import type {SourceSecurity} from '../../../platform/source-security';
import {createId} from '../../../shared/ids';
import {RecordError} from '../../records/shared';
import {ImportRepository} from '../repository';
import {importInput,type ImportInput} from '../contracts';
import {authorized,fence,api,sfId} from './security';
import {describe,mappings,objects,type Metadata,type ObjectName} from './metadata';
import {SalesforceProvider} from './provider';
import type {SalesforceFetch} from './oauth';
export interface Pull {id:string;connection_id:string;actor_id:string;state:string;metadata_json:string;object_name:ObjectName;cursor:string|null;page:number;account_total:number|null;contact_total:number|null;error:string|null;review_id:string|null;created_at:string}
export class SalesforcePulls {
 constructor(readonly db:D1Database,readonly security:SourceSecurity,readonly actor:AuthenticatedOperator,readonly fetcher:SalesforceFetch){}
 provider(id:string){return new SalesforceProvider(this.db,this.security,this.actor,id,this.fetcher);}
 async start(connectionId:string){const provider=this.provider(connectionId),metadata=await describe(provider),connection=await provider.connection(),id=createId();
  await this.db.batch([fence(this.db,this.actor),provider.guard(connection),this.db.prepare('INSERT INTO crm_import_salesforce_pulls(id,connection_id,actor_id,state,metadata_json,created_at) VALUES(?,?,?,\'reading\',?,?)').bind(id,connectionId,this.actor.operatorId,JSON.stringify(metadata),new Date().toISOString())]);return this.status(id);
 }
 async row(id:string){await authorized(this.db,this.actor);const row=await this.db.prepare('SELECT * FROM crm_import_salesforce_pulls WHERE id=? AND actor_id=?').bind(id,this.actor.operatorId).first<Pull>();if(!row)throw new RecordError(404,'Salesforce pull not found.');return row;}
 async status(id:string){const row=await this.row(id);return{...row,metadata_json:undefined,metadata:JSON.parse(row.metadata_json),counts:{Account:row.account_total,Contact:row.contact_total},read:(await this.db.prepare('SELECT object_name,body FROM crm_import_salesforce_pages WHERE pull_id=?').bind(id).all<{object_name:string;body:string}>()).results.reduce((counts,r)=>({...counts,[r.object_name]:(counts[r.object_name]??0)+JSON.parse(r.body).length}),{} as Record<string,number>)};}
 async advance(id:string){const row=await this.row(id),provider=this.provider(row.connection_id);await provider.connection();
  if(!['reading','stopped'].includes(row.state))throw new RecordError(409,'This pull cannot resume. Start a fresh authorized pull.');
  const metadata=JSON.parse(row.metadata_json) as Metadata,names=metadata.fields[row.object_name].filter(f=>f.supported).map(f=>f.name);
  const path=row.cursor??`${api}/query?q=${encodeURIComponent(`SELECT ${names.join(',')} FROM ${row.object_name} ORDER BY Id`)}`;
  try{
   const {body,connection}=await provider.get(path);
   if(!Array.isArray(body.records)||typeof body.done!=='boolean'||!Number.isSafeInteger(body.totalSize)||body.totalSize<0||body.totalSize>1000)throw new RecordError(409,'Salesforce totals exceed the supported 1,000 records per object or the page is incomplete. Use a filtered export; nothing has been applied.');
   const total=row.object_name==='Account'?row.account_total:row.contact_total;if(total!==null&&total!==body.totalSize)throw new RecordError(409,'Salesforce totals changed during the pull. Start a new pull before reviewing.');
   const previous=(await this.db.prepare('SELECT body FROM crm_import_salesforce_pages WHERE pull_id=? AND object_name=? ORDER BY ordinal').bind(id,row.object_name).all<{body:string}>()).results.flatMap(p=>JSON.parse(p.body));
   for(const r of body.records)if(names.some(name=>!Object.hasOwn(r,name)))throw new RecordError(409,`Salesforce ${row.object_name} page omitted a requested field. Check field permissions and export the unavailable field with its Id.`);
   const records=body.records.map((r:any)=>Object.fromEntries(names.filter(name=>Object.hasOwn(r,name)).map(name=>[name,r[name]]))),ids=new Set(previous.map((r:any)=>r.Id));
   for(const r of records){if(!sfId(r.Id)||ids.has(r.Id)||Object.values(r).some(v=>v!==null&&!['string','number','boolean'].includes(typeof v)))throw new RecordError(409,'Salesforce returned a duplicate, invalid ID or unsupported field value. Start a fresh pull.');ids.add(r.Id);}
   if(ids.size>body.totalSize||body.done&&ids.size!==body.totalSize||!body.done&&(!records.length||typeof body.nextRecordsUrl!=='string'||!/^\/services\/data\/v65\.0\/query\/[A-Za-z0-9_-]+$/.test(body.nextRecordsUrl)||body.nextRecordsUrl===row.cursor))throw new RecordError(409,'Salesforce page totals or continuation reference do not reconcile. Start a fresh pull.');
   const nextObject=row.object_name==='Account'&&body.done?'Contact':row.object_name,state=row.object_name==='Contact'&&body.done?'ready':'reading',nextCursor=body.done?null:body.nextRecordsUrl;
   await this.db.batch([fence(this.db,this.actor),provider.guard(connection),this.db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'salesforce_checkpoint',NULL WHERE NOT EXISTS(SELECT 1 FROM crm_import_salesforce_pulls WHERE id=? AND page=? AND state IN('reading','stopped'))").bind(id,row.page),this.db.prepare('INSERT INTO crm_import_salesforce_pages VALUES(?,?,?,?)').bind(id,row.page,row.object_name,JSON.stringify(records)),this.db.prepare(`UPDATE crm_import_salesforce_pulls SET page=page+1,state=?,object_name=?,cursor=?,${row.object_name==='Account'?'account_total':'contact_total'}=?,error=NULL WHERE id=?`).bind(state,nextObject,nextCursor,body.totalSize,id),fence(this.db,this.actor)]);
  }catch(error){const message=error instanceof RecordError?error.message:'Salesforce checkpoint could not be committed. Resume the saved page.';await this.db.prepare("UPDATE crm_import_salesforce_pulls SET state='stopped',error=? WHERE id=? AND page=? AND state IN('reading','stopped')").bind(message,id,row.page).run();throw new RecordError(409,message);}
  return this.status(id);
 }
 async dryRun(id:string,input:{owners:Record<string,string|null>;customFields?:Partial<Record<ObjectName,string[]>>}){
  const row=await this.row(id),provider=this.provider(row.connection_id),connection=await provider.connection();if(row.state!=='ready')throw new RecordError(409,'Finish every Salesforce page before saving a dry run.');
  const metadata=JSON.parse(row.metadata_json) as Metadata,files:ImportInput['files']=[],counts=await this.status(id);
  for(const object of objects){const allowed=metadata.fields[object].filter(f=>f.supported).map(f=>f.name),selected=input.customFields?.[object]??[];
   if(selected.some(name=>!allowed.includes(name)||Object.values(mappings[object]).includes(name)))throw new RecordError(400,`Choose only available, unmapped ${object} fields.`);
   const records=(await this.db.prepare('SELECT body FROM crm_import_salesforce_pages WHERE pull_id=? AND object_name=? ORDER BY ordinal').bind(id,object).all<{body:string}>()).results.flatMap(p=>JSON.parse(p.body));
   if(records.length!==counts.counts[object])throw new RecordError(409,'The persisted Salesforce pages do not match their source totals.');
   const kind=object==='Account'?'company':'contact',mapping=Object.fromEntries(Object.entries(mappings[object]).filter(([,name])=>allowed.includes(name)));
   for(const record of records){if(record.OwnerId&&!Object.hasOwn(input.owners,`${object} OwnerId ${record.OwnerId}`))throw new RecordError(400,`Review ${object} OwnerId ${record.OwnerId}; choose an existing operator or explicitly leave it unassigned.`);if(record.OwnerId&&!sfId(record.OwnerId)||object==='Contact'&&record.AccountId&&!sfId(record.AccountId))throw new RecordError(409,`Invalid Salesforce reference in ${object} ${record.Id}.`);}
   const csv=(cells:unknown[])=>cells.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',');files.push({kind,name:`${object}.csv`,csv:[csv(allowed),...records.map(r=>csv(allowed.map(name=>r[name])))].join('\r\n'),mapping,customFields:selected,separator:';'});
  }
  const repo=new ImportRepository(this.db,this.actor),review=await repo.dryRun(importInput.parse({vendor:'salesforce',account:connection.org_id,files,owners:input.owners,stages:{}}),[],undefined,undefined,undefined,[...metadata.diagnostics.map(d=>({severity:'warning' as const,code:'salesforce-metadata',field:d.source,message:`${d.reason} ${d.exportStep}`})),{severity:'warning',code:'salesforce-reconciliation',message:`Source totals: ${counts.counts.Account} Accounts; ${counts.counts.Contact} Contacts; ${await this.associations(id)} explicit Contact to Account associations. Only these supported entities are included.`}]);
  await this.db.batch([fence(this.db,this.actor),provider.guard(connection),this.db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'salesforce_review',NULL WHERE NOT EXISTS(SELECT 1 FROM crm_import_salesforce_pulls WHERE id=? AND state='ready' AND page=?)").bind(id,row.page),this.db.prepare('UPDATE crm_import_salesforce_pulls SET review_id=? WHERE id=?').bind(review.id,id)]);
  return{...review,salesforce:{organization:connection.org_id,counts:counts.counts,associations:await this.associations(id),diagnostics:metadata.diagnostics}};
 }
 async associations(id:string){const records=(await this.db.prepare("SELECT body FROM crm_import_salesforce_pages WHERE pull_id=? AND object_name='Contact'").bind(id).all<{body:string}>()).results.flatMap(p=>JSON.parse(p.body));return records.filter(r=>r.AccountId).length;}
 async owners(id:string){await this.row(id);const pages=(await this.db.prepare('SELECT object_name,body FROM crm_import_salesforce_pages WHERE pull_id=? ORDER BY ordinal').bind(id).all<{object_name:string;body:string}>()).results,counts=new Map<string,number>();for(const page of pages)for(const row of JSON.parse(page.body))if(row.OwnerId){const key=`${page.object_name} OwnerId ${row.OwnerId}`;counts.set(key,(counts.get(key)??0)+1);}return[...counts].map(([value,count])=>({value,count}));}
}
