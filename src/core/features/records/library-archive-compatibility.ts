import type {ArchivePart,ArchiveTable} from './archive-schema';
import type {FoldArchiveTable} from './archive-fold-catalog';

const addedColumns:Record<string,readonly string[]>={drafts:['library_selection_json','merge_review_json'],outbound_messages:['render_snapshot_json']};
const addedDefinitions=[/, library_selection_json TEXT NOT NULL DEFAULT '\{\}'/i,/, merge_review_json TEXT/i,/, render_snapshot_json TEXT/i];

/** Reconstruct migration 0049, including the exact DDL before SQLite appended columns. */
export function preLibraryCatalog(catalog:ArchiveTable[]):ArchiveTable[]{
 return catalog.filter(table=>table.name!=='message_library').map(table=>{
  const columns=addedColumns[table.name];if(!columns)return table;
  const objects=(table as FoldArchiveTable).objects;
  return{...table,columns:table.columns.filter(column=>!columns.includes(column.name)),...(objects?{objects:objects.map(object=>object.type==='table'&&object.sql?{...object,sql:addedDefinitions.reduce((sql,definition)=>sql.replace(definition,''),object.sql)}:object)}:{})};
 });
}

/** Apply only the additive migration defaults after the source row has passed validation. */
export function upgradeLibraryArchiveRecord(record:ArchivePart['records'][number]){
 if(record.table==='drafts')return{...record,row:{library_selection_json:'{}',merge_review_json:null,...record.row}};
 if(record.table==='outbound_messages')return{...record,row:{render_snapshot_json:null,...record.row}};
 return record;
}
