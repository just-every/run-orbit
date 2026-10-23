import {RecordsRepository} from '../records/repository';
import {companyDomainKey} from '../records/identity';
import {RecordError} from '../records/shared';
import {existingFieldIntake,recordSnapshotFence} from './field-intake';
import type {FormDefinition} from './definition';
export async function formCompany(db:D1Database,form:FormDefinition,values:Record<string,any>,email:string,actor:string,at:string){
 if(!form.companyByEmailDomain&&!Object.keys(values).length)return {id:null,created:false,statements:[],proposals:[]};
 const settings=await db.prepare('SELECT free_mail_domains_json FROM workspace_settings').first<{free_mail_domains_json:string}>(),free=JSON.parse(settings?.free_mail_domains_json??'[]');
 const domain=String(values.primary_domain??email.split('@')[1]).toLowerCase(),key=companyDomainKey(domain,free);
 // Shared freemail domains never identify a company, even with a submitted company name.
 if(!key)return {id:null,created:false,statements:[],proposals:[]};
 const matches=(await db.prepare("SELECT * FROM companies WHERE primary_domain_key=? UNION SELECT c.* FROM record_aliases a JOIN companies c ON c.id=a.survivor_id WHERE a.record_type='company' AND a.identity_key=?").bind(key,key).all<Record<string,any>>()).results;
 if(matches.length>1)throw new RecordError(409,'This company domain needs operator review.');
 const settingsFence=db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'form_company_domains',NULL WHERE (SELECT free_mail_domains_json FROM workspace_settings) IS NOT ?").bind(settings?.free_mail_domains_json??null);
 if(matches[0]){const row=matches[0],plan=existingFieldIntake(db,'company',row,{...values,primary_domain:domain},at);return {id:row.id as string,created:false,statements:[settingsFence,recordSnapshotFence(db,'company',row),...plan.statements],proposals:plan.proposals};}
 const saved=await new RecordsRepository(db).prepareSave('company',{...values,name:values.name??domain,primary_domain:domain},actor);
 return {id:saved.id,created:true,statements:[settingsFence,...saved.statements],proposals:[]};
}
