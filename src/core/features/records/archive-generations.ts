import {preOwnershipCatalog} from '../ownership/archive-compatibility';
import type {ArchiveTable} from './archive-schema';
import {prePipelineCatalog} from '../pipelines/archive-compatibility';
import {preRelationshipCatalog} from '../relationships/archive-compatibility';
import {preTaskCatalog} from '../tasks/archive-compatibility';
/** Complete native source generations in migration order; never arbitrary missing tables. */
export function nativeCatalogGenerations(catalog:ArchiveTable[]){const relationships=preOwnershipCatalog(catalog),tasks=preRelationshipCatalog(relationships),pipelines=preTaskCatalog(tasks);return [catalog,relationships,tasks,pipelines,prePipelineCatalog(pipelines)];}
export const legacyNativeCatalog=(catalog:ArchiveTable[])=>nativeCatalogGenerations(catalog).at(-1)!;
