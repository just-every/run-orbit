import {AccessService} from '../access/service';
import {AccessError,deny} from '../access/errors';
import {isFullOperator} from '../access/identity-class';
import {privatePaths,coversPrivatePath} from '../access/field-policy';
import {activeSalesOperator,salesAdmin,salesProfile,teamIds} from '../teams/policy';
import {salesFieldAllowed,salesCanEdit} from '../teams/record-access';
import type {AuthenticatedOperator} from '../identity';
import type {ActorContext} from '../../shared/expansion-contracts';
import type {ManagedType,ManagedValues} from './contracts';

export async function managedContext(db:D1Database,access:AccessService,operator:AuthenticatedOperator){
 const scope=await access.originalWorkspace(),context=await access.resolveOperatorContext(operator,scope.workspaceId,crypto.randomUUID());
 if(!await db.prepare(`SELECT 1 FROM operators o WHERE o.id=? AND ${activeSalesOperator('o')}`).bind(operator.operatorId).first())deny('A native operator session is required.');
 if(!await isFullOperator(db,operator.operatorId)&&!await salesProfile(db,operator.operatorId))deny();
 return context;
}
export async function requireTypeAdmin(db:D1Database,operator:AuthenticatedOperator){if(!await salesAdmin(db,operator.operatorId))deny('Only a sales administrator can configure object types.');}
export async function requireManagedEdit(db:D1Database,operator:AuthenticatedOperator,kind:string,id:string,fields:string[]){
 if(await isFullOperator(db,operator.operatorId))return;
 if(!await salesCanEdit(db,operator.operatorId,kind,id,fields))deny('Record or field access is not permitted.');
}
/** Check new values too: private paths must not be introduced under a public field. */
export async function requireManagedFields(db:D1Database,operator:AuthenticatedOperator,type:ManagedType,fields:ManagedValues){
 if(await isFullOperator(db,operator.operatorId))return;
 const profile=await salesProfile(db,operator.operatorId);if(!profile||profile.role==='read-only')deny('Your sales role does not permit record changes.');
 for(const field of Object.keys(fields))if(!salesFieldAllowed(profile,field)||privatePaths(field,type.fields,fields).some(path=>!profile.fields.some(grant=>coversPrivatePath(grant,path))))deny('One or more requested fields are restricted.');
}
export async function ownerScope(db:D1Database,operator:AuthenticatedOperator){
 const full=await isFullOperator(db,operator.operatorId),profile=await salesProfile(db,operator.operatorId);
 if(full||profile?.role==='sales-admin'||profile?.scope==='all')return{sql:'1',args:[] as unknown[],allowUnassigned:true};
 if(profile?.scope==='team')return{sql:"o.id IN(SELECT m.operator_id FROM sales_team_members m JOIN sales_teams t ON t.id=m.team_id WHERE t.active=1 AND m.team_id IN(SELECT value FROM json_each(?)))",args:[JSON.stringify(await teamIds(db,operator.operatorId))],allowUnassigned:false};
 return{sql:'o.id=?',args:[operator.operatorId],allowUnassigned:false};
}
export function guard(db:D1Database,predicate:string,args:unknown[]=[]){const id=crypto.randomUUID();return[db.prepare(`INSERT INTO access_write_guards VALUES(?,CASE WHEN ${predicate} THEN 1 ELSE 0 END)`).bind(id,...args),db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(id)];}
export async function ownerGuard(db:D1Database,operator:AuthenticatedOperator,owner:string|null){
 const scope=await ownerScope(db,operator);
 if(owner===null){if(!scope.allowUnassigned)deny('Choose an active owner within your assigned or team scope.');return[];}
 const predicate=`EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND ${activeSalesOperator('o')} AND ${scope.sql})`,args=[owner,...scope.args];
 if(!await db.prepare(`SELECT 1 WHERE ${predicate}`).bind(...args).first())deny('The selected owner is outside your current access.');
 return guard(db,predicate,args);
}
export async function fencedBatch(db:D1Database,access:AccessService,context:ActorContext,statements:D1PreparedStatement[],mode:'read'|'write'='write'){
 try{const checks=access.fence(context,mode).map(s=>db.prepare(s.sql).bind(...s.bindings));return(await db.batch([...checks,...statements])).slice(checks.length);}
 catch(error){if(/CHECK constraint failed|UNIQUE constraint failed|FOREIGN KEY constraint failed/.test(String(error)))throw new AccessError('conflict','Record or authority changed. Refresh and review before trying again.');throw error;}
}
