import type {ArchiveTable} from './archive-schema';
export interface ArchiveSchemaObject {type:'view'|'trigger';name:string;sql:string}
export type SchemaObjectTable=ArchiveTable&{schemaObjects?:ArchiveSchemaObject[]};
export const schemaObjectQuery="SELECT type,name,sql FROM sqlite_master WHERE (type='view' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name<>'rer_owner_signin_operators') OR (type='trigger' AND tbl_name IN(SELECT name FROM sqlite_master WHERE type='view' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name<>'rer_owner_signin_operators')) ORDER BY type,name";
export async function archiveSchemaObjects(db:D1Database){return(await db.prepare(schemaObjectQuery).all<ArchiveSchemaObject>()).results;}
export function catalogSchemaObjects(catalog:ArchiveTable[]){return(catalog as SchemaObjectTable[]).find(table=>table.schemaObjects!==undefined)?.schemaObjects;}
/** The view and view-trigger part of the schema fence, as one condition; null when the catalog predates schema objects. */
export function schemaObjectCondition(catalog:ArchiveTable[]):{sql:string;bindings:string[]}|null{const objects=catalogSchemaObjects(catalog);if(objects===undefined)return null;return{sql:`(SELECT json_group_array(json_object('type',type,'name',name,'sql',sql)) FROM (${schemaObjectQuery}))=?`,bindings:[JSON.stringify(objects)]};}
