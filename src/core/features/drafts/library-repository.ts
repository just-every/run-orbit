import {createId} from '../../shared/ids';
import {WorkbenchError} from '../workbench/repository';
import {isFullOperator} from '../access/identity-class';
import {salesAdmin,salesProfile} from '../teams/policy';
import {audit} from '../records/shared';

export type LibraryKind='template'|'snippet'|'signature';
export interface LibraryEntry {id:string;kind:LibraryKind;name:string;subject:string;body:string;visibility:'private'|'shared';team_id:string|null;owner_id:string;revision:number;updated_at:string}
export type LibraryInput=Pick<LibraryEntry,'kind'|'name'|'subject'|'body'|'visibility'>&{teamId?:string|null};
export const mergeFields=['contact.name','contact.email','contact.job_title','company.name','deal.title','owner.name','owner.email'] as const;
export function validateFields(text:string){
 const rest=text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g,(_,key:string)=>{if(!(mergeFields as readonly string[]).includes(key))throw new WorkbenchError(400,`Unsupported merge field: ${key}. Choose a listed field.`);return '';});
 if(rest.includes('{{')||rest.includes('}}'))throw new WorkbenchError(400,'Complete each merge field with {{ and }}.');
}
/** A team share distributes content only; it never authorizes its merge data. */
export function libraryAudience(actor:string,alias='message_library'){return {sql:`((${alias}.visibility='private' AND ${alias}.owner_id=?) OR (${alias}.visibility='shared' AND (${alias}.team_id IS NULL OR EXISTS(SELECT 1 FROM sales_team_members tm JOIN sales_teams t ON t.id=tm.team_id AND t.active=1 WHERE tm.team_id=${alias}.team_id AND tm.operator_id=?) OR EXISTS(SELECT 1 FROM operators admin LEFT JOIN sales_roles role ON role.operator_id=admin.id WHERE admin.id=? AND admin.status='active' AND (admin.setup_owner=1 OR role.role='sales-admin')))))`,args:[actor,actor,actor]};}

export class LibraryRepository {
 constructor(readonly db:D1Database){}
 async access(actor:string){
  if(!await salesProfile(this.db,actor)&&!await isFullOperator(this.db,actor))throw new WorkbenchError(403,'The message library requires a full operator.');
  return salesAdmin(this.db,actor);
 }
 permissionFence(actor:string,shared=false,author=false,teamId:string|null=null){return this.db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'library_permission_changed',NULL WHERE NOT EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id) ${author?"AND (o.setup_owner=1 OR NOT EXISTS(SELECT 1 FROM sales_roles r WHERE r.operator_id=o.id AND r.role='read-only'))":''} ${shared?"AND (o.setup_owner=1 OR EXISTS(SELECT 1 FROM sales_roles r WHERE r.operator_id=o.id AND r.role='sales-admin'))":''}) ${teamId?'OR NOT EXISTS(SELECT 1 FROM sales_teams t WHERE t.id=? AND t.active=1 AND (EXISTS(SELECT 1 FROM sales_team_members tm WHERE tm.team_id=t.id AND tm.operator_id=?) OR EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status=\'active\' AND (o.setup_owner=1 OR EXISTS(SELECT 1 FROM sales_roles r WHERE r.operator_id=o.id AND r.role=\'sales-admin\')))))':''}`).bind(actor,...(teamId?[teamId,actor,actor]:[]));}
 async list(actor:string){const admin=await this.access(actor),audience=libraryAudience(actor),profile=await salesProfile(this.db,actor);return {entries:(await this.db.prepare(`SELECT * FROM message_library WHERE ${audience.sql} ORDER BY kind,name,id`).bind(...audience.args).all<LibraryEntry>()).results,admin,canAuthor:profile?.role!=='read-only',actorId:actor,fields:mergeFields,teams:(await this.db.prepare('SELECT t.id,t.name FROM sales_teams t WHERE t.active=1 AND (?=1 OR EXISTS(SELECT 1 FROM sales_team_members tm WHERE tm.team_id=t.id AND tm.operator_id=?)) ORDER BY t.name,t.id').bind(Number(admin),actor).all<{id:string;name:string}>()).results};}
 async read(id:string,actor:string){await this.access(actor);const audience=libraryAudience(actor),entry=await this.db.prepare(`SELECT * FROM message_library WHERE id=? AND ${audience.sql}`).bind(id,...audience.args).first<LibraryEntry>();if(!entry)throw new WorkbenchError(404,'Library entry is unavailable.');return entry;}
 async author(actor:string){const admin=await this.access(actor);if((await salesProfile(this.db,actor))?.role==='read-only')throw new WorkbenchError(403,'Your sales role cannot author library content.');return admin;}
 async save(actor:string,input:LibraryInput,id?:string,revision?:number){
  const admin=await this.author(actor),before=id?await this.read(id,actor):null,teamId=input.visibility==='shared'?input.teamId??null:null;
  if(((input.visibility==='shared'&&!teamId)||(before?.visibility==='shared'&&!before.team_id))&&!admin)throw new WorkbenchError(403,'Only sales administrators manage workspace-shared content.');
  if(before&&before.owner_id!==actor&&!admin)throw new WorkbenchError(403,'Only the content author or a sales administrator can change this entry.');
  if(teamId&&!await this.db.prepare('SELECT 1 FROM sales_teams t WHERE t.id=? AND t.active=1 AND (?=1 OR EXISTS(SELECT 1 FROM sales_team_members tm WHERE tm.team_id=t.id AND tm.operator_id=?))').bind(teamId,Number(admin),actor).first())throw new WorkbenchError(403,'Choose one of your active sales teams.');
  validateFields(input.subject+'\n'+input.body);
  const key=id??createId(),at=new Date().toISOString();
  const write=before?this.db.prepare('UPDATE message_library SET kind=?,name=?,subject=?,body=?,visibility=?,team_id=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(input.kind,input.name,input.subject,input.body,input.visibility,teamId,at,key,revision??0):this.db.prepare('INSERT INTO message_library(id,kind,name,subject,body,visibility,team_id,owner_id,revision,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?)').bind(key,input.kind,input.name,input.subject,input.body,input.visibility,teamId,actor,at);
  const result=await this.db.batch([this.permissionFence(actor,(input.visibility==='shared'&&!teamId)||(before?.visibility==='shared'&&!before.team_id),true,teamId),write]);
  if(result[1]!.meta.changes!==1)throw new WorkbenchError(409,'The library revision changed. Reload it before saving.');
  await audit(this.db,actor,'library.saved','message_library',key,{revision:(before?.revision??0)+1,visibility:input.visibility,teamId}).run();
  return this.read(key,actor);
 }
 async remove(actor:string,id:string,revision:number){const admin=await this.author(actor),entry=await this.read(id,actor);if(entry.owner_id!==actor&&!admin)throw new WorkbenchError(403,'Only the content author or a sales administrator can delete this entry.');if(entry.visibility==='shared'&&!entry.team_id&&!admin)throw new WorkbenchError(403,'Only sales administrators manage workspace-shared content.');const result=await this.db.batch([this.permissionFence(actor,entry.visibility==='shared'&&!entry.team_id,true,entry.team_id),this.db.prepare('DELETE FROM message_library WHERE id=? AND revision=?').bind(id,revision)]);if(result[1]!.meta.changes!==1)throw new WorkbenchError(409,'The library revision changed. Reload it before deleting.');await audit(this.db,actor,'library.deleted','message_library',id,{revision}).run();return {deleted:true};}
}
