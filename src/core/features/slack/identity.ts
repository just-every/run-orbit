import {salesProfile} from '../teams/policy';
import {salesRowPolicy,salesCanEdit} from '../teams/record-access';
import type {Installation} from './contracts';
export const currentEpoch=async(db:D1Database)=>Number(await db.prepare("SELECT policy_epoch FROM access_workspaces WHERE id='workspace'").first('policy_epoch'));
export function installationMatches(item:Installation,payload:any){return Boolean(item.app_id&&payload.api_app_id===item.app_id&&payload.team?.id===item.team_id&&(payload.enterprise?.id??'')===item.enterprise_id&&payload.user?.team_id===item.team_id);}
export async function actionMapping(db:D1Database,item:Installation,user:string){
 return db.prepare(`SELECT m.operator_id,m.policy_epoch FROM slack_mappings m JOIN operators o ON o.id=m.operator_id JOIN access_memberships a ON a.operator_id=o.id AND a.workspace_id='workspace' AND a.status='active' JOIN access_workspaces w ON w.id=a.workspace_id AND w.policy_epoch=m.policy_epoch
 WHERE m.team_id=? AND m.enterprise_id=? AND m.app_id=? AND m.slack_user_id=? AND m.revoked_at IS NULL AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=o.id)`)
 .bind(item.team_id,item.enterprise_id,item.app_id,user).first<{operator_id:string;policy_epoch:number}>();
}
export async function actorRecordFence(db:D1Database,kind:string,id:string,operator:string,write=false){const profile=await salesProfile(db,operator);if(profile){if(write&&!await salesCanEdit(db,operator,kind,id))return {sql:'0',args:[]};const policy=await salesRowPolicy(db,operator,'g');return {sql:write&&profile.role==='read-only'?'0':`EXISTS(SELECT 1 FROM graph_records g WHERE g.workspace_id='workspace' AND g.kind=? AND g.id=? AND g.retired_into_id IS NULL AND ${policy.sql})`,args:write&&profile.role==='read-only'?[]:[kind,id,...policy.bindings]};}return{sql:`EXISTS(SELECT 1 FROM graph_records g WHERE g.workspace_id='workspace' AND g.kind=? AND g.id=? AND g.retired_into_id IS NULL AND (g.visibility='workspace' OR g.owner_id=?))`,args:[kind,id,operator]};}
