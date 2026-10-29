import type {NativeActor} from '../identity';
import {RecordError} from '../records/shared';

const company=`(SELECT json_object('id',co.id,'name',co.name,'updatedAt',co.updated_at) FROM companies co WHERE co.id=r.company_id)`;
const stakeholders=`(SELECT json_group_array(json(item)) FROM (
 SELECT json_object('contactId',c.id,'name',c.name,'email',c.email,'contactability',c.contactability,
 'companyId',c.company_id,'updatedAt',c.updated_at,'isPrimary',oc.is_primary,'createdAt',oc.created_at,
 'roles',json(COALESCE(sr.roles_json,'[]')),'verified',COALESCE(sr.verified,0),
 'verifiedBy',sr.verified_by,'verifiedAt',sr.verified_at,'roleUpdatedAt',sr.updated_at) AS item
 FROM opportunity_contacts oc JOIN contacts c ON c.id=oc.contact_id
 LEFT JOIN opportunity_stakeholder_roles sr ON sr.opportunity_id=oc.opportunity_id AND sr.contact_id=oc.contact_id
 WHERE oc.opportunity_id=r.id ORDER BY c.id))`;
const context=`(SELECT json_object('products',json(products_json),'nextStep',next_step,'mutualCommitments',mutual_commitments,'updatedAt',updated_at)
 FROM opportunity_buying_context WHERE opportunity_id=r.id)`;
const secondary=`(SELECT json_group_array(json(item)) FROM (
 SELECT json_object('companyId',co.id,'name',co.name,'companyUpdatedAt',co.updated_at,
 'verified',rel.verified,'verifiedBy',rel.verified_by,'verifiedAt',rel.verified_at,'updatedAt',rel.updated_at) AS item
 FROM contact_company_relationships rel JOIN companies co ON co.id=rel.company_id
 WHERE rel.contact_id=r.id ORDER BY co.id))`;

/** One SQL read captures the complete reviewed relationship state, including displayed identities. */
export function snapshotSql(kind:'contact'|'opportunity'){
 const detail=kind==='opportunity'
  ?`'stakeholders',json(${stakeholders}),'context',json(${context}),'provenance',json((SELECT json_group_array(contact_id) FROM (SELECT contact_id FROM buying_context_contacts WHERE opportunity_id=r.id ORDER BY contact_id)))`
  :`'secondaryCompanies',json(${secondary})`;
 return `SELECT json_object('record',json_object('id',r.id,'updatedAt',r.updated_at,'companyId',r.company_id,${kind==='opportunity'?"'title',r.title":"'name',r.name,'email',r.email"}),
 'company',json(${company}),${detail}) AS snapshot FROM ${kind==='opportunity'?'opportunities':'contacts'} r WHERE r.id=?`;
}
export async function snapshotRevision(snapshot:string){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot));
 return Array.from(new Uint8Array(hash),value=>value.toString(16).padStart(2,'0')).join('');
}
export async function readSnapshot(db:D1Database,kind:'contact'|'opportunity',id:string){
 const row=await db.prepare(snapshotSql(kind)).bind(id).first<{snapshot:string}>();
 if(!row)throw new RecordError(404,'Record not found.');
 return {raw:row.snapshot,state:JSON.parse(row.snapshot),revision:await snapshotRevision(row.snapshot)};
}
export function reviewedSnapshotFence(db:D1Database,kind:'contact'|'opportunity',id:string,raw:string){
 return db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'relationship_review',NULL WHERE COALESCE((${snapshotSql(kind)}),'')<>?`).bind(id,raw);
}
export function relationshipActorFence(db:D1Database,actor:NativeActor){
 if(!('sessionId' in actor))return db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'relationship_authority',NULL WHERE NOT EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id))").bind(actor.operatorId);

 return db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'relationship_authority',NULL WHERE NOT EXISTS(
 SELECT 1 FROM operators o JOIN sessions s ON s.operator_id=o.id WHERE o.id=? AND o.status='active'
 AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
 AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id))`).bind(actor.operatorId,actor.sessionId);
}
export async function commitRelationships(db:D1Database,statements:D1PreparedStatement[]){
 try{await db.batch(statements);}catch(error){
  if(String(error).includes('runtime_controls.value')||String(error).includes('FOREIGN KEY')||String(error).includes('UNIQUE'))throw new RecordError(409,'The record, relationships or access changed. Reload and review before saving.');
  throw error;
 }
}
