import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
import {ownershipArchiveTables} from '../../shared/archive-lineage';
/** Exact accepted-main catalog before 0054, including native table triggers. */
export function preOwnershipCatalog(catalog:ArchiveTable[]):ArchiveTable[]{
 return catalog.filter(table=>!(ownershipArchiveTables as readonly string[]).includes(table.name)).map(table=>{
  const objects=(table as FoldArchiveTable).objects;
  return objects?{...table,objects:objects.filter(object=>!['ownership_erase_contact','ownership_erase_company'].includes(object.name))}:table;
 });
}
