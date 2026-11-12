import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
export const obligationArchiveTables=['follow_up_obligations','follow_up_work'] as const;
export function preObligationCatalog(catalog:ArchiveTable[]){return catalog.filter(table=>!(obligationArchiveTables as readonly string[]).includes(table.name)).map(table=>{
 const {objects}=table as FoldArchiveTable;return {...table,...(objects?{objects:objects.filter(object=>!object.name.startsWith('follow_up_'))}:{})};
});}
