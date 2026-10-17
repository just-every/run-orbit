import type {ArchiveTable} from './archive-schema';
import {prePipelineCatalog} from '../pipelines/archive-compatibility';
import {preTaskCatalog} from '../tasks/archive-compatibility';
/** Complete native source generations in migration order; never arbitrary missing tables. */
export function nativeCatalogGenerations(catalog:ArchiveTable[]){const pipelines=preTaskCatalog(catalog);return [catalog,pipelines,prePipelineCatalog(pipelines)];}
export const legacyNativeCatalog=(catalog:ArchiveTable[])=>nativeCatalogGenerations(catalog).at(-1)!;
