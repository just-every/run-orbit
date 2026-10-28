import {salesProfile} from '../teams/policy';
import {isFullOperator} from '../access/identity-class';
import {salesCanRead} from '../teams/record-access';
import {WorkbenchError} from '../workbench/repository';
import {isRecordMailDatabase} from '../outreach/record-mail-storage';

const expressions:Record<string,string>={'contact.name':'c.name','contact.email':'c.email','contact.job_title':'c.job_title','company.name':'co.name','deal.title':'o.title','owner.name':'a.display_name','owner.email':'a.email'};
/** Read only the merge values used by this message, after native record and field authorization. */
export async function mergeContext(db:D1Database,id:string,actor:string,source:string){
 const profile=await salesProfile(db,actor);
 const canRead=async(kind:string,recordId:string,fields:string[]=[])=>profile?salesCanRead(db,actor,kind,recordId,fields):isFullOperator(db,actor);
 const linked=await db.prepare('SELECT d.recipient_contact_id AS contact_id,d.opportunity_id,c.company_id AS contact_company_id,o.company_id AS deal_company_id FROM drafts d JOIN contacts c ON c.id=d.recipient_contact_id LEFT JOIN opportunities o ON o.id=d.opportunity_id WHERE d.id=?').bind(id).first<{contact_id:string;opportunity_id:string|null;contact_company_id:string|null;deal_company_id:string|null}>();
 if(!linked)throw new WorkbenchError(404,'Draft or recipient is unavailable.');
 const fields=[...new Set([...source.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map(match=>match[1]!))];
 if(!await canRead('contact',linked.contact_id,['email','mail',...fields.filter(field=>field.startsWith('contact.')).map(field=>field.slice(8))]))throw new WorkbenchError(403,'The current recipient or merge fields are outside your sales access.');
 if(linked.opportunity_id&&!await canRead('opportunity',linked.opportunity_id,['mail',...(fields.some(field=>field==='deal.title')?['title']:[])]))throw new WorkbenchError(403,'The current deal is outside your sales access.');
 const companyId=linked.contact_company_id??(isRecordMailDatabase(db)?null:linked.deal_company_id);
 if(fields.includes('company.name')&&companyId&&!await canRead('company',companyId,['name']))throw new WorkbenchError(403,'The company merge field is outside your sales access.');
 const pairs=fields.filter(field=>Object.hasOwn(expressions,field)).flatMap(field=>[`'${field}'`,expressions[field]!]).join(',');
 const sql=`SELECT json_object(${pairs}) AS value FROM drafts d JOIN contacts c ON c.id=d.recipient_contact_id LEFT JOIN opportunities o ON o.id=d.opportunity_id LEFT JOIN companies co ON co.id=${isRecordMailDatabase(db)?'c.company_id':'COALESCE(c.company_id,o.company_id)'} ${isRecordMailDatabase(db)?"LEFT JOIN record_ownership ro ON ro.record_type='contact' AND ro.record_id=c.id":''} LEFT JOIN operators a ON a.id=${isRecordMailDatabase(db)?'CASE WHEN d.opportunity_id IS NOT NULL THEN o.owner_id ELSE ro.owner_id END':'o.owner_id'} WHERE d.id=?`;
 const context=await db.prepare(sql).bind(id).first<{value:string}>();
 if(!context)throw new WorkbenchError(409,'Choose a current linked recipient before rendering.');
 return {sql,value:context.value};
}
