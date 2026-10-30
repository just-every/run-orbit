import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';

/** The exact catalog before additive call-creation outcomes; owner objects stay intact. */
export function preCallFailureCatalog(catalog:ArchiveTable[]):ArchiveTable[]{
 return catalog.map(table=>{
  if(table.name!=='call_dial_attempts')return table;
  const objects=(table as FoldArchiveTable).objects;
  return {...table,columns:table.columns.filter(column=>!['creation_outcome','provider_error_code'].includes(column.name)),...(objects?{objects:objects.map(object=>object.type==='table'&&object.sql?{...object,sql:object.sql.replace(/, creation_outcome TEXT CHECK\(creation_outcome IS NULL OR creation_outcome='failed'\)/i,'').replace(/, provider_error_code INTEGER/i,'')}:object)}:{})};
 });
}
