import {stagePolicy,assertRequiredFields,stagePolicyFence} from '../pipelines/stage-policy';
import type {NativeActor} from '../identity';
import {RecordError,requireRecord} from '../records/shared';
import type {OpportunityContext,OpportunityContextInput,Stakeholder} from './contracts';
import {relationshipActivity,type RelationshipReference} from './activity';
import {commitRelationships,readSnapshot,relationshipActorFence,reviewedSnapshotFence} from './snapshot';

type Snapshot=Awaited<ReturnType<typeof readSnapshot>>;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function opportunityView(id:string,snapshot:Snapshot):OpportunityContext{
 const state=snapshot.state;
 return {kind:'opportunity',recordId:id,revision:snapshot.revision,
  company:state.company?{id:state.company.id,name:state.company.name}:null,
  stakeholders:state.stakeholders.map((row:Stakeholder)=>({contactId:row.contactId,name:row.name,email:row.email,
   contactability:row.contactability,isPrimary:Boolean(row.isPrimary),roles:row.roles,
   verified:Boolean(row.verified),verifiedBy:row.verifiedBy,verifiedAt:row.verifiedAt})),
  products:state.context?.products??[],nextStep:state.context?.nextStep??'',mutualCommitments:state.context?.mutualCommitments??''};
}
export async function readOpportunityContext(db:D1Database,id:string){return opportunityView(id,await readSnapshot(db,'opportunity',id));}

export async function saveOpportunityContext(db:D1Database,id:string,input:OpportunityContextInput,actor:NativeActor){
 const snapshot=await readSnapshot(db,'opportunity',id),before=opportunityView(id,snapshot);
 if(snapshot.revision!==input.revision)throw new RecordError(409,'The deal or relationships changed. Reload and review before saving.');
 const deal=await requireRecord(db,'opportunity',id);
 const policy=await stagePolicy(db,String(deal.stage_id));
 assertRequiredFields(policy,{...deal,company_id:input.companyId,primary_contact_id:input.primaryContactId,contact_ids:input.stakeholders.map(item=>item.contactId)});
 const now=new Date().toISOString(),statements=[relationshipActorFence(db,actor),reviewedSnapshotFence(db,'opportunity',id,snapshot.raw),...stagePolicyFence(db,[policy],{id,stage_id:String(deal.stage_id),updated_at:String(deal.updated_at)})];
 if(input.companyId)await requireRecord(db,'company',input.companyId);
 for(const item of input.stakeholders)await requireRecord(db,'contact',item.contactId);
 const refs:RelationshipReference[]=[{kind:'opportunity',id},...(input.companyId?[{kind:'company' as const,id:input.companyId}]:[])];
 const oldById=new Map(before.stakeholders.map(item=>[item.contactId,item])),newById=new Map(input.stakeholders.map(item=>[item.contactId,item]));
 let changed=false;
 for(const old of before.stakeholders)if(!newById.has(old.contactId)){
  changed=true;
  statements.push(db.prepare('DELETE FROM opportunity_contacts WHERE opportunity_id=? AND contact_id=?').bind(id,old.contactId),
   ...relationshipActivity(db,actor.operatorId,'relationship.stakeholder_removed','Removed a deal stakeholder',[...refs,{kind:'contact',id:old.contactId}],{contactId:old.contactId},now));
 }
 const oldPrimary=before.stakeholders.find(item=>item.isPrimary)?.contactId??null;
 const associationsChanged=oldPrimary!==input.primaryContactId||before.stakeholders.length!==input.stakeholders.length||input.stakeholders.some(item=>!oldById.has(item.contactId));
 if(associationsChanged){
  statements.push(db.prepare('UPDATE opportunity_contacts SET is_primary=0 WHERE opportunity_id=?').bind(id));
  for(const item of input.stakeholders)statements.push(db.prepare('INSERT INTO opportunity_contacts(opportunity_id,contact_id,is_primary,created_at) VALUES(?,?,?,?) ON CONFLICT(opportunity_id,contact_id) DO UPDATE SET is_primary=excluded.is_primary').bind(id,item.contactId,item.contactId===input.primaryContactId?1:0,now));
 }
 for(const item of input.stakeholders){
  if(!('sessionId' in actor)&&item.verified&&!before.stakeholders.find(previous=>previous.contactId===item.contactId)?.verified)throw new RecordError(403,'A person must verify a stakeholder assertion.');
  const old=oldById.get(item.contactId),roles=[...item.roles].sort();
  if(old&&same([...old.roles].sort(),roles)&&old.verified===item.verified)continue;
  changed=true;
  // Verification records an intentional human assertion, never an inferred role or permission.
  const verifiedBy=item.verified?(old?.verified?old.verifiedBy:actor.operatorId):null;
  const verifiedAt=item.verified?(old?.verified?old.verifiedAt:now):null;
  statements.push(db.prepare(`INSERT INTO opportunity_stakeholder_roles VALUES(?,?,?,?,?,?,?)
   ON CONFLICT(opportunity_id,contact_id) DO UPDATE SET roles_json=excluded.roles_json,verified=excluded.verified,verified_by=excluded.verified_by,verified_at=excluded.verified_at,updated_at=excluded.updated_at`).bind(id,item.contactId,JSON.stringify(roles),item.verified?1:0,verifiedBy,verifiedAt,now),
   ...relationshipActivity(db,actor.operatorId,old?'relationship.stakeholder_updated':'relationship.stakeholder_added',old?'Updated stakeholder roles or verification':'Added a deal stakeholder',
    [...refs,{kind:'contact',id:item.contactId}],{contactId:item.contactId,previous:old?{roles:old.roles,verified:old.verified}:null,current:{roles,verified:item.verified}},now));
 }
 if(oldPrimary!==input.primaryContactId){
  changed=true;
  statements.push(...relationshipActivity(db,actor.operatorId,'relationship.primary_recipient_changed','Changed the primary outreach recipient',
   [...refs,...[...new Set([oldPrimary,input.primaryContactId].filter((value):value is string=>!!value))].map(contactId=>({kind:'contact' as const,id:contactId}))],
   {previous:oldPrimary,current:input.primaryContactId},now));
 }
 if((before.company?.id??null)!==input.companyId){
  changed=true;
  statements.push(db.prepare('UPDATE opportunities SET company_id=?,updated_at=? WHERE id=?').bind(input.companyId,now,id),
   ...relationshipActivity(db,actor.operatorId,'relationship.deal_company_changed','Changed the deal company',[...refs,...(before.company?[{kind:'company' as const,id:before.company.id}]:[])],{previous:before.company?.id??null,current:input.companyId},now));
 }
 const contextChanged=!same(before.products,input.products)||before.nextStep!==input.nextStep||before.mutualCommitments!==input.mutualCommitments;
 if(contextChanged){
  changed=true;
  statements.push(db.prepare(`INSERT INTO opportunity_buying_context VALUES(?,?,?,?,?) ON CONFLICT(opportunity_id) DO UPDATE SET products_json=excluded.products_json,next_step=excluded.next_step,mutual_commitments=excluded.mutual_commitments,updated_at=excluded.updated_at`).bind(id,JSON.stringify(input.products),input.nextStep,input.mutualCommitments,now),
   ...relationshipActivity(db,actor.operatorId,'relationship.buying_context_updated','Updated products, next step or mutual commitments',
    [...refs,...[...new Set([...snapshot.state.provenance,...before.stakeholders.map(item=>item.contactId),...input.stakeholders.map(item=>item.contactId)])].map(contactId=>({kind:'contact' as const,id:contactId as string}))],{},now));
 }
 // Even unchanged context acquires attribution when a stakeholder joins it.
 if(contextChanged||snapshot.state.context)for(const contactId of new Set([...before.stakeholders.map(item=>item.contactId),...input.stakeholders.map(item=>item.contactId)])){
  statements.push(db.prepare('INSERT OR IGNORE INTO buying_context_contacts VALUES(?,?)').bind(id,contactId));
 }
 if(changed)statements.push(db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Deal relationships or buying context changed',updated_at=? WHERE opportunity_id=?").bind(now,id));
 await commitRelationships(db,statements);
 return readOpportunityContext(db,id);
}
