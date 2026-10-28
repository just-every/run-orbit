import {ownerRead,ownerMatches,ownerWrite,ownerRemove} from './targets-owner';
import {suppressionPredicate} from '../records/suppression';
import { canonicalJson,sha256,type D1TargetAdapter,type D1Sql,type TargetRow,type D1Database } from '../../../modules/import-kit/d1/index';
import { stopRead,stopWrite,stopRemove,stopMatches } from './targets-stop';
export const sql=(sql:string,...params:any[]):D1Sql=>({sql,params});
export const tables:Record<string,string>={company:'companies',contact:'contacts',deal:'opportunities',note:'timeline_entries',reference:'crm_import_references'};
export type NativeValue={row:Record<string,any>;links:Record<string,any>[];suppressionTokens?:string[]};
export const targets:D1TargetAdapter={
 async read(db,destination,kind,id){
  if(kind==='owner')return ownerRead(db,destination,id);
  if(kind==='suppression')return stopRead(db,destination,id);
  const table=tables[kind];if(!table)throw new Error('Unsupported import target.');
  const row=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first();if(!row)return undefined;
  const links=kind==='deal'?(await db.prepare('SELECT * FROM opportunity_contacts WHERE opportunity_id=? ORDER BY contact_id').bind(id).all()).results:kind==='note'?(await db.prepare('SELECT * FROM timeline_entry_records WHERE timeline_entry_id=? ORDER BY record_type,record_id').bind(id).all()).results:[];
  const marker=await db.prepare('SELECT revision,original_json FROM crm_import_targets WHERE kind=? AND id=?').bind(kind,id).first();
  return {destination,targetKind:kind,targetId:id,value:{row,links,...marker&&JSON.parse(marker.original_json).suppressionTokens?{suppressionTokens:JSON.parse(marker.original_json).suppressionTokens}:{}},revision:marker?.revision??sha256(canonicalJson({row,links}))};
 },
 matches(row,destination,kind,id){
  if(kind==='owner')return ownerMatches(row,id);
  if(kind==='suppression')return stopMatches(row,id);
  const table=tables[kind];if(!table)throw new Error('Unsupported target.');
  if(!row)return sql(`NOT EXISTS(SELECT 1 FROM ${table} WHERE id=?)`,id);
  const value=row.value as NativeValue,fields=Object.keys(value.row);
  const links=kind==='deal'?'opportunity_contacts':kind==='note'?'timeline_entry_records':null,foreign=kind==='deal'?'opportunity_id':'timeline_entry_id';
  const predicates=[`EXISTS(SELECT 1 FROM ${table} actual CROSS JOIN (SELECT ? AS row_json) expected WHERE ${fields.map(k=>`actual."${k}" IS json_extract(expected.row_json,'$.${k}')`).join(' AND ')})`];const args:any[]=[canonicalJson(value.row)];
  predicates.push('(SELECT revision FROM crm_import_targets WHERE kind=? AND id=?) IS ?');args.push(kind,id,row.revision===sha256(canonicalJson(value))?null:row.revision);
  if(links){predicates.push(`(SELECT count(*) FROM ${links} WHERE ${foreign}=?)=?`);args.push(id,value.links.length);if(value.links.length){const columns=Object.keys(value.links[0]);predicates.push(`NOT EXISTS(SELECT 1 FROM json_each(?) expected WHERE NOT EXISTS(SELECT 1 FROM ${links} actual WHERE ${columns.map(key=>`actual.${key} IS json_extract(expected.value,'$.${key}')`).join(' AND ')}))`);args.push(canonicalJson(value.links));}}
  return sql(predicates.join(' AND '),...args);
 },
 write(target){
  if(target.targetKind==='owner')return ownerWrite(target);
  if(target.targetKind==='suppression')return stopWrite(target);
  const {row,links,suppressionTokens}=target.value as NativeValue,table=tables[target.targetKind];if(!table)throw new Error('Unsupported target.');
  const fields=Object.keys(row);if(fields.some(f=>!/^[_a-z][_a-z0-9]*$/.test(f)))throw new Error('Invalid native field.');
  const statements=[sql(`INSERT INTO ${table}(${fields.join(',')}) VALUES(${fields.map(field=>field==='contactability'?`CASE WHEN ${suppressionPredicate(suppressionTokens??[])} THEN 'do_not_contact' ELSE ? END`:'?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${fields.filter(k=>k!=='id').map(k=>`${k}=excluded.${k}`).join(',')}`,...fields.map(k=>row[k]))];
  if(target.targetKind==='contact'&&suppressionTokens?.length){const contexts=[...new Set(suppressionTokens.map(token=>token.slice(0,32)))];statements.unshift(sql("INSERT INTO runtime_controls(name,value) SELECT 'crm_privacy_fence',NULL WHERE EXISTS(SELECT 1 FROM privacy_matching_contexts WHERE context_id NOT IN(SELECT value FROM json_each(?)))",JSON.stringify(contexts)));}
  if(target.targetKind==='deal'){statements.push(sql('DELETE FROM opportunity_contacts WHERE opportunity_id=?',target.targetId));statements.push(sql("INSERT INTO opportunity_contacts(opportunity_id,contact_id,is_primary,created_at) SELECT json_extract(value,'$.opportunity_id'),json_extract(value,'$.contact_id'),json_extract(value,'$.is_primary'),json_extract(value,'$.created_at') FROM json_each(?)",canonicalJson(links)));}
  if(target.targetKind==='note'){statements.push(sql('DELETE FROM timeline_entry_records WHERE timeline_entry_id=?',target.targetId));statements.push(sql("INSERT INTO timeline_entry_records SELECT json_extract(value,'$.timeline_entry_id'),json_extract(value,'$.record_type'),json_extract(value,'$.record_id') FROM json_each(?)",canonicalJson(links)));}
  statements.push(sql('INSERT INTO crm_import_targets(kind,id,revision,original_json) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET revision=excluded.revision,original_json=excluded.original_json',target.targetKind,target.targetId,target.revision,canonicalJson(target.value)));
  return statements;
 },
 remove(_destination,kind,id){if(kind==='owner')return ownerRemove(id);if(kind==='suppression')return stopRemove(id);return[sql(`DELETE FROM ${tables[kind]} WHERE id=?`,id),sql('DELETE FROM crm_import_targets WHERE kind=? AND id=?',kind,id)];},
 async list(db,destination){const list:TargetRow[]=[];for(const kind of Object.keys(tables)){const rows=await db.prepare(`SELECT id FROM ${tables[kind]}`).all();for(const row of rows.results)list.push((await this.read(db,destination,kind,row.id))!);}for(const row of (await db.prepare("SELECT record_type||':'||record_id AS id FROM record_ownership").all()).results)list.push((await ownerRead(db,destination,row.id))!);for(const row of (await db.prepare('SELECT id FROM crm_import_stops').all()).results)list.push((await this.read(db,destination,'suppression',row.id))!);return list;},
 matchesCount(count){return sql(`(${Object.values(tables).map(table=>`(SELECT count(*) FROM ${table})`).join('+')}+(SELECT count(*) FROM crm_import_stops)+(SELECT count(*) FROM record_ownership))=?`,count);},
};
