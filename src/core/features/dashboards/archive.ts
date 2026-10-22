import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
import {dashboardArchiveTables} from '../../shared/archive-lineage';
/** Reconstruct the exact generation before 0053, including its original snapshot triggers. */
export function preDashboardCatalog(catalog:ArchiveTable[]):ArchiveTable[]{return catalog.filter(t=>!(dashboardArchiveTables as readonly string[]).includes(t.name)).map(t=>{const table=t as FoldArchiveTable;return {...table,...(table.objects?{objects:table.objects.filter(object=>!object.name.startsWith('dashboard_withdraw_'))}:{})};});}
