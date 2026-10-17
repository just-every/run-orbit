import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
export const pipelineArchiveTables=['pipelines','pipeline_stage_rules'] as const;
const stageTriggers=new Set(['pipeline_stage_default','pipeline_stage_occupied']);
/** The exact installed generation before migration 0039, including its trigger hash. */
export function prePipelineCatalog(catalog:ArchiveTable[]):ArchiveTable[]{return catalog.filter(table=>!(pipelineArchiveTables as readonly string[]).includes(table.name)).map(table=>table.name==='pipeline_stages'?{...table,objects:(table as FoldArchiveTable).objects?.filter(object=>!stageTriggers.has(object.name))}:table);}
