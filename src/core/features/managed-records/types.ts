import {AccessService} from '../access/service';
import {RecordError,audit} from '../records/shared';
import type {AuthenticatedOperator} from '../identity';
import {fencedBatch,guard,managedContext,requireTypeAdmin} from './authority';
import type {ManagedType,FieldDefinition} from './contracts';

interface TypeRow {name:string;label:string;fields_json:string;version:number}
export function decodeType(row:TypeRow):ManagedType{return{name:row.name,label:row.label,fields:JSON.parse(row.fields_json),version:row.version};}
export async function findManagedType(db:D1Database,name:string){const row=await db.prepare('SELECT name,label,fields_json,version FROM managed_record_types WHERE name=?').bind(name).first<TypeRow>();if(!row)throw new RecordError(404,'Object type is unavailable.');return decodeType(row);}

export async function saveManagedType(db:D1Database,operator:AuthenticatedOperator,input:Omit<ManagedType,'version'>&{version?:number},create:boolean){
 const access=new AccessService(db),context=await managedContext(db,access,operator);await requireTypeAdmin(db,operator);
 await access.authorize(context,'access.manage',{...context,type:'managed-record-definitions',id:input.name},[]);
 const now=new Date().toISOString(),serialized=JSON.stringify(input.fields),statements:D1PreparedStatement[]=[];
 if(create){
  if(['contact','company','opportunity','legacy','definitions','owners'].includes(input.name)||await db.prepare("SELECT 1 FROM schema_types WHERE workspace_id='workspace' AND name=?").bind(input.name).first())throw new RecordError(409,'This object type name is already in use.');
  statements.push(...guard(db,"NOT EXISTS(SELECT 1 FROM schema_types WHERE workspace_id='workspace' AND name=?)",[input.name]),db.prepare('INSERT INTO managed_record_types(name,label,fields_json,version,created_at,updated_at) VALUES(?,?,?,1,?,?)').bind(input.name,input.label,serialized,now,now));
 }else{
  const previous=await findManagedType(db,input.name);if(previous.version!==input.version)throw new RecordError(409,'Object fields changed. Reload before saving.');
  // Never orphan stored fields or change their interpretation silently. Optional
  // empty fields can be removed; sensitivity and labels remain live settings.
  statements.push(...guard(db,'EXISTS(SELECT 1 FROM managed_record_types WHERE name=? AND version=?)',[input.name,input.version]));
  const validation=["NOT EXISTS(SELECT 1 FROM managed_records r,json_each(r.fields_json) value WHERE r.kind=? AND NOT EXISTS(SELECT 1 FROM json_each(?) definition WHERE definition.key=value.key))"],args:unknown[]=[input.name,serialized];
  for(const [key,definition]of Object.entries(input.fields)){
   if(previous.fields[key]&&(previous.fields[key].type!==definition.type||previous.fields[key].sensitivity==='private'&&definition.sensitivity!=='private')){validation.push("NOT EXISTS(SELECT 1 FROM managed_records r,json_each(r.fields_json) value WHERE r.kind=? AND value.key=? AND value.type<>'null')");args.push(input.name,key);}
   if(definition.required){validation.push("NOT EXISTS(SELECT 1 FROM managed_records r WHERE r.kind=? AND (json_extract(r.fields_json,?) IS NULL OR trim(CAST(json_extract(r.fields_json,?) AS TEXT))=''))");args.push(input.name,'$.'+key,'$.'+key);}
  }
  const predicate=validation.join(' AND ');if(!await db.prepare(`SELECT 1 WHERE ${predicate}`).bind(...args).first())throw new RecordError(409,'Existing records use these fields. Keep their types and required values, or update those records first.');
  statements.push(...guard(db,predicate,args),db.prepare('UPDATE managed_record_types SET label=?,fields_json=?,version=version+1,updated_at=? WHERE name=?').bind(input.label,serialized,now,input.name));
 }
 statements.push(audit(db,operator.operatorId,create?'managed.type.created':'managed.type.updated','managed-type',input.name,{fieldNames:Object.keys(input.fields)}));
 await fencedBatch(db,access,context,statements);return findManagedType(db,input.name);
}

export function validateValues(type:ManagedType,values:Record<string,unknown>,complete=true){
 for(const [key,value]of Object.entries(values)){
  const definition:FieldDefinition|undefined=type.fields[key];if(!definition)throw new RecordError(400,'A record field is not defined for this object type.');
  if(value===null){if(definition.required)throw new RecordError(400,definition.label+' is required.');continue;}
  const valid=definition.type==='text'?typeof value==='string':definition.type==='number'?typeof value==='number'&&Number.isFinite(value):definition.type==='boolean'?typeof value==='boolean':typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
  if(!valid||definition.required&&typeof value==='string'&&!value.trim())throw new RecordError(400,'Enter a valid '+definition.label.toLowerCase()+'.');
 }
 if(complete)for(const [key,definition]of Object.entries(type.fields))if(definition.required&&(values[key]===undefined||values[key]===null||values[key]===''))throw new RecordError(400,definition.label+' is required.');
}
