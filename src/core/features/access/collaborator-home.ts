import {isFullOperator} from './identity-class';
import {roleAllows} from './policy';
export interface AppAccess{full:boolean;workspace:boolean;reports:boolean}
/** What a signed-in person may open in the app. A full operator opens everything. A collaborator
 * opens the owner's pages only when their profile reads the workspace (legacy.read), and Reports
 * only when it reads analytics; a Guest's profile reads neither, so they work in Shared records. */
export async function appAccess(db:D1Database,operatorId:string):Promise<AppAccess>{
 if(await isFullOperator(db,operatorId))return{full:true,workspace:true,reports:true};
 const member=await db.prepare("SELECT m.role,b.actions_json FROM access_memberships m JOIN access_legacy_mapping l ON l.workspace_id=m.workspace_id LEFT JOIN access_role_bundles b ON b.workspace_id=m.workspace_id AND b.role=m.role WHERE m.operator_id=? AND m.status='active'").bind(operatorId).first<{role:string;actions_json:string|null}>();
 const can=(action:string)=>!!member&&(member.actions_json?(JSON.parse(member.actions_json) as string[]).includes(action):roleAllows(member.role,action));
 return{full:false,workspace:can('legacy.read'),reports:can('analytics.read')};
}
const collaboratorPages=['/app/shared-records','/app/access'];
/** Where a collaborator's request for an owner-only page goes instead: their shared records. */
export async function collaboratorLanding(db:D1Database,operatorId:string,path:string):Promise<string|null>{
 const access=await appAccess(db,operatorId);if(access.workspace)return null;
 const page=path.replace(/\/+$/,'')||'/';
 if(collaboratorPages.includes(page)||(access.reports&&page==='/app/reports'))return null;
 return '/app/shared-records';
}
