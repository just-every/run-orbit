import {RecordError} from '../records/shared';

type Row=Record<string,any>;
/** Read and fence only this merge's relationship rows, including same-timestamp edits. */
async function reviewedRows(db:D1Database,table:string,columns:string[],where:string,ids:string[],order:string){
 const sql=`SELECT json_group_array(json(item)) AS rows FROM (SELECT json_object(${columns.map(name=>`'${name}',"${name}"`).join(',')}) AS item FROM ${table} WHERE ${where} ORDER BY ${order})`;
 const row=await db.prepare(sql).bind(...ids).first<{rows:string}>();
 if(!row)throw new RecordError(409,'Relationship merge review is unavailable.');
 return {rows:JSON.parse(row.rows) as Row[],fence:db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'relationship_merge_review',NULL WHERE (${sql})<>?`).bind(...ids,row.rows)};
}
const companyColumns=['contact_id','company_id','verified','verified_by','verified_at','updated_at'];
const verification=(source:Row,target:Row|undefined,overlaps:boolean)=>{
 const verified=Boolean(source.verified)&&(!overlaps||Boolean(target?.verified));
 return {verified:verified?1:0,by:verified?(target?.verified_by??source.verified_by):null,at:verified?(target?.verified_at??source.verified_at):null};
};

/** The caller places fences before any merge write and transfers after native contact associations are copied. */
export async function prepareRelationshipMerge(db:D1Database,kind:'contact'|'company',survivor:string,retired:string,at:string,primaryCompanyId?:string|null){
 const ids=[survivor,retired];
 const companies=await reviewedRows(db,'contact_company_relationships',companyColumns,`${kind==='contact'?'contact_id':'company_id'} IN(?,?)`,ids,'contact_id,company_id');
 const fences=[companies.fence],transfers:D1PreparedStatement[]=[];
 const destinations=new Map<string,Row>();
 for(const row of companies.rows)if(row[kind==='contact'?'contact_id':'company_id']===survivor)destinations.set(row[kind==='contact'?'company_id':'contact_id'],row);
 const sources=companies.rows.filter(row=>row[kind==='contact'?'contact_id':'company_id']===retired);
 if(kind==='contact'){
  const [associations,roles,provenance,primaries]=await Promise.all([
   reviewedRows(db,'opportunity_contacts',['opportunity_id','contact_id','is_primary','created_at'],'contact_id IN(?,?)',ids,'opportunity_id,contact_id'),
   reviewedRows(db,'opportunity_stakeholder_roles',['opportunity_id','contact_id','roles_json','verified','verified_by','verified_at','updated_at'],'contact_id IN(?,?)',ids,'opportunity_id,contact_id'),
   reviewedRows(db,'buying_context_contacts',['opportunity_id','contact_id'],'contact_id IN(?,?)',ids,'opportunity_id,contact_id'),
   reviewedRows(db,'contacts',['id','company_id'],'id IN(?,?)',ids,'id')
  ]);
  fences.push(associations.fence,roles.fence,provenance.fence,primaries.fence);
  const survivorAssociations=new Set(associations.rows.filter(row=>row.contact_id===survivor).map(row=>row.opportunity_id));
  for(const association of associations.rows.filter(row=>row.contact_id===retired)){
   const source=roles.rows.find(row=>row.contact_id===retired&&row.opportunity_id===association.opportunity_id)??{roles_json:'[]',verified:0};
   const target=roles.rows.find(row=>row.contact_id===survivor&&row.opportunity_id===association.opportunity_id);
   const mergedRoles=[...new Set([...JSON.parse(source.roles_json),...JSON.parse(target?.roles_json??'[]')])].sort();
   const status=verification(source,target,survivorAssociations.has(association.opportunity_id));
   transfers.push(db.prepare(`INSERT INTO opportunity_stakeholder_roles VALUES(?,?,?,?,?,?,?) ON CONFLICT(opportunity_id,contact_id) DO UPDATE SET roles_json=excluded.roles_json,verified=excluded.verified,verified_by=excluded.verified_by,verified_at=excluded.verified_at,updated_at=excluded.updated_at`).bind(association.opportunity_id,survivor,JSON.stringify(mergedRoles),status.verified,status.by,status.at,at));
  }
  transfers.push(db.prepare('INSERT OR IGNORE INTO buying_context_contacts SELECT opportunity_id,? FROM buying_context_contacts WHERE contact_id=?').bind(survivor,retired),db.prepare('DELETE FROM buying_context_contacts WHERE contact_id=?').bind(retired));
  // An explicitly recorded company that is not chosen as primary remains an explicit secondary.
  for(const row of primaries.rows)if(row.company_id&&row.company_id!==primaryCompanyId&&!destinations.has(row.company_id)&&!sources.some(source=>source.company_id===row.company_id))sources.push({contact_id:retired,company_id:row.company_id,verified:0,verified_by:null,verified_at:null});
 }
 for(const source of sources){
  const key=source[kind==='contact'?'company_id':'contact_id'],target=destinations.get(key),status=verification(source,target,Boolean(target));
  const contactId=kind==='contact'?survivor:source.contact_id,companyId=kind==='company'?survivor:source.company_id;
  if(kind==='contact'&&companyId===primaryCompanyId)continue;
  transfers.push(db.prepare(`INSERT INTO contact_company_relationships VALUES(?,?,?,?,?,?) ON CONFLICT(contact_id,company_id) DO UPDATE SET verified=excluded.verified,verified_by=excluded.verified_by,verified_at=excluded.verified_at,updated_at=excluded.updated_at`).bind(contactId,companyId,status.verified,status.by,status.at,at));
 }
 if(kind==='company')transfers.push(db.prepare('DELETE FROM contact_company_relationships WHERE company_id=? AND EXISTS(SELECT 1 FROM contacts c WHERE c.id=contact_company_relationships.contact_id AND c.company_id=?)').bind(survivor,survivor));
 return {fences,transfers};
}
