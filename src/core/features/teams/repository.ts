import type {AuthenticatedOperator} from '../identity';
import {operatorListingPredicate} from '../identity/operator-listing';
import {audit,RecordError} from '../records/shared';
import {activeSalesOperator,salesAdmin,salesProfile} from './policy';
import type {SalesProfile,ShareInput,TeamSettings} from './contracts';

export class TeamsRepository {
 constructor(readonly db:D1Database){}
 async admin(actor:AuthenticatedOperator){
  if(!await salesAdmin(this.db,actor.operatorId))throw new RecordError(403,'Only a sales administrator can manage sales access.');
 }
 private guard(predicate:string,args:unknown[]=[]):D1PreparedStatement[]{
  const id=crypto.randomUUID();
  return [this.db.prepare(`INSERT INTO access_write_guards VALUES(?,CASE WHEN ${predicate} THEN 1 ELSE 0 END)`).bind(id,...args),this.db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(id)];
 }
 private userGuard(id:string){return this.guard(`EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND ${activeSalesOperator('o')})`,[id]);}
 private teamGuard(id:string){return this.guard('EXISTS(SELECT 1 FROM sales_teams WHERE id=? AND active=1)',[id]);}
 private async commit(actor:AuthenticatedOperator,statements:D1PreparedStatement[],action:string,kind:string,id:string,details:unknown){
  const authority=this.guard(`EXISTS(SELECT 1 FROM operators o JOIN sessions s ON s.operator_id=o.id LEFT JOIN sales_roles r ON r.operator_id=o.id WHERE o.id=? AND ${activeSalesOperator('o')} AND (o.setup_owner=1 OR r.role='sales-admin') AND s.id=? AND s.revoked_at IS NULL AND s.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name IN('restore','archive_import'))`,[actor.operatorId,actor.sessionId]);
  try {await this.db.batch([...authority,...statements,audit(this.db,actor.operatorId,action,kind,id,details)]);}
  catch(error){if(/CHECK constraint failed|UNIQUE constraint failed|FOREIGN KEY constraint failed/.test(String(error)))throw new RecordError(409,'Access or the selected item changed. Refresh and review before trying again.');throw error;}
 }
 async describe(actor:AuthenticatedOperator):Promise<TeamSettings>{
  await this.admin(actor);
  const [people,teams,members,shares,dashboards]=await Promise.all([
   this.db.prepare(`SELECT o.id,o.display_name,o.email,o.setup_owner FROM operators o WHERE ${activeSalesOperator('o')} AND ${operatorListingPredicate('o')} ORDER BY o.display_name,o.id`).all<{id:string;display_name:string;email:string;setup_owner:number}>(),
   this.db.prepare('SELECT * FROM sales_teams ORDER BY name,id').all<{id:string;name:string;active:number;default_dashboard_id:string|null}>(),
   this.db.prepare(`SELECT m.team_id,m.operator_id FROM sales_team_members m JOIN operators o ON o.id=m.operator_id WHERE ${activeSalesOperator('o')}`).all<{team_id:string;operator_id:string}>(),
   this.db.prepare(`SELECT s.*,COALESCE(json_extract(r.fields_json,'$.name'),json_extract(r.fields_json,'$.title'),'Untitled record') AS name,CASE s.subject_kind WHEN 'user' THEN o.display_name ELSE t.name END AS subject_name FROM sales_record_shares s LEFT JOIN graph_records r ON r.kind=s.kind AND r.id=s.record_id AND r.workspace_id='workspace' LEFT JOIN operators o ON s.subject_kind='user' AND o.id=s.subject_id LEFT JOIN sales_teams t ON s.subject_kind='team' AND t.id=s.subject_id ORDER BY s.kind,name,s.id`).all<{id:string;kind:string;record_id:string;subject_kind:'user'|'team';subject_id:string;fields_json:string;can_edit:number;name:string;subject_name:string|null}>(),
   this.db.prepare(`SELECT d.id,json_extract(v.body_json,'$.name') AS name FROM sales_dashboards d JOIN sales_dashboard_versions v ON v.workspace_id=d.workspace_id AND v.dashboard_id=d.id AND v.version=d.version WHERE d.workspace_id='workspace' ORDER BY name,d.id`).all<{id:string;name:string}>()
  ]);
  // Check again before returning the administrator-only directory.
  await this.admin(actor);
  return {members:await Promise.all(people.results.map(async p=>({id:p.id,name:p.display_name,email:p.email,owner:!!p.setup_owner,profile:await salesProfile(this.db,p.id)}))),teams:teams.results.map(t=>({id:t.id,name:t.name,active:!!t.active,defaultDashboardId:t.default_dashboard_id,memberIds:members.results.filter(m=>m.team_id===t.id).map(m=>m.operator_id)})),shares:shares.results.map(s=>({id:s.id,kind:s.kind,recordId:s.record_id,subjectKind:s.subject_kind,subjectId:s.subject_id,fields:JSON.parse(s.fields_json),canEdit:!!s.can_edit,name:s.name,subjectName:s.subject_name??'Removed recipient'})),dashboards:dashboards.results};
 }
 async setRole(actor:AuthenticatedOperator,id:string,profile:SalesProfile){
  await this.admin(actor);
  const owner=await this.db.prepare('SELECT setup_owner FROM operators WHERE id=?').bind(id).first<{setup_owner:number}>();
  if(owner?.setup_owner)throw new RecordError(403,'The installation owner always retains full recovery access.');
  await this.commit(actor,[...this.userGuard(id),...this.guard('NOT EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1)',[id]),this.db.prepare('INSERT INTO sales_roles(operator_id,role,scope,fields_json,permissions_json,include_associations) VALUES(?,?,?,?,?,?) ON CONFLICT(operator_id) DO UPDATE SET role=excluded.role,scope=excluded.scope,fields_json=excluded.fields_json,permissions_json=excluded.permissions_json,include_associations=excluded.include_associations').bind(id,profile.role,profile.scope,JSON.stringify(profile.fields),JSON.stringify(profile.permissions),Number(profile.includeAssociations))],'sales.role.changed','operator',id,profile);
 }
 async setTeam(actor:AuthenticatedOperator,id:string,input:{name:string;active:boolean;defaultDashboardId:string|null},create=false){
  await this.admin(actor);
  const checks=create?[]:this.guard('EXISTS(SELECT 1 FROM sales_teams WHERE id=?)',[id]);
  if(input.defaultDashboardId)checks.push(...this.guard("EXISTS(SELECT 1 FROM sales_dashboards WHERE workspace_id='workspace' AND id=?)",[input.defaultDashboardId]));
  const statement=create?this.db.prepare('INSERT INTO sales_teams(id,name,active,default_dashboard_id) VALUES(?,?,?,?)').bind(id,input.name,Number(input.active),input.defaultDashboardId):this.db.prepare('UPDATE sales_teams SET name=?,active=?,default_dashboard_id=? WHERE id=?').bind(input.name,Number(input.active),input.defaultDashboardId,id);
  await this.commit(actor,[...checks,statement],create?'sales.team.created':'sales.team.changed','team',id,input);
 }
 async setMembers(actor:AuthenticatedOperator,id:string,operatorIds:string[]){
  await this.admin(actor);
  await this.commit(actor,[...this.teamGuard(id),...operatorIds.flatMap(operatorId=>this.userGuard(operatorId)),this.db.prepare('DELETE FROM sales_team_members WHERE team_id=?').bind(id),...operatorIds.map(operatorId=>this.db.prepare('INSERT INTO sales_team_members(team_id,operator_id) VALUES(?,?)').bind(id,operatorId))],'sales.team.members.changed','team',id,{operatorIds});
 }
 async share(actor:AuthenticatedOperator,id:string,input:ShareInput){
  await this.admin(actor);
  const record=this.guard("EXISTS(SELECT 1 FROM graph_records WHERE workspace_id='workspace' AND kind=? AND id=? AND retired_into_id IS NULL)",[input.kind,input.recordId]);
  const subject=input.subjectKind==='user'?this.userGuard(input.subjectId):this.teamGuard(input.subjectId);
  await this.commit(actor,[...record,...subject,this.db.prepare('INSERT INTO sales_record_shares(id,kind,record_id,subject_kind,subject_id,fields_json,can_edit) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,record_id=excluded.record_id,subject_kind=excluded.subject_kind,subject_id=excluded.subject_id,fields_json=excluded.fields_json,can_edit=excluded.can_edit').bind(id,input.kind,input.recordId,input.subjectKind,input.subjectId,JSON.stringify(input.fields),Number(input.canEdit))],'sales.record.shared','record-share',id,input);
 }
 async revoke(actor:AuthenticatedOperator,id:string){
  await this.admin(actor);
  const existing=await this.db.prepare('SELECT * FROM sales_record_shares WHERE id=?').bind(id).first();
  if(!existing)throw new RecordError(404,'Record share not found.');
  await this.commit(actor,[this.db.prepare('DELETE FROM sales_record_shares WHERE id=?').bind(id)],'sales.record.share.revoked','record-share',id,existing);
 }
 async setVisibility(actor:AuthenticatedOperator,kind:string,id:string,visibility:'workspace'|'restricted'){
  await this.admin(actor);
  const row=await this.db.prepare("SELECT visibility FROM graph_records WHERE workspace_id='workspace' AND kind=? AND id=? AND retired_into_id IS NULL").bind(kind,id).first<{visibility:string}>();
  if(!row)throw new RecordError(404,'Record not found.');
  await this.commit(actor,[...this.guard("EXISTS(SELECT 1 FROM graph_records WHERE workspace_id='workspace' AND kind=? AND id=? AND retired_into_id IS NULL AND visibility=?)",[kind,id,row.visibility]),this.db.prepare("UPDATE graph_records SET visibility=? WHERE workspace_id='workspace' AND kind=? AND id=?").bind(visibility,kind,id)],'sales.record.visibility.changed',kind,id,{previous:row.visibility,visibility});
 }
 async records(actor:AuthenticatedOperator,query:string){
  await this.admin(actor);
  const rows=await this.db.prepare(`SELECT kind,id,visibility,COALESCE(json_extract(fields_json,'$.name'),json_extract(fields_json,'$.title'),'Untitled record') AS name FROM graph_records WHERE workspace_id='workspace' AND retired_into_id IS NULL AND instr(lower(COALESCE(json_extract(fields_json,'$.name'),json_extract(fields_json,'$.title'),'')),lower(?))>0 ORDER BY name,kind,id LIMIT 40`).bind(query).all<{kind:string;id:string;name:string;visibility:'workspace'|'restricted'}>();
  await this.admin(actor);return rows.results;
 }
}
