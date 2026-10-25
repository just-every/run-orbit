import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';

/** Preserve the exact native catalog before the additive source-removal column. */
export function preSourceRemovalCatalog(catalog:ArchiveTable[]):ArchiveTable[]{
 return catalog.map(table=>{
  if(table.name!=='signal_sources')return table;
  const objects=(table as FoldArchiveTable).objects;
  return {...table,columns:table.columns.filter(column=>column.name!=='removed_at'),...(objects?{objects:objects.map(object=>object.type==='table'&&object.sql?{...object,sql:object.sql.replace(/, removed_at TEXT/i,'')}:object)}:{})};
 });
}
