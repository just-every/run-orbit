import {preDashboardCatalog} from '../dashboards/archive';
import {preSlackCatalog} from '../slack/archive';
import {preReportShareCatalog} from '../analytics/archive-compatibility';
import {preForecastCatalog} from './forecast-archive-compatibility';
import {preLibraryCatalog} from './library-archive-compatibility';
import type {ArchiveTable} from './archive-schema';
import {prePipelineCatalog} from '../pipelines/archive-compatibility';
import {preRelationshipCatalog} from '../relationships/archive-compatibility';
import {preTaskCatalog} from '../tasks/archive-compatibility';
export const formAbuseArchiveTables=['form_abuse_refusals','form_spam'] as const;
export const preFormAbuseCatalog=(catalog:ArchiveTable[])=>catalog.filter(table=>!(formAbuseArchiveTables as readonly string[]).includes(table.name));
export const optOutArchiveTables=['opt_out_settings','draft_opt_out','outbound_message_opt_out'] as const;
export const preOptOutCatalog=(catalog:ArchiveTable[])=>catalog.filter(table=>!(optOutArchiveTables as readonly string[]).includes(table.name));
export const preSendingCapacityCatalog=(catalog:ArchiveTable[])=>catalog.filter(table=>table.name!=='sending_limits');
export const preOptOutCapabilityCatalog=(catalog:ArchiveTable[])=>catalog.filter(table=>table.name!=='outbound_opt_out_capabilities');
/** Complete native source generations in migration order; never arbitrary missing tables. */
export function nativeCatalogGenerations(catalog:ArchiveTable[]){const dashboards=preDashboardCatalog(catalog),shares=preReportShareCatalog(dashboards),slack=preSlackCatalog(shares),library=preLibraryCatalog(slack),capabilities=preOptOutCapabilityCatalog(library),forecast=preForecastCatalog(capabilities),optOut=preOptOutCatalog(forecast),sending=preSendingCapacityCatalog(optOut),forms=preFormAbuseCatalog(sending),tasks=preRelationshipCatalog(forms),pipelines=preTaskCatalog(tasks);return [catalog,dashboards,shares,slack,library,capabilities,forecast,optOut,sending,forms,tasks,pipelines,prePipelineCatalog(pipelines)];}
export const legacyNativeCatalog=(catalog:ArchiveTable[])=>nativeCatalogGenerations(catalog).at(-1)!;
