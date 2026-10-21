import type {ArchiveTable} from '../records/archive-schema';
import {reportShareArchiveTables} from '../../shared/archive-lineage';
const tables:readonly string[]=reportShareArchiveTables;
/** The generation before migration 0052, which added only the report sharing table. */
export function preReportShareCatalog(catalog:ArchiveTable[]):ArchiveTable[]{return catalog.filter(table=>!tables.includes(table.name));}
