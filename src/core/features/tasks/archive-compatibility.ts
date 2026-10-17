import type {ArchiveTable} from '../records/archive-schema';
export const taskArchiveTables=['sales_task_series','sales_tasks','sales_task_timeline','sales_task_notification_links','sales_task_guards'] as const;
/** Migration 0040 adds only new tables and their own triggers. */
export function preTaskCatalog(catalog:ArchiveTable[]){return catalog.filter(table=>!(taskArchiveTables as readonly string[]).includes(table.name));}
