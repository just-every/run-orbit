import type {AuthenticatedOperator} from '../identity';
import {RecordError,requireRecord} from '../records/shared';
import type {ContactContext,ContactContextInput,SecondaryCompany} from './contracts';
import {relationshipActivity} from './activity';
import {commitRelationships,readSnapshot,relationshipActorFence,reviewedSnapshotFence} from './snapshot';

function contactView(id:string,snapshot:Awaited<ReturnType<typeof readSnapshot>>):ContactContext{
 return {kind:'contact',recordId:id,revision:snapshot.revision,
  primaryCompany:snapshot.state.company?{id:snapshot.state.company.id,name:snapshot.state.company.name}:null,
  secondaryCompanies:snapshot.state.secondaryCompanies.map((row:SecondaryCompany)=>({companyId:row.companyId,name:row.name,verified:Boolean(row.verified),verifiedBy:row.verifiedBy,verifiedAt:row.verifiedAt}))};
}
export async function readContactContext(db:D1Database,id:string){return contactView(id,await readSnapshot(db,'contact',id));}
export async function saveContactContext(db:D1Database,id:string,input:ContactContextInput,actor:AuthenticatedOperator){
 const snapshot=await readSnapshot(db,'contact',id),before=contactView(id,snapshot);
 if(snapshot.revision!==input.revision)throw new RecordError(409,'The contact or company relationships changed. Reload and review before saving.');
 if(input.secondaryCompanies.some(item=>item.companyId===before.primaryCompany?.id))throw new RecordError(400,'The primary company is already associated. Choose a different secondary company.');
 for(const item of input.secondaryCompanies)await requireRecord(db,'company',item.companyId);
 const now=new Date().toISOString(),statements=[relationshipActorFence(db,actor),reviewedSnapshotFence(db,'contact',id,snapshot.raw)];
 const oldById=new Map(before.secondaryCompanies.map(item=>[item.companyId,item])),newById=new Map(input.secondaryCompanies.map(item=>[item.companyId,item]));
 for(const old of before.secondaryCompanies)if(!newById.has(old.companyId)){
  statements.push(db.prepare('DELETE FROM contact_company_relationships WHERE contact_id=? AND company_id=?').bind(id,old.companyId),
   ...relationshipActivity(db,actor.operatorId,'relationship.secondary_company_removed','Removed a secondary company relationship',[{kind:'contact',id},{kind:'company',id:old.companyId}],{contactId:id,companyId:old.companyId},now));
 }
 for(const item of input.secondaryCompanies){
  const old=oldById.get(item.companyId);
  if(old&&old.verified===item.verified)continue;
  statements.push(db.prepare(`INSERT INTO contact_company_relationships VALUES(?,?,?,?,?,?) ON CONFLICT(contact_id,company_id) DO UPDATE SET verified=excluded.verified,verified_by=excluded.verified_by,verified_at=excluded.verified_at,updated_at=excluded.updated_at`)
   .bind(id,item.companyId,item.verified?1:0,item.verified?(old?.verified?old.verifiedBy:actor.operatorId):null,item.verified?(old?.verified?old.verifiedAt:now):null,now),
   ...relationshipActivity(db,actor.operatorId,old?'relationship.secondary_company_updated':'relationship.secondary_company_added',old?'Changed company relationship verification':'Added a secondary company relationship',[{kind:'contact',id},{kind:'company',id:item.companyId}],{contactId:id,companyId:item.companyId,previousVerified:old?.verified??null,verified:item.verified},now));
 }
 await commitRelationships(db,statements);
 return readContactContext(db,id);
}
