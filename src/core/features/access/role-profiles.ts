import {defaultRoleActions,roles,type Role} from './policy';
export interface RoleProfile { role: Role; source: 'default' | 'configured'; actions: string[]; fields: string[] }
/** Read model only. Call after administration-read authorization; never use it for authorization. */
export async function readRoleProfiles(db: D1Database, workspaceId: string): Promise<RoleProfile[]> {
  const rows = await db.prepare('SELECT role,actions_json,fields_json FROM access_role_bundles WHERE workspace_id=?').bind(workspaceId).all<{role:string;actions_json:string;fields_json:string}>();
  return roles.map(role => {
    const configured = rows.results.find(row => row.role === role);
    return {role,source:configured?'configured':'default',actions:configured?JSON.parse(configured.actions_json):defaultRoleActions(role),fields:configured?JSON.parse(configured.fields_json):['*']};
  });
}
