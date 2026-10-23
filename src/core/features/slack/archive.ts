import {preBookingCatalog} from '../ingestion/archive';
import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
import {slackArchiveTables} from '../../shared/archive-lineage';
const tables:readonly string[]=slackArchiveTables;
export function preSlackCatalog(catalog:ArchiveTable[]):ArchiveTable[]{return preBookingCatalog(catalog).filter(t=>!tables.includes(t.name)).map(t=>{const table=t as FoldArchiveTable;return{...table,...(table.objects?{objects:table.objects.filter(object=>!object.name.startsWith('slack_'))}:{})};});}
