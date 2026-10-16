import type {ActorContext,RecordProjection} from '../../shared/expansion-contracts';
import {AccessService} from './service';
import {AccessError} from './errors';
import {nativeEditableFields} from './native-boundary';
/** Custom fields a collaborator may type into: flat values, never the importer's own provenance record. */
export function editableCustomFields(stored:unknown):string[]{
 let fields:unknown=stored;if(typeof fields==='string'){try{fields=JSON.parse(fields);}catch{return[];}}
 if(!fields||typeof fields!=='object'||Array.isArray(fields))return[];
 return Object.entries(fields).filter(([name,value])=>name!=='import_source'&&(value===null||['string','number','boolean'].includes(typeof value))).map(([name])=>name);
}
/** Current UI hints use the same field authority as the independently fenced PUT.
 * A custom field is reported as `custom_fields_json.<name>`, the path the PUT authorizes. */
export async function recordEditableFields(access:AccessService,actor:ActorContext,kind:keyof typeof nativeEditableFields,record:RecordProjection){
 const candidates=nativeEditableFields[kind].flatMap(field=>field==='custom_fields'?('custom_fields_json' in record.fields?editableCustomFields(record.fields.custom_fields_json).map(name=>`custom_fields_json.${name}`):[]):field in record.fields?[field]:[]);
 const fields:string[]=[];for(const field of candidates){try{await access.authorize(actor,'graph.update',record.ref,[field]);fields.push(field);}catch(error){if(!(error instanceof AccessError)||error.code!=='permission')throw error;}}
 await access.db.batch(access.fence(actor).map(statement=>access.db.prepare(statement.sql).bind(...statement.bindings)));return fields;
}
