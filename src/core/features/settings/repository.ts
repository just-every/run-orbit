import {operatorListingPredicate} from '../identity/operator-listing';
import { PipelinesRepository } from '../pipelines/repository';
import {removeWithHandover,type RemovalChoices} from './removal-handover';
import { operatorManagementPolicy } from '../../../ext/records';
import { companyDomainKey } from '../records/identity';
import { createId } from '../../shared/ids';
import { audit, RecordError, timeline, mutationJob } from '../records/shared';
export class SettingsRepository {
 constructor(readonly db:D1Database){}
 async read(){const [workspace,operators,pipelines]=await Promise.all([this.db.prepare("SELECT * FROM workspace_settings WHERE id='workspace'").first(),this.db.prepare(`SELECT id,email,display_name,status,setup_owner,EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=operators.id) AS collaborator,(EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=operators.id) AND NOT EXISTS(SELECT 1 FROM access_memberships m WHERE m.operator_id=operators.id)) AS invited FROM operators WHERE ${operatorListingPredicate('operators')} ORDER BY created_at,id`).all(),new PipelinesRepository(this.db).read()]);return {workspace,operators:operators.results,...pipelines};}
 /** Saves the whole workspace; with ifUpdatedAt, only the copy the page last read, so a change made meanwhile is never overwritten. */
 async update(input:{name:string;timezone:string;currency:string;workingHours:{days:number[];start:string;end:string};staleIntervalDays:number;awaitingResponseWorkingDays:number;freeMailDomains:string[]},actor:string,ifUpdatedAt?:string){
  if(ifUpdatedAt!==undefined){const current=await this.db.prepare("SELECT * FROM workspace_settings WHERE id='workspace'").first<{updated_at:string}>();if(current&&current.updated_at!==ifUpdatedAt)return {conflict:true as const,current};}
  try{new Intl.DateTimeFormat('en',{timeZone:input.timezone});}catch{throw new RecordError(400,'Unknown workspace timezone.');}
  if(input.workingHours.start>=input.workingHours.end)throw new RecordError(400,'Working hours must end after they start.');
  const domains=[...new Set(input.freeMailDomains.map(d=>d.trim().toLowerCase().replace(/^www\./,'')))],now=new Date().toISOString();
  const companies=(await this.db.prepare('SELECT id,primary_domain FROM companies WHERE primary_domain IS NOT NULL').all<{id:string;primary_domain:string}>()).results;
  const statements=[this.db.prepare("UPDATE workspace_settings SET name=?,timezone=?,currency=?,working_hours_json=?,stale_interval_days=?,awaiting_response_working_days=?,free_mail_domains_json=?,updated_at=? WHERE id='workspace'").bind(input.name,input.timezone,input.currency,JSON.stringify(input.workingHours),input.staleIntervalDays,input.awaitingResponseWorkingDays,JSON.stringify(domains),now)];
  for(const company of companies)statements.push(this.db.prepare('UPDATE companies SET primary_domain_key=? WHERE id=?').bind(companyDomainKey(company.primary_domain,domains),company.id));
  statements.push(audit(this.db,actor,'workspace.updated','workspace','workspace'));try{await this.db.batch(statements);}catch(error){if(String(error).includes('UNIQUE'))throw new RecordError(409,'Changing free-mail domains would create duplicate company keys. Resolve them first.');throw error;}return {updated:true,workspace:await this.db.prepare("SELECT * FROM workspace_settings WHERE id='workspace'").first()};
 }
 async invite(email:string,name:string,actor:string){if(!operatorManagementPolicy.canInvite({actorId:actor,email,displayName:name}))throw new RecordError(403,'The operator management policy does not permit this invitation.');const id=createId(),now=new Date().toISOString();try{await this.db.batch([this.db.prepare("INSERT INTO operators(id,email,display_name,status,created_at,updated_at) VALUES(?,?,?,'active',?,?)").bind(id,email.toLowerCase(),name,now,now),audit(this.db,actor,'operator.invited','operator',id)]);}catch(error){if(String(error).includes('UNIQUE'))throw new RecordError(409,'An operator already uses this email.');throw error;}return {id};}
 async remove(id:string,actor:string,choices?:RemovalChoices,sessionId?:string){if(!operatorManagementPolicy.canRemove({actorId:actor,operatorId:id}))throw new RecordError(403,'The operator management policy does not permit this removal.');return removeWithHandover(this.db,id,actor,choices,sessionId);}

 async stages(stages:{id?:string;name:string}[],actor:string){return new PipelinesRepository(this.db).legacyStages(stages,actor);}
}
