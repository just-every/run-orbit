import {defaultSalesProfile,type SalesProfile} from './contracts';
export {defaultSalesProfile,type SalesProfile,type SalesRole,type SalesScope} from './contracts';
/** Active native operators only. Collaborators keep their separate invitation/grant model. */
export const activeSalesOperator=(alias:string)=>`${alias}.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=${alias}.id)`;
export async function salesProfile(db:D1Database,id:string):Promise<SalesProfile|null>{
 const row=await db.prepare(`SELECT o.setup_owner,r.role,r.scope,r.fields_json,r.permissions_json,r.include_associations FROM operators o LEFT JOIN sales_roles r ON r.operator_id=o.id WHERE o.id=? AND ${activeSalesOperator('o')}`).bind(id).first<{setup_owner:number;role:SalesProfile['role']|null;scope:SalesProfile['scope'];fields_json:string;permissions_json:string;include_associations:number}>();
 if(!row)return null;
 // The installation owner always retains recovery, even after a restored role row.
 if(row.setup_owner)return defaultSalesProfile('sales-admin');
 if(!row.role)return null;
 return {role:row.role,scope:row.scope,fields:JSON.parse(row.fields_json),permissions:JSON.parse(row.permissions_json),includeAssociations:!!row.include_associations};
}
export async function salesAdmin(db:D1Database,id:string):Promise<boolean>{
 return !!await db.prepare(`SELECT 1 FROM operators o LEFT JOIN sales_roles r ON r.operator_id=o.id WHERE o.id=? AND ${activeSalesOperator('o')} AND (o.setup_owner=1 OR r.role='sales-admin')`).bind(id).first();
}
export async function teamIds(db:D1Database,id:string):Promise<string[]>{
 const rows=await db.prepare(`SELECT t.id FROM sales_teams t JOIN sales_team_members m ON m.team_id=t.id JOIN operators o ON o.id=m.operator_id WHERE t.active=1 AND o.id=? AND ${activeSalesOperator('o')} ORDER BY t.id`).bind(id).all<{id:string}>();
 return rows.results.map(r=>r.id);
}
export async function teamMembers(db:D1Database,teamId:string):Promise<string[]>{
 const rows=await db.prepare(`SELECT o.id FROM sales_teams t JOIN sales_team_members m ON m.team_id=t.id JOIN operators o ON o.id=m.operator_id WHERE t.active=1 AND t.id=? AND ${activeSalesOperator('o')} ORDER BY o.id`).bind(teamId).all<{id:string}>();
 return rows.results.map(r=>r.id);
}
