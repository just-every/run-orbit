import {payloadHash} from '../../platform/source-security';
import {guard,refused} from '../identity/store';
import {audit} from '../records/shared';
import {company,authorityGuard,endGuard} from './authority';
import {connectionGuard,openConnection,providerCall} from './connection';
import {SupportError,now,type Actor,type Connection,type Organization,type SupportConfig} from './contracts';
export interface Mapping {company_id:string;organization_id:string;organization_name:string;subdomain:string;generation:string|null;reviewed_by:string;reviewed_at:string}
const normalized=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,' ');
export async function mapping(db:D1Database,companyId:string,connection:Connection){const row=await db.prepare('SELECT * FROM support_mappings WHERE company_id=?').bind(companyId).first<Mapping>();if(!row||row.generation!==connection.installation.generation||row.subdomain!==connection.installation.subdomain)throw new SupportError(409,'Review the company’s Zendesk organization mapping before opening tickets.');return row;}
export function mappingGuard(db:D1Database,row:Mapping){return guard(db,{sql:'EXISTS(SELECT 1 FROM support_mappings WHERE company_id=? AND organization_id=? AND subdomain=? AND generation=? AND reviewed_at=?)',args:[row.company_id,row.organization_id,row.subdomain,row.generation,row.reviewed_at]});}
export async function mappingPlan(db:D1Database,config:SupportConfig,actor:Actor,companyId:string,organizationId:string){
 const record=await company(db,actor,companyId),connection=await openConnection(db,config);
 const {organization}=await providerCall<{organization:Organization}>(db,config,connection,`/api/v2/organizations/${organizationId}.json`);
 if(!organization||String(organization.id)!==organizationId||typeof organization.name!=='string'||!Array.isArray(organization.domain_names)||!organization.domain_names.every(d=>typeof d==='string'))throw new SupportError(502,'Zendesk did not return a verifiable organization.');
 if(normalized(record.name)!==normalized(organization.name)||record.primary_domain&&!organization.domain_names.some(domain=>normalized(domain)===normalized(record.primary_domain)))throw new SupportError(409,'The Zendesk organization does not match this company’s name and domain. Nothing was mapped.');
 const elsewhere=await db.prepare('SELECT company_id FROM support_mappings WHERE organization_id=? AND company_id<>?').bind(organizationId,companyId).first();
 if(elsewhere)throw new SupportError(409,'This Zendesk organization is already linked to another company. Nothing was mapped.');
 const existing=await db.prepare('SELECT organization_id,subdomain FROM support_mappings WHERE company_id=?').bind(companyId).first<{organization_id:string;subdomain:string}>();
 if(existing&&(existing.organization_id!==organizationId||existing.subdomain!==connection.installation.subdomain))throw new SupportError(409,'This company already has a different organization mapping. Keep the existing mapping.');
 const reviewed={company:{id:companyId,name:record.name,domain:record.primary_domain??null},organization:{id:organizationId,name:organization.name,domains:organization.domain_names},subdomain:connection.installation.subdomain,generation:connection.installation.generation};
 await company(db,actor,companyId);
 return{...reviewed,digest:await payloadHash(JSON.stringify(reviewed)),connection};
}
export async function saveMapping(db:D1Database,config:SupportConfig,actor:Actor,companyId:string,input:{organizationId:string;digest:string}){
 const plan=await mappingPlan(db,config,actor,companyId,input.organizationId);if(plan.digest!==input.digest)throw new SupportError(409,'The mapping changed since review. Preview it again.');
 try{await db.batch([authorityGuard(db,actor),connectionGuard(db,plan.connection),guard(db,{sql:'EXISTS(SELECT 1 FROM companies WHERE id=? AND name=? AND primary_domain IS ?)',args:[companyId,plan.company.name,plan.company.domain]}),db.prepare('INSERT INTO support_mappings VALUES(?,?,?,?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET generation=excluded.generation,organization_name=excluded.organization_name,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at').bind(companyId,input.organizationId,plan.organization.name,plan.subdomain,plan.generation,actor.operatorId,now(config).toISOString()),audit(db,actor.operatorId,'zendesk.organization-mapped','company',companyId,{organizationId:input.organizationId}),endGuard(db)]);}catch(error){if(refused(error))throw new SupportError(409,'Mapping or access changed. Nothing was mapped. Preview again.');throw error;}
}
