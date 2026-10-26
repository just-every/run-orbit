import {typedFieldHistory} from './typed-field-history';
import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthenticatedOperator} from '../identity';
import {actorFence,ownerFence,guard,clearGuards,version} from '../identity/store';
import {payloadHash} from '../../platform/source-security';
import {tables,RecordError,audit,type RecordKind} from './shared';
const kind=z.enum(['contact','company','opportunity']);
const definition=z.object({kind,fieldKey:z.string().regex(/^[a-z][a-z0-9_]{0,63}$/).refine(value=>!['constructor','prototype'].includes(value),'Choose a different field key.'),label:z.string().trim().min(1).max(100),valueType:z.enum(['text','number','date','picklist']),required:z.boolean(),unique:z.boolean(),options:z.array(z.string().trim().min(1).max(100)).max(100),archived:z.boolean()}).strict().refine(d=>d.valueType!=='picklist'||d.options.length>0&&new Set(d.options).size===d.options.length,'Picklists need distinct options.');
type Definition=z.infer<typeof definition>;
export type TypedField={kind:RecordKind;field_key:string;label:string;value_type:string;required:number;is_unique:number;options_json:string;archived:number;revision:number};
const empty=(value:unknown)=>value===null||value===undefined||value==='';
export function fieldReason(field:{label:string;value_type:string;required:number;options_json:string},value:unknown){
 if(empty(value))return field.required?'a value is required':null;
 if(field.value_type==='text'&&typeof value!=='string')return 'enter text';
 if(field.value_type==='number'&&(typeof value!=='number'||!Number.isFinite(value)))return 'enter a finite number';
 if(field.value_type==='date'&&(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))return 'enter a real date as YYYY-MM-DD';
 if(field.value_type==='picklist'&&(typeof value!=='string'||!JSON.parse(field.options_json).includes(value)))return 'choose a listed option';
 return null;
}
const policyVersion=(db:D1Database,recordKind:RecordKind)=>db.prepare("SELECT COALESCE(sum(revision),0)||':'||count(*) AS value FROM record_custom_fields WHERE kind=?").bind(recordKind).first<string>('value');
/** Repeat schema and uniqueness checks inside the record's write transaction. */
export async function typedFieldFences(db:D1Database,recordKind:RecordKind,id:string,values:Record<string,unknown>,before:Record<string,unknown>){
 const snapshot=await db.prepare("SELECT COALESCE(sum(revision),0)||':'||count(*) AS value,json_group_array(json_object('kind',kind,'field_key',field_key,'label',label,'value_type',value_type,'required',required,'is_unique',is_unique,'options_json',options_json,'archived',archived,'revision',revision)) AS fields FROM record_custom_fields WHERE kind=?").bind(recordKind).first<{value:string;fields:string}>();
 if(!snapshot)throw new RecordError(409,'Custom field definitions are unavailable.');
 const revision=snapshot.value,fields=JSON.parse(snapshot.fields) as TypedField[],statements=[guard(db,{sql:"(SELECT COALESCE(sum(revision),0)||':'||count(*) FROM record_custom_fields WHERE kind=?)=?",args:[recordKind,revision]})];
 for(const field of fields){const value=values[field.field_key];if(field.archived){if(JSON.stringify(value)!==JSON.stringify(before[field.field_key]))throw new RecordError(400,`${field.label}: archived values are read-only.`);continue;}
  const reason=fieldReason(field,value);if(reason)throw new RecordError(400,`${field.label}: ${reason}.`);
  if(field.is_unique&&!empty(value)){
   const path='$.'+JSON.stringify(field.field_key),sql=`NOT EXISTS(SELECT 1 FROM ${tables[recordKind]} WHERE id<>? AND json_extract(custom_fields_json,?)=?)`,args=[id,path,value as string|number];
   if(!await db.prepare('SELECT '+sql+' AS valid').bind(...args).first<number>('valid'))throw new RecordError(409,`${field.label}: this value already belongs to another record.`);
   statements.push(guard(db,{sql,args}));
  }
 }
 return [...statements,clearGuards(db)];
}
export function typedFieldRoutes(db:D1Database){const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 app.onError((e,c)=>c.json({error:e instanceof RecordError?e.message:e instanceof z.ZodError?'Enter a valid typed field definition.':'Custom field settings could not be saved.'},e instanceof RecordError?e.status:e instanceof z.ZodError?400:503));
 app.get('/history',async c=>c.json(await typedFieldHistory(db,c.req.query())));
 async function owner(actor:AuthenticatedOperator){if(!await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor.operatorId).first())throw new RecordError(403,'Only the installation owner defines custom fields.');}
 async function preview(input:Definition){
  const epoch=await db.prepare('SELECT COALESCE((SELECT epoch FROM identity_custom_field_epochs WHERE kind=?),0) AS epoch').bind(input.kind).first<number>('epoch'),revision=await policyVersion(db,input.kind),field={label:input.label,value_type:input.valueType,required:Number(input.required),options_json:JSON.stringify(input.options)},affected:{id:string;name:string;reason:string}[]=[],duplicates=new Map<string,string[]>();
  const rows=(await db.prepare(`SELECT id,${input.kind==='opportunity'?'title':input.kind==='contact'?"COALESCE(name,email,'Unnamed contact')":'name'} AS name,custom_fields_json FROM ${tables[input.kind]} ORDER BY id`).all<{id:string;name:string;custom_fields_json:string}>()).results;
  for(const row of rows){const value=JSON.parse(row.custom_fields_json)[input.fieldKey],reason=fieldReason(field,value);if(!input.archived&&reason)affected.push({id:row.id,name:row.name,reason});if(!input.archived&&input.unique&&!empty(value)){const key=JSON.stringify(value),ids=duplicates.get(key)??[];ids.push(row.id);duplicates.set(key,ids);}}
  const duplicateIds=new Set([...duplicates.values()].filter(ids=>ids.length>1).flat());for(const row of rows)if(duplicateIds.has(row.id))affected.push({id:row.id,name:row.name,reason:'value is duplicated'});
  const reviewHash=await payloadHash(JSON.stringify({input,epoch,revision}));return {input,epoch,revision,reviewHash,affected,duplicateCount:duplicateIds.size,recordCount:rows.length};
 }
 app.get('/',async c=>{const recordKind=kind.parse(c.req.query('kind')??'contact'),actor=c.get('operator');return c.json({fields:(await db.prepare('SELECT * FROM record_custom_fields WHERE kind=? ORDER BY archived,field_key').bind(recordKind).all()).results,editable:Boolean(await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor.operatorId).first())});});
 app.post('/preview',async c=>{await owner(c.get('operator'));return c.json(await preview(definition.parse(await c.req.json())));});
 app.post('/confirm',async c=>{const actor=c.get('operator');await owner(actor);const body=z.object({input:definition,reviewHash:z.string().regex(/^[a-f0-9]{64}$/),confirmed:z.literal(true)}).strict().parse(await c.req.json()),review=await preview(body.input);if(review.reviewHash!==body.reviewHash)throw new RecordError(409,'Records or field definitions changed. Preview the affected records again.');if(review.duplicateCount)throw new RecordError(409,`${body.input.label}: resolve duplicate values before requiring uniqueness.`);
  const previous=await db.prepare('SELECT * FROM record_custom_fields WHERE kind=? AND field_key=?').bind(body.input.kind,body.input.fieldKey).first<TypedField>();
  if(previous?.archived)throw new RecordError(409,`${previous.label}: archived definitions keep their meaning and cannot be replaced.`);
  if(previous&&body.input.archived&&(previous.value_type!==body.input.valueType||previous.label!==body.input.label||previous.options_json!==JSON.stringify(body.input.options)))throw new RecordError(409,`${previous.label}: archive it without changing its type, name or options.`);
  const person=await db.prepare(`SELECT ${version('o')} AS version FROM operators o WHERE id=?`).bind(actor.operatorId).first<{version:number}>();if(!person)throw new RecordError(403,'Operator access ended.');const d=body.input;
  await db.batch([guard(db,actorFence({id:actor.sessionId,operator:{id:actor.operatorId,version:person.version}},Date.now())),guard(db,ownerFence({operator:{id:actor.operatorId}})),guard(db,{sql:"COALESCE((SELECT epoch FROM identity_custom_field_epochs WHERE kind=?),0)=? AND (SELECT COALESCE(sum(revision),0)||':'||count(*) FROM record_custom_fields WHERE kind=?)=?",args:[d.kind,review.epoch,d.kind,review.revision]}),db.prepare('INSERT INTO record_custom_fields VALUES(?,?,?,?,?,?,?,?,1) ON CONFLICT(kind,field_key) DO UPDATE SET label=excluded.label,value_type=excluded.value_type,required=excluded.required,is_unique=excluded.is_unique,options_json=excluded.options_json,archived=excluded.archived,revision=record_custom_fields.revision+1').bind(d.kind,d.fieldKey,d.label,d.valueType,Number(d.required),Number(d.unique),JSON.stringify(d.options),Number(d.archived)),db.prepare("INSERT INTO record_custom_field_history SELECT kind,field_key,revision,json_object('label',label,'valueType',value_type,'required',required,'unique',is_unique,'options',json(options_json),'archived',archived),? FROM record_custom_fields WHERE kind=? AND field_key=?").bind(new Date().toISOString(),d.kind,d.fieldKey),audit(db,actor.operatorId,'custom-field.configured','installation','workspace',{kind:d.kind,field:d.fieldKey,archived:d.archived}),clearGuards(db)]);return c.json({saved:true});
 });return app;
}
