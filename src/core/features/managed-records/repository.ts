import {AccessService} from '../access/service';
import {deny} from '../access/errors';
import {GraphRecords} from '../graph/repository';
import {domainEventStatements} from '../effects/event-statements';
import {isFullOperator} from '../access/identity-class';
import {salesAdmin,salesProfile,activeSalesOperator} from '../teams/policy';
import {salesOperationAllowed} from '../teams/permissions';
import {salesCanEdit,salesFieldAllowed} from '../teams/record-access';
import {privatePaths,coversPrivatePath} from '../access/field-policy';
import {audit,RecordError} from '../records/shared';
import {executeArchiveErasure} from '../records/archive-erasure';
import {createId} from '../../shared/ids';
import type {AuthenticatedOperator} from '../identity';
import {managedContext,requireManagedEdit,requireManagedFields,ownerScope,ownerGuard,guard,fencedBatch} from './authority';
import {decodeType,findManagedType,validateValues} from './types';
import type {CreateManagedInput,UpdateManagedInput,ManagedRow,ManagedType,DefinitionsResponse} from './contracts';

export class ManagedRecordsRepository {
 readonly access:AccessService;readonly graph:GraphRecords;
 constructor(readonly db:D1Database){this.access=new AccessService(db);this.graph=new GraphRecords(db,this.access,domainEventStatements);}
 async definitions(operator:AuthenticatedOperator):Promise<DefinitionsResponse>{
  const context=await managedContext(this.db,this.access,operator),profile=await salesProfile(this.db,operator.operatorId),full=await isFullOperator(this.db,operator.operatorId),scope=await ownerScope(this.db,operator),admin=await salesAdmin(this.db,operator.operatorId);
  const rows=(await fencedBatch(this.db,this.access,context,[this.db.prepare('SELECT name,label,fields_json,version FROM managed_record_types ORDER BY label,name')],'read'))[0].results as {name:string;label:string;fields_json:string;version:number}[];
  const types=rows.map(decodeType),writableFields=Object.fromEntries(types.map(type=>[type.name,Object.keys(type.fields).filter(field=>full||!!profile&&profile.role!=='read-only'&&salesFieldAllowed(profile,field)&&privatePaths(field,type.fields,{}).every(path=>profile.fields.some(grant=>coversPrivatePath(grant,path))))]));
  return{types,canManageTypes:admin,canWrite:full||!!profile&&profile.role!=='read-only',canDelete:full||!!profile&&salesOperationAllowed(profile,'record.delete'),operatorId:operator.operatorId,allowUnassigned:scope.allowUnassigned,writableFields};
 }
 async owners(operator:AuthenticatedOperator){
  const context=await managedContext(this.db,this.access,operator),scope=await ownerScope(this.db,operator);
  return{owners:(await fencedBatch(this.db,this.access,context,[this.db.prepare(`SELECT o.id,o.display_name AS name FROM operators o WHERE ${activeSalesOperator('o')} AND ${scope.sql} ORDER BY o.display_name,o.id`).bind(...scope.args)],'read'))[0].results as {id:string;name:string}[]};
 }
 async list(operator:AuthenticatedOperator,kind:string,query:string,cursor?:string){const context=await managedContext(this.db,this.access,operator);await findManagedType(this.db,kind);return this.graph.searchRecords(context,{types:[kind],query,fields:[],filters:{},limit:50,cursor});}
 async detail(operator:AuthenticatedOperator,kind:string,id:string){
  const context=await managedContext(this.db,this.access,operator),type=await findManagedType(this.db,kind),record=await this.graph.getRecord(context,{...context,type:kind,id},[]),full=await isFullOperator(this.db,operator.operatorId),profile=await salesProfile(this.db,operator.operatorId);
  const canEdit=full||await salesCanEdit(this.db,operator.operatorId,kind,id,[]),fields=[...Object.keys(type.fields),'owner_id'];
  const editableFields=canEdit?(await Promise.all(fields.map(async field=>full||await salesCanEdit(this.db,operator.operatorId,kind,id,[field])?field:null))).filter((field):field is string=>field!==null):[];
  await fencedBatch(this.db,this.access,context,[],'read');
  return{...record,canEdit,canDelete:canEdit&&(full||!!profile&&salesOperationAllowed(profile,'record.delete')),editableFields};
 }
 private async source(kind:string,id:string){const row=await this.db.prepare('SELECT * FROM managed_records WHERE kind=? AND id=?').bind(kind,id).first<ManagedRow>();if(!row)deny('Record is unavailable.');return row;}
 private typeGuard(type:ManagedType){return guard(this.db,'EXISTS(SELECT 1 FROM managed_record_types WHERE name=? AND version=?)',[type.name,type.version]);}
 async create(operator:AuthenticatedOperator,kind:string,input:CreateManagedInput){
  const context=await managedContext(this.db,this.access,operator),type=await findManagedType(this.db,kind);
  await this.access.authorize(context,'graph.update',{...context,type:'managed-record-create',id:kind},[]);await requireManagedFields(this.db,operator,type,input.fields);validateValues(type,input.fields);
  const owners=await ownerGuard(this.db,operator,input.owner_id),id=createId(),now=new Date().toISOString();
  await fencedBatch(this.db,this.access,context,[...this.typeGuard(type),...owners,this.db.prepare("INSERT INTO schema_types(workspace_id,name,fields_json,version) SELECT 'workspace',name,fields_json,version FROM managed_record_types WHERE name=? ON CONFLICT(workspace_id,name) DO NOTHING").bind(kind),this.db.prepare('INSERT INTO managed_records(id,kind,owner_id,fields_json,revision,created_at,updated_at) VALUES(?,?,?,?,1,?,?)').bind(id,kind,input.owner_id,JSON.stringify(input.fields),now,now),audit(this.db,operator.operatorId,'managed.record.created',kind,id,{ownerId:input.owner_id,fields:Object.keys(input.fields)})]);
  return{id,kind};
 }
 async update(operator:AuthenticatedOperator,kind:string,id:string,input:UpdateManagedInput){
  const context=await managedContext(this.db,this.access,operator),type=await findManagedType(this.db,kind),keys=Object.keys(input.fields??{}),requested=[...keys,...(input.owner_id!==undefined?['owner_id']:[])];
  await this.access.authorize(context,'graph.update',{...context,type:kind,id},requested);await requireManagedEdit(this.db,operator,kind,id,requested);await requireManagedFields(this.db,operator,type,input.fields??{});
  const previous=await this.source(kind,id);if(input.revision!==undefined&&input.revision!==(await this.graph.stored(context,{...context,type:kind,id})).revision)throw new RecordError(409,'The record changed. Reload before saving.');
  const values={...JSON.parse(previous.fields_json),...input.fields};validateValues(type,values);
  const owners=input.owner_id===undefined?[]:await ownerGuard(this.db,operator,input.owner_id),owner=input.owner_id===undefined?previous.owner_id:input.owner_id;
  await fencedBatch(this.db,this.access,context,[...this.typeGuard(type),...guard(this.db,'EXISTS(SELECT 1 FROM managed_records WHERE kind=? AND id=? AND revision=?)',[kind,id,previous.revision]),...owners,this.db.prepare('UPDATE managed_records SET owner_id=?,fields_json=?,revision=revision+1,updated_at=? WHERE kind=? AND id=?').bind(owner,JSON.stringify(values),new Date().toISOString(),kind,id),audit(this.db,operator.operatorId,'managed.record.updated',kind,id,{fields:keys,...(previous.owner_id!==owner?{previousOwnerId:previous.owner_id,ownerId:owner}:{})})]);
  // Reassignment may remove the caller's own access; never return a stale record.
  return{id,kind,saved:true};
 }
 async remove(operator:AuthenticatedOperator,kind:string,id:string,revision?:number){
  const context=await managedContext(this.db,this.access,operator);await findManagedType(this.db,kind);await this.access.authorize(context,'graph.update',{...context,type:kind,id},[]);await requireManagedEdit(this.db,operator,kind,id,[]);
  const profile=await salesProfile(this.db,operator.operatorId);if(!await isFullOperator(this.db,operator.operatorId)&&(!profile||!salesOperationAllowed(profile,'record.delete')))deny('Delete permission is required.');
  const previous=await this.source(kind,id),projection=await this.graph.stored(context,{...context,type:kind,id});if(revision!==undefined&&revision!==projection.revision)throw new RecordError(409,'The record changed. Reload before deleting.');
  const statements=[...guard(this.db,'EXISTS(SELECT 1 FROM managed_records WHERE kind=? AND id=? AND revision=?)',[kind,id,previous.revision]),this.db.prepare('DELETE FROM managed_records WHERE kind=? AND id=?').bind(kind,id),audit(this.db,operator.operatorId,'managed.record.deleted',kind,'erased')];
  await executeArchiveErasure(this.db,statements,all=>fencedBatch(this.db,this.access,context,all));return{deleted:true};
 }
}
