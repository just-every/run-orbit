import {callingArchiveTables,calendarWritebackArchiveTables,typedFieldArchiveTables} from '../../shared/archive-lineage';
import type {FoldArchiveTable} from './archive-fold-catalog';
import {preCaptureMailRuleCatalog} from '../capture/archive';
import {preRecordMailCatalog} from '../outreach/record-mail-archive';
import {preFormAssignmentCatalog} from '../forms/archive';
import {preOwnershipCatalog} from '../ownership/archive';
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
/** Reconstruct only exact native additions; owner tables and objects remain bound. */
function beforeSlice(catalog:ArchiveTable[],tables:readonly string[],triggers:readonly string[]=[]){return catalog.filter(table=>!tables.includes(table.name)).map(table=>{const objects=(table as FoldArchiveTable).objects;return objects?{...table,objects:objects.filter(object=>!triggers.includes(object.name))}:table;});}
const typedTriggers=['contacts','companies','deals'].flatMap(table=>['insert','update','delete'].map(operation=>`custom_field_${table}_${operation}`));
const privacyTriggers=['entry_privacy_timeline_delete','entry_privacy_task_delete','entry_privacy_handoff_delete'];
/** Complete native source generations in migration order; never arbitrary missing tables. */
export function nativeCatalogGenerations(catalog:ArchiveTable[]){const typed=beforeSlice(catalog,typedFieldArchiveTables,typedTriggers),privacy=beforeSlice(typed,['entry_privacy'],privacyTriggers),calendar=beforeSlice(privacy,calendarWritebackArchiveTables),erasure=beforeSlice(calendar,['call_erased_numbers']),calls=beforeSlice(erasure,callingArchiveTables),mailRule=preCaptureMailRuleCatalog(calls),recordMail=preRecordMailCatalog(mailRule),formAssignment=preFormAssignmentCatalog(recordMail),ownership=preOwnershipCatalog(formAssignment),dashboards=preDashboardCatalog(ownership),shares=preReportShareCatalog(dashboards),slack=preSlackCatalog(shares),library=preLibraryCatalog(slack),capabilities=preOptOutCapabilityCatalog(library),forecast=preForecastCatalog(capabilities),optOut=preOptOutCatalog(forecast),sending=preSendingCapacityCatalog(optOut),forms=preFormAbuseCatalog(sending),tasks=preRelationshipCatalog(forms),pipelines=preTaskCatalog(tasks);return [catalog,typed,privacy,calendar,erasure,calls,mailRule,recordMail,formAssignment,ownership,dashboards,shares,slack,library,capabilities,forecast,optOut,sending,forms,tasks,pipelines,prePipelineCatalog(pipelines)];}
export const legacyNativeCatalog=(catalog:ArchiveTable[])=>nativeCatalogGenerations(catalog).at(-1)!;
