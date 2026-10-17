import type {ArchiveTable} from '../records/archive-schema';
import type {FoldArchiveTable} from '../records/archive-fold-catalog';
import {ownershipPredecessorObjects} from './predecessor-schema';
export const ownershipLocalTables=['record_owner_reviews','record_owner_batches','record_owner_batch_items'] as const;
/** Reconstruct only migration 0042's exact predecessor, including every original SQL object. */
export function preOwnershipCatalog(catalog:ArchiveTable[]):ArchiveTable[]{
 const previous=catalog.filter(table=>table.name!=='record_owner_notification_links'&&!(ownershipLocalTables as readonly string[]).includes(table.name)).map(table=>{
  const native=['contacts','companies','opportunities'].includes(table.name),oldColumns=new Set(native?['owner_revision',...table.name!=='opportunities'?['owner_id']:[]]:[]);
  return {...table,columns:table.columns.filter(column=>!oldColumns.has(column.name)),dependencies:['contacts','companies'].includes(table.name)?table.dependencies.filter(name=>name!=='operators'):table.dependencies,objects:(table as FoldArchiveTable).objects?.filter(object=>!object.name.startsWith('record_owner_')&&!['contacts_owner_id','companies_owner_id'].includes(object.name)).map(object=>ownershipPredecessorObjects.find(old=>old.type===object.type&&old.name===object.name)??object)};
 }).sort((a,b)=>a.name.localeCompare(b.name));
 const ordered:ArchiveTable[]=[];while(ordered.length<previous.length){const ready=previous.filter(table=>!ordered.includes(table)&&table.dependencies.every(name=>ordered.some(done=>done.name===name)));if(!ready.length)throw new Error('Ownership predecessor dependencies are cyclic.');ordered.push(...ready);}return ordered;
}
