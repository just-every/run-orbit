import type {RecordProjection} from '../../shared/expansion-contracts';
import {operatorListingPredicate} from '../identity/operator-listing';

export interface SharedPresentation {
 name:string;
 currency:string;
 timezone:string;
 references:Record<string,{id:string;name:string}[]>;
 custom:Record<string,{label:string;type:string}>;
}
/** Enrich only fields already admitted by the graph projection; this grants no additional record fields. */
export async function sharedPresentation(db:D1Database,record:RecordProjection,editable:string[]):Promise<SharedPresentation>{
 const workspace=await db.prepare("SELECT name,currency,timezone FROM workspace_settings WHERE id='workspace'").first<{name:string;currency:string;timezone:string}>();
 if(!workspace)throw new Error('Workspace presentation is unavailable.');
 const references:SharedPresentation['references']={},custom:SharedPresentation['custom']={};
 if(Object.hasOwn(record.fields,'stage_id')){
  const more=editable.includes('stage_id');
  references.stage_id=(await db.prepare('SELECT s.id,s.name FROM pipeline_stages s WHERE s.id=? '+(more?'OR s.id IN(SELECT stage_id FROM pipeline_stage_rules WHERE pipeline_id=(SELECT pipeline_id FROM pipeline_stage_rules WHERE stage_id=?))':'')+' ORDER BY s.position,s.id').bind(...(more?[record.fields.stage_id,record.fields.stage_id]:[record.fields.stage_id])).all<{id:string;name:string}>()).results;
 }
 const stored=record.fields.custom_fields_json,values=typeof stored==='string'?JSON.parse(stored):stored;
 if(values&&typeof values==='object'&&!Array.isArray(values)){
  const definitions=(await db.prepare('SELECT field_key,label,value_type FROM record_custom_fields WHERE kind=?').bind(record.kind).all<{field_key:string;label:string;value_type:string}>()).results;
  for(const field of definitions)if(Object.hasOwn(values,field.field_key))custom[field.field_key]={label:field.label,type:field.value_type};
 }
 const userFields=[...['owner_id','closed_by'].filter(field=>Object.hasOwn(record.fields,field)),...Object.entries(custom).filter(([,field])=>field.type==='user').map(([key])=>'custom_fields_json.'+key)];
 for(const field of userFields){
  const value=field.startsWith('custom_fields_json.')?(values as Record<string,unknown>)[field.slice('custom_fields_json.'.length)]:record.fields[field];
  // A read-only reference resolves just its current person, including historical attribution.
  references[field]=(await db.prepare('SELECT id,display_name AS name FROM operators WHERE '+(editable.includes(field)?"(id=? OR (status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=operators.id) AND "+operatorListingPredicate('operators')+'))':'id=?')+' ORDER BY display_name,id').bind(value??null).all<{id:string;name:string}>()).results;
 }
 return {...workspace,references,custom};
}
