import type {D1Sql} from '../../../modules/import-kit/d1/index';
import {mailboxPattern,containsMailbox} from './review-erasure';
import {sql} from './targets';

/** Decode the two JSON string representations owned by the native importer.
 * Leave unrelated values intact; a mailbox-bearing key attributes that whole
 * field to the erased identity, so remove it without colliding with another key. */
function redact(value:any,emails:string[],field?:string):any{
 if(typeof value==='string'){
  if(field==='custom_fields_json'||field==='import_source'){
   let original:any;
   // The native custom-field document is JSON; owners may replace the
   // import_source custom-field value with ordinary text through Records.
   if(field==='custom_fields_json')original=JSON.parse(value);
   else {try{original=JSON.parse(value);}catch{return value.replace(mailboxPattern(emails)!, '[erased]');}}
   const next=redact(original,emails);
   return JSON.stringify(original)===JSON.stringify(next)?value:JSON.stringify(next);
  }
  return value.replace(mailboxPattern(emails)!, '[erased]');
 }
 if(Array.isArray(value))return value.map(item=>redact(item,emails));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!containsMailbox(key,emails)).map(([key,item])=>[key,redact(item,emails,key)]));
 return value;
}

/** Native projections and Orbit's own target snapshots join the final contact
 * erasure transaction. Complete ordered snapshots fence concurrent edits and
 * newly imported rows. Kit custody is deliberately left to its public API. */
export async function redactImportedNativeCopies(db:D1Database,contactId:string,emails:string[]):Promise<D1Sql[]>{
 if(!mailboxPattern(emails))return [];
 const statements:D1Sql[]=[];
 const definitions=[
  {kind:'company',table:'companies',fields:['name','custom_fields_json']},
  {kind:'contact',table:'contacts',fields:['name','phone','job_title','custom_fields_json']},
  {kind:'deal',table:'opportunities',fields:['title','custom_fields_json']},
 ];
 for(const {kind,table,fields} of definitions){
  const columns=['id',...fields],excluded=kind==='contact'?contactId:null;
  const query=`SELECT ${columns.join(',')} FROM ${table} WHERE (? IS NULL OR id<>?) AND (id IN(SELECT id FROM crm_import_targets WHERE kind=?) OR json_type(custom_fields_json,'$.import_source') IS NOT NULL) ORDER BY id`;
  const rows=(await db.prepare(query).bind(excluded,excluded,kind).all<Record<string,any>>()).results;
  const changes=rows.map(row=>redact(row,emails)).filter((row,index)=>JSON.stringify(row)!==JSON.stringify(rows[index]));
  statements.push(sql(`INSERT INTO runtime_controls(name,value) SELECT 'crm_native_erasure_fence',NULL WHERE (SELECT json_group_array(json_array(${columns.join(',')})) FROM (${query}))<>?`,excluded,excluded,kind,JSON.stringify(rows.map(row=>columns.map(column=>row[column])))));
  if(changes.length)statements.push(sql(`UPDATE ${table} SET ${fields.map(field=>`${field}=json_extract(change.value,'$.${field}')`).join(',')} FROM json_each(?) change WHERE ${table}.id=json_extract(change.value,'$.id')`,JSON.stringify(changes)));
 }
 const query="SELECT kind,id,original_json FROM crm_import_targets WHERE kind IN('company','contact','deal') AND NOT(kind='contact' AND id=?) ORDER BY kind,id";
 const markers=(await db.prepare(query).bind(contactId).all<{kind:string;id:string;original_json:string}>()).results;
 const changes=markers.flatMap(marker=>{const before=JSON.parse(marker.original_json),after=redact(before,emails);return JSON.stringify(before)===JSON.stringify(after)?[]:[{...marker,original_json:JSON.stringify(after)}];});
 statements.push(sql(`INSERT INTO runtime_controls(name,value) SELECT 'crm_target_erasure_fence',NULL WHERE (SELECT json_group_array(json_array(kind,id,original_json)) FROM (${query}))<>?`,contactId,JSON.stringify(markers.map(marker=>[marker.kind,marker.id,marker.original_json]))));
 if(changes.length)statements.push(sql("UPDATE crm_import_targets SET original_json=json_extract(change.value,'$.original_json') FROM json_each(?) change WHERE crm_import_targets.kind=json_extract(change.value,'$.kind') AND crm_import_targets.id=json_extract(change.value,'$.id')",JSON.stringify(changes)));
 return statements;
}
