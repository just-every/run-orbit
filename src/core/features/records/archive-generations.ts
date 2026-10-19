import type {ArchiveTable} from './archive-schema';
import {prePipelineCatalog} from '../pipelines/archive-compatibility';
import {preRelationshipCatalog} from '../relationships/archive-compatibility';
import {preTaskCatalog} from '../tasks/archive-compatibility';
export const formAbuseArchiveTables=['form_abuse_refusals','form_spam'] as const;
export const preFormAbuseCatalog=(catalog:ArchiveTable[])=>catalog.filter(table=>!(formAbuseArchiveTables as readonly string[]).includes(table.name));
export const optOutArchiveTables=['opt_out_settings','draft_opt_out','outbound_message_opt_out'] as const;
export const preOptOutCatalog=(catalog:ArchiveTable[])=>catalog.filter(table=>!(optOutArchiveTables as readonly string[]).includes(table.name));
export const preSendingCapacityCatalog=(catalog:ArchiveTable[])=>catalog.filter(table=>table.name!=='sending_limits');
/** Complete native source generations in migration order; never arbitrary missing tables. */
export function nativeCatalogGenerations(catalog:ArchiveTable[]){const optOut=preOptOutCatalog(catalog),sending=preSendingCapacityCatalog(optOut),forms=preFormAbuseCatalog(sending),tasks=preRelationshipCatalog(forms),pipelines=preTaskCatalog(tasks);return [catalog,optOut,sending,forms,tasks,pipelines,prePipelineCatalog(pipelines)];}
export const legacyNativeCatalog=(catalog:ArchiveTable[])=>nativeCatalogGenerations(catalog).at(-1)!;
