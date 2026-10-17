import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
export const relationshipArchiveTables=['opportunity_stakeholder_roles','opportunity_buying_context','buying_context_contacts','contact_company_relationships'] as const;
const contactTriggers=new Set(['relationship_primary_company','relationship_contact_context_erasure']);
/** Reconstruct the exact installed schema before migration 0041. */
export function preRelationshipCatalog(catalog:ArchiveTable[]):ArchiveTable[]{return catalog.filter(table=>!(relationshipArchiveTables as readonly string[]).includes(table.name)).map(table=>table.name==='contacts'?{...table,objects:(table as FoldArchiveTable).objects?.filter(object=>!contactTriggers.has(object.name))}:table);}
