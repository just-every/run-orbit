import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
import {ownershipPredecessorObjects,opportunityOwnershipPredecessorObjects} from './predecessor-schema';
export const ownershipLocalTables=['record_owner_reviews','record_owner_batches','record_owner_batch_items'] as const;
/** Reconstruct only migration 0042's exact predecessor, including every original SQL object. */
export function preOwnershipCatalog(catalog:ArchiveTable[]):ArchiveTable[]{
 const previous=catalog.filter(table=>!['record_owners','record_owner_notification_links',...ownershipLocalTables].includes(table.name)).map(table=>({
  ...table,
  objects:(table as FoldArchiveTable).objects?.filter(object=>!object.name.startsWith('record_owner_')).map(object=>object.type==='trigger'?([...ownershipPredecessorObjects,...opportunityOwnershipPredecessorObjects].find(old=>old.type===object.type&&old.name===object.name)??object):object),
 })).sort((a,b)=>a.name.localeCompare(b.name));
 const ordered:ArchiveTable[]=[];while(ordered.length<previous.length){const ready=previous.filter(table=>!ordered.includes(table)&&table.dependencies.every(name=>ordered.some(done=>done.name===name)));if(!ready.length)throw new Error('Ownership predecessor dependencies are cyclic.');ordered.push(...ready);}return ordered;
}
