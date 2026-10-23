import type {ArchiveTable} from '../records/archive-schema';
import {identityMatch,identityPatterns} from '../records/erasure-identity';
import {mailboxPattern} from '../imports/review-erasure';
import {formArchiveTables} from '../../shared/archive-lineage';
export {formArchiveTables};
/** Migration 0055 adds only a portable, non-authorizing rotation cursor. */
export function preFormAssignmentCatalog(catalog:ArchiveTable[]):ArchiveTable[]{return catalog.filter(table=>!(formArchiveTables as readonly string[]).includes(table.name));}
/** Redact copied mailbox text in mapped destinations even after source evidence is erased. */
export async function formMappedValueErasure(db:D1Database,emails:string[],contactId:string){
 const pattern=mailboxPattern(emails),statements:D1PreparedStatement[]=[];if(!pattern)return statements;
 // A mapped value may quote this mailbox in somebody else's submission. The
 // existing capture erasure removes that whole source and its derived proposals.
 for(const email of emails){statements.push(db.prepare(`INSERT OR IGNORE INTO record_erasure_signals SELECT ?,signal_id FROM marketing_form_submissions WHERE signal_id IS NOT NULL AND ${identityMatch('values_json')}`).bind(contactId,...identityPatterns(email)),db.prepare(`UPDATE marketing_form_submissions SET signal_id=NULL,values_json='{}',review_required=0 WHERE ${identityMatch('values_json')}`).bind(...identityPatterns(email)));}
 const sources=[{table:'contacts',columns:['job_title','custom_fields_json']},{table:'companies',columns:['name','custom_fields_json']},{table:'opportunities',columns:['title','custom_fields_json']}];
 for(const {table,columns}of sources){
  const predicate=columns.map(column=>identityMatch(column)).join(' OR '),rows=new Map<string,Record<string,any>>();
  for(const email of emails)for(const row of (await db.prepare(`SELECT id,${columns.join(',')} FROM ${table} WHERE ${predicate}`).bind(...columns.flatMap(()=>identityPatterns(email))).all<Record<string,any>>()).results)rows.set(row.id,row);
  for(const row of rows.values()){
   const values=columns.map(column=>{const value=row[column];if(value===null)return null;if(column==='custom_fields_json'){const custom=JSON.parse(value);for(const key of Object.keys(custom))if(typeof custom[key]==='string')custom[key]=custom[key].replace(pattern,'[erased]');return JSON.stringify(custom);}return String(value).replace(pattern,'[erased]');});
   statements.push(db.prepare(`UPDATE ${table} SET ${columns.map(column=>`${column}=?`).join(',')},updated_at=? WHERE id=? AND ${columns.map(column=>`${column} IS ?`).join(' AND ')}`).bind(...values,new Date().toISOString(),row.id,...columns.map(column=>row[column])));
  }
  for(const email of emails)statements.push(db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'form_mapped_erasure',NULL WHERE EXISTS(SELECT 1 FROM ${table} WHERE ${predicate})`).bind(...columns.flatMap(()=>identityPatterns(email))));
 }
 return statements;
}
