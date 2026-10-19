import type {ArchiveTable} from './archive-schema';
import {prePipelineCatalog} from '../pipelines/archive-compatibility';
import {preRelationshipCatalog} from '../relationships/archive-compatibility';
import {preTaskCatalog} from '../tasks/archive-compatibility';
export const formAbuseArchiveTables=['form_abuse_refusals','form_spam'] as const;
export const preFormAbuseCatalog=(catalog:ArchiveTable[])=>catalog.filter(table=>!(formAbuseArchiveTables as readonly string[]).includes(table.name));
/** Complete native source generations in migration order; never arbitrary missing tables. */
export function nativeCatalogGenerations(catalog:ArchiveTable[]){const forms=preFormAbuseCatalog(catalog),tasks=preRelationshipCatalog(forms),pipelines=preTaskCatalog(tasks);return [catalog,forms,tasks,pipelines,prePipelineCatalog(pipelines)];}
export const legacyNativeCatalog=(catalog:ArchiveTable[])=>nativeCatalogGenerations(catalog).at(-1)!;
