import {schemaObjectCondition} from './archive-schema-objects';
import type {ArchiveTable} from './archive-schema';
import {foldExcludedTables,foldAuthorityTables,type FoldArchiveTable} from './archive-fold-catalog';
/** Validate live ordered table metadata in the same transaction as every transfer write.
 * Every check is one condition of a single guarded write: a transfer batch carries this fence twice,
 * and each separate guard write (with its triggers) costs a statement on D1. */
export function archiveSchemaFence(db:D1Database,catalog:ArchiveTable[]){
 const authority=catalog.some(table=>(foldAuthorityTables as readonly string[]).includes(table.name)),excluded=[...foldExcludedTables].filter(name=>!authority||!(foldAuthorityTables as readonly string[]).includes(name));
 const conditions:{sql:string;bindings:string[]}[]=[];const objects=schemaObjectCondition(catalog);if(objects)conditions.push(objects);
 conditions.push({sql:`(SELECT json_group_array(name) FROM (SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN(SELECT value FROM json_each(?)) AND name NOT GLOB 'ik_*' AND name NOT GLOB 'crm_import_*' AND name NOT GLOB 'delegation_*' AND name NOT GLOB 'identity_*' AND name NOT GLOB 'oa_*' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name NOT GLOB 'record_search*' AND name NOT GLOB 'timeline_search*' AND name NOT GLOB 'archive_*' AND name NOT GLOB 'rer_*' ORDER BY name))=?`,bindings:[JSON.stringify(excluded),JSON.stringify(catalog.map(t=>t.name).sort())]});
 // Ten tables per condition keeps each bound description small.
 for(let offset=0;offset<catalog.length;offset+=10){const tables=catalog.slice(offset,offset+10).map(table=>({name:table.name,objects:(table as FoldArchiveTable).objects,columns:table.columns.map(c=>({name:c.name,type:c.type,notnull:c.notnull,pk:c.pk,default:c.dflt_value}))}));
  // Parse the expected schema once before scanning sqlite_master or column metadata.
  // Re-evaluating JSON paths inside those correlated scans reparses trigger SQL
  // for every schema row, multiplying the cost as native features add triggers.
  conditions.push({sql:`NOT EXISTS(WITH expected AS MATERIALIZED (SELECT json_extract(value,'$.name') AS name,json_extract(value,'$.objects') AS objects,json_type(value,'$.objects') AS object_type,json_extract(value,'$.columns') AS columns FROM json_each(?)) SELECT 1 FROM expected t WHERE NOT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name=t.name) OR (t.object_type IS NOT NULL AND (SELECT json_group_array(json_object('type',type,'name',name,'sql',sql)) FROM (SELECT type,name,sql FROM sqlite_master WHERE tbl_name=t.name ORDER BY type,name)) IS NOT t.objects) OR (SELECT count(*) FROM pragma_table_xinfo(t.name) WHERE hidden<>1)>100 OR (SELECT json_group_array(json_object('name',name,'type',type,'notnull',"notnull",'pk',pk,'default',dflt_value)) FROM (SELECT name,type,"notnull",pk,dflt_value FROM pragma_table_info(t.name) WHERE NOT(t.name='signal_sources' AND name='secret_ciphertext') ORDER BY cid)) IS NOT t.columns)`,bindings:[JSON.stringify(tables)]});}
 return[db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'archive_schema_fence',CASE WHEN ${conditions.map(c=>`(${c.sql})`).join(' AND ')} THEN 'valid' ELSE NULL END`).bind(...conditions.flatMap(c=>c.bindings)),db.prepare("DELETE FROM runtime_controls WHERE name='archive_schema_fence'")];
}
