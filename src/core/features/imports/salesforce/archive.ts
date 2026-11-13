import type {ArchiveTable} from '../../records/archive-schema';
import type {FoldArchiveTable} from '../../records/archive-fold-catalog';

/** Reconstruct the native catalog before Salesforce custody, retaining owner objects. */
export function preSalesforceCatalog(catalog:ArchiveTable[]):ArchiveTable[]{
 return catalog.map(table=>{
  const objects=(table as FoldArchiveTable).objects;
  if(table.name!=='contacts'||!objects)return table;
  return {...table,objects:objects.filter(object=>object.type!=='trigger'||object.name!=='crm_import_salesforce_erasure')};
 });
}
