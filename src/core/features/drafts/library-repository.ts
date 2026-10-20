import {createId} from '../../shared/ids';
import {WorkbenchError} from '../workbench/repository';
import {isFullOperator} from '../access/identity-class';
import {audit} from '../records/shared';

export type LibraryKind='template'|'snippet'|'signature';
export interface LibraryEntry {id:string;kind:LibraryKind;name:string;subject:string;body:string;visibility:'private'|'shared';owner_id:string;revision:number;updated_at:string}
export type LibraryInput=Pick<LibraryEntry,'kind'|'name'|'subject'|'body'|'visibility'>;
export const mergeFields=['contact.name','contact.email','contact.job_title','company.name','deal.title','owner.name','owner.email'] as const;
export function validateFields(text:string){
 const rest=text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g,(_,key:string)=>{if(!(mergeFields as readonly string[]).includes(key))throw new WorkbenchError(400,`Unsupported merge field: ${key}. Choose a listed field.`);return '';});
 if(rest.includes('{{')||rest.includes('}}'))throw new WorkbenchError(400,'Complete each merge field with {{ and }}.');
}
export class LibraryRepository {
 constructor(readonly db:D1Database){}
 async access(actor:string){
  if(!await isFullOperator(this.db,actor))throw new WorkbenchError(403,'The message library requires a full operator.');
  return Boolean(await this.db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor).first());
 }
 permissionFence(actor:string,shared=false){return this.db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'library_permission_changed',NULL WHERE NOT EXISTS(SELECT 1 FROM operators o WHERE o.id=? AND o.status='active' ${shared?'AND o.setup_owner=1':''} AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id))`).bind(actor);}
 async list(actor:string){const admin=await this.access(actor);return {entries:(await this.db.prepare("SELECT * FROM message_library WHERE owner_id=? OR visibility='shared' ORDER BY kind,name,id").bind(actor).all<LibraryEntry>()).results,admin,actorId:actor,fields:mergeFields};}
 async read(id:string,actor:string){await this.access(actor);const entry=await this.db.prepare("SELECT * FROM message_library WHERE id=? AND (owner_id=? OR visibility='shared')").bind(id,actor).first<LibraryEntry>();if(!entry)throw new WorkbenchError(404,'Library entry is unavailable.');return entry;}
 async save(actor:string,input:LibraryInput,id?:string,revision?:number){
  const admin=await this.access(actor),before=id?await this.read(id,actor):null;
  if((input.visibility==='shared'||before?.visibility==='shared')&&!admin)throw new WorkbenchError(403,'Only the installation owner manages shared content until TEAM-005 adds team and restricted sharing permissions.');
  if(before&&before.owner_id!==actor&&!admin)throw new WorkbenchError(403,'Only the owner of this private entry can change it.');
  validateFields(input.subject+'\n'+input.body);
  const key=id??createId(),at=new Date().toISOString();
  const write=before?this.db.prepare('UPDATE message_library SET kind=?,name=?,subject=?,body=?,visibility=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(input.kind,input.name,input.subject,input.body,input.visibility,at,key,revision??0):this.db.prepare('INSERT INTO message_library(id,kind,name,subject,body,visibility,owner_id,revision,updated_at) VALUES(?,?,?,?,?,?,?,1,?)').bind(key,input.kind,input.name,input.subject,input.body,input.visibility,actor,at);
  const result=await this.db.batch([this.permissionFence(actor,input.visibility==='shared'||before?.visibility==='shared'),write]);
  if(result[1]!.meta.changes!==1)throw new WorkbenchError(409,'The library revision changed. Reload it before saving.');
  await audit(this.db,actor,'library.saved','message_library',key,{revision:(before?.revision??0)+1,visibility:input.visibility}).run();
  return this.read(key,actor);
 }
 async remove(actor:string,id:string,revision:number){const admin=await this.access(actor),entry=await this.read(id,actor);if(entry.visibility==='shared'&&!admin)throw new WorkbenchError(403,'Only the installation owner manages shared content.');const result=await this.db.batch([this.permissionFence(actor,entry.visibility==='shared'),this.db.prepare('DELETE FROM message_library WHERE id=? AND revision=?').bind(id,revision)]);if(result[1]!.meta.changes!==1)throw new WorkbenchError(409,'The library revision changed. Reload it before deleting.');await audit(this.db,actor,'library.deleted','message_library',id,{revision}).run();return {deleted:true};}
}
