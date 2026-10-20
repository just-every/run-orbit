import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
const tables=['slack_installation','slack_channels','slack_mappings','slack_notices','slack_actions'];
export function preSlackCatalog(catalog:ArchiveTable[]):ArchiveTable[]{return catalog.filter(t=>!tables.includes(t.name)).map(t=>{const table=t as FoldArchiveTable;return{...table,...(table.objects?{objects:table.objects.filter(object=>!object.name.startsWith('slack_'))}:{})};});}
