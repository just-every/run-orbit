import type {D1Sql} from '../../../modules/import-kit/d1/index';
import {mailboxPattern,containsMailbox} from './review-erasure';
import {sql} from './targets';

/** Decode JSON string representations owned by the native importer.
 * Leave unrelated values intact; a mailbox-bearing key attributes that whole
 * field to the erased identity, so remove it without colliding with another key. */
function redact(value:any,emails:string[],field?:string):any{
 if(!mailboxPattern(emails))return value;
 if(typeof value==='string'){
  if(field==='custom_fields_json'||field==='import_source'||field==='payload_json'){
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
export async function redactImportedNativeCopies(db:D1Database,contactId:string,emails:string[],taskIds:Set<string>=new Set()):Promise<D1Sql[]>{
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
 const query="SELECT kind,id,original_json FROM crm_import_targets WHERE NOT(kind='contact' AND id=?) ORDER BY kind,id";
 const markers=(await db.prepare(query).bind(contactId).all<{kind:string;id:string;original_json:string}>()).results;
 // Attribute the whole imported task snapshot through its original task or
 // timeline associations, even after native edits or conflict-preserving undo.
 const deals=new Set((await db.prepare('SELECT opportunity_id FROM opportunity_contacts WHERE contact_id=?').bind(contactId).all<{opportunity_id:string}>()).results.map(row=>row.opportunity_id));
 const seriesIds=new Set<string>();
 for(const marker of markers){const value=JSON.parse(marker.original_json);if(marker.kind==='task'&&(value.row.contact_id===contactId||deals.has(value.row.opportunity_id)||JSON.stringify(value)!==JSON.stringify(redact(value,emails))))taskIds.add(marker.id);
  if(marker.kind==='note'&&value.taskId&&(value.links.some((link:any)=>link.record_type==='contact'&&link.record_id===contactId)||JSON.stringify(value)!==JSON.stringify(redact(value,emails))))taskIds.add(value.taskId);
 }
 for(const marker of markers)if(marker.kind==='task'&&taskIds.has(marker.id))seriesIds.add(JSON.parse(marker.original_json).row.series_id);
 const removed=markers.filter(marker=>{const value=JSON.parse(marker.original_json);return marker.kind==='task'&&taskIds.has(marker.id)||marker.kind==='task-series'&&seriesIds.has(marker.id)||marker.kind==='note'&&taskIds.has(value.taskId);});
 const removedKeys=new Set(removed.map(marker=>`${marker.kind}:${marker.id}`));
 const changes=markers.flatMap(marker=>{if(removedKeys.has(`${marker.kind}:${marker.id}`))return [];const before=JSON.parse(marker.original_json),after=redact(before,emails);return JSON.stringify(before)===JSON.stringify(after)?[]:[{...marker,original_json:JSON.stringify(after)}];});
 statements.push(sql(`INSERT INTO runtime_controls(name,value) SELECT 'crm_target_erasure_fence',NULL WHERE (SELECT json_group_array(json_array(kind,id,original_json)) FROM (${query}))<>?`,contactId,JSON.stringify(markers.map(marker=>[marker.kind,marker.id,marker.original_json]))));
 if(changes.length)statements.push(sql("UPDATE crm_import_targets SET original_json=json_extract(change.value,'$.original_json') FROM json_each(?) change WHERE crm_import_targets.kind=json_extract(change.value,'$.kind') AND crm_import_targets.id=json_extract(change.value,'$.id')",JSON.stringify(changes)));
 if(removed.length)statements.push(sql("DELETE FROM crm_import_targets WHERE EXISTS(SELECT 1 FROM json_each(?) erased WHERE crm_import_targets.kind=json_extract(erased.value,'$.kind') AND crm_import_targets.id=json_extract(erased.value,'$.id'))",JSON.stringify(removed.map(({kind,id})=>({kind,id})))));
 return statements;
}
