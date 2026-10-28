import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
/** Exact field-definition schema before typed workflow values were introduced. */
export function preTypedWorkflowCatalog(catalog:ArchiveTable[]):ArchiveTable[]{return catalog.map(table=>{
 if(table.name!=='record_custom_fields')return table;
 const objects=(table as FoldArchiveTable).objects;if(!objects)return table;
 return {...table,objects:objects.map(object=>object.type==='table'&&object.sql?{...object,sql:object.sql.replace('CREATE TABLE "record_custom_fields"','CREATE TABLE record_custom_fields').replace(",'boolean','user','datetime'",'')}:object)};
});}
