import {forecastArchiveTables} from '../../shared/archive-lineage';
import type {ArchiveTable} from './archive-schema';
import type {FoldArchiveTable} from './archive-fold-catalog';

const clockTriggers=new Set(['opportunities','opportunity_contacts','pipeline_stages','pipeline_stage_rules','operators','workspace_settings','forecast_revisions'].flatMap(table=>['insert','update','delete'].map(action=>`forecast_clock_${table}_${action}`)));

/** Reconstruct migration 0047 exactly, retaining its views and original triggers. */
export function preForecastCatalog(catalog:ArchiveTable[]):ArchiveTable[]{
 return catalog.filter(table=>!(forecastArchiveTables as readonly string[]).includes(table.name)).map(table=>{
  const objects=(table as FoldArchiveTable).objects;
  return objects?{...table,objects:objects.filter(object=>!clockTriggers.has(object.name))}:table;
 });
}
