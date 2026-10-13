import type {ArchiveTable} from './archive-schema';
export interface ArchiveSchemaObject {type:'view'|'trigger';name:string;sql:string}
export type SchemaObjectTable=ArchiveTable&{schemaObjects?:ArchiveSchemaObject[]};
export const schemaObjectQuery="SELECT type,name,sql FROM sqlite_master WHERE (type='view' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*') OR (type='trigger' AND tbl_name IN(SELECT name FROM sqlite_master WHERE type='view' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*')) ORDER BY type,name";
export async function archiveSchemaObjects(db:D1Database){return(await db.prepare(schemaObjectQuery).all<ArchiveSchemaObject>()).results;}
export function catalogSchemaObjects(catalog:ArchiveTable[]){return(catalog as SchemaObjectTable[]).find(table=>table.schemaObjects!==undefined)?.schemaObjects;}
export function schemaObjectFence(db:D1Database,catalog:ArchiveTable[]){const objects=catalogSchemaObjects(catalog);if(objects===undefined)return[];return[
 db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'archive_view_schema_fence',CASE WHEN (SELECT json_group_array(json_object('type',type,'name',name,'sql',sql)) FROM (${schemaObjectQuery}))=? THEN 'valid' ELSE NULL END`).bind(JSON.stringify(objects)),
 db.prepare("DELETE FROM runtime_controls WHERE name='archive_view_schema_fence'")
];}
