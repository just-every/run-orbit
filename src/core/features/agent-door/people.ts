import type { PeopleAdapter, Person } from '../../../base/modules/agent-door/types.ts';
import type { TeamAdapter, ManagedMember } from '../../../base/modules/business-settings/types.ts';
import type { PlatformBindings } from '../../platform/assets';
import { createOrbitIdentity } from '../identity/auth';
import { personColumns, personOf, type PersonRow } from '../identity/store';
import { operatorListingPredicate } from '../identity/operator-listing';

export function orbitPeople(bindings: PlatformBindings): PeopleAdapter {
 const db=bindings.DB;
 const person=async(id:string):Promise<Person|null>=>{
  const row=await db.prepare(`SELECT ${personColumns('o')} FROM operators o WHERE o.id=? AND ${operatorListingPredicate('o')} AND (o.setup_owner=1 OR NOT EXISTS(SELECT 1 FROM identity_domain_policies p WHERE p.domain=substr(lower(o.email),instr(o.email,'@')+1)) OR EXISTS(SELECT 1 FROM identity_domain_policies p JOIN oa_identity_providers provider ON provider.provider_id=p.provider_id AND provider.status='linked' JOIN identity_bindings binding ON binding.issuer=provider.issuer AND binding.operator_id=o.id WHERE p.domain=substr(lower(o.email),instr(o.email,'@')+1) AND EXISTS(SELECT 1 FROM identity_settings WHERE id=1 AND idp_sign_in=1))) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))`).bind(id).first<PersonRow>();
  const native=personOf(row);
  return native?{id:native.id,email:native.email,name:native.displayName,role:native.role,active:native.status==='active'}:null;
 };
 const owner=()=>db.prepare('SELECT id FROM operators WHERE setup_owner=1 ORDER BY created_at,id LIMIT 1').first<{id:string}>();
 return {
  person,
  async sponsor({sub}) {
   const settings=await db.prepare('SELECT owner_id FROM bs_settings WHERE singleton=1 AND stopped=0').first<{owner_id:string|null}>();
   if(!settings)return null;
   if(settings.owner_id===sub){const native=await owner();return native?person(native.id):null;}
   const rows=(await db.prepare("SELECT operator_id FROM bs_team WHERE business_id=? AND state='active' AND operator_id IS NOT NULL").bind(sub).all<{operator_id:string}>()).results;
   return rows.length===1?person(rows[0].operator_id):null;
  },
  async session(request){const session=await createOrbitIdentity(bindings)?.auth.getSession(request);return session?person(session.operator.id):null;},
  businessRole(p){return p.role==='owner'?'owner':p.role==='admin'?'editor':null;},
  async businessMember(p){
   const state=await db.prepare('SELECT owner_id FROM bs_settings WHERE singleton=1 AND stopped=0').first<{owner_id:string|null}>();
   if(!state)return null;
   if(state.owner_id&&(await owner())?.id===p.id)return{id:state.owner_id,role:'owner'};
   const rows=(await db.prepare("SELECT business_id,business_role FROM bs_team WHERE operator_id=? AND state='active' AND business_id IS NOT NULL").bind(p.id).all<{business_id:string;business_role:string}>()).results;
   return rows.length===1?{id:rows[0].business_id,role:rows[0].business_role==='admin'?'editor':null}:null;
  }
 };
}

/** Roster sync binds only a current native account. It never creates a shadow
 * account, promotes a collaborator, accepts their invitation, or removes a
 * seller without Orbit's required handover. Those jobs remain native lifecycle. */
export function orbitTeam(db:D1Database):TeamAdapter {
 return {
  async ownerEmail(){return (await db.prepare('SELECT email FROM operators WHERE setup_owner=1 AND status=\'active\'').first<{email:string}>())?.email??null;},
  async prepare({members,managed,guard}){
   const rows:ManagedMember[]=[];
   for(const member of members){
    const previous=managed.find(row=>member.id&&row.businessId===member.id)||managed.find(row=>row.email===member.email);
    // An established Business ID never moves when its roster email changes.
    const native=previous?.operatorId
     ? await db.prepare('SELECT id,email,status,EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id) AS collaborator,setup_owner FROM operators WHERE id=?').bind(previous.operatorId).first<{id:string;email:string;status:string;collaborator:number;setup_owner:number}>()
     : await db.prepare('SELECT id,email,status,EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id) AS collaborator,setup_owner FROM operators WHERE lower(email)=lower(?)').bind(member.email).first<{id:string;email:string;status:string;collaborator:number;setup_owner:number}>();
    const conflict=!!native&&(native.setup_owner===1||(member.role==='admin'&&native.collaborator===1)||managed.some(row=>row.operatorId===native.id&&row.businessId&&row.businessId!==member.id));
    rows.push({email:member.email,operatorId:conflict?null:native?.id??null,invite:member.invite,state:conflict?'conflict':!native?'invited':native.status==='active'?'active':'inactive',businessId:member.id??null,businessRole:member.role});
   }
   const statements=[db.prepare(`INSERT INTO bs_assert(value) SELECT CASE WHEN ${guard.sql} THEN 1 ELSE NULL END`).bind(...guard.args)];
   return {statements,rows,async afterCommit(){}};
  }
 };
}
