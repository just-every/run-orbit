import {archiveHash,type ArchivePart} from '../../src/core/features/records/archive-schema';
import {foldArchiveCatalog} from '../../src/core/features/records/archive-fold-catalog';
import {foldExportProfile} from '../../src/core/features/records/archive-fold-profile';
import type {TransferManifest} from '../../src/core/features/records/archive-profile';
import {readArchiveFile} from '../../src/core/shared/archive-file';

export interface FixtureTableMap {exportedAt:string;tables:Record<string,Record<string,any>[]>}
/** Encode small inspection fixtures with the current production catalog, manifest and cell codec. */
export async function currentFixtureArchive(db:D1Database,input:FixtureTableMap){
 const catalog=await foldArchiveCatalog(db),parts:ArchivePart[]=[];
 for(const table of catalog){
  const rows=input.tables[table.name];
  for(let index=0;index<rows.length;index+=100){
   const records=rows.slice(index,index+100).map((row,i)=>({table:table.name,index:index+i,row:foldExportProfile.encodeRow(row)}));
   parts.push({index:parts.length,records,sha256:await archiveHash(records)});
  }
 }
 const manifest=await foldExportProfile.manifest(db,catalog,input.exportedAt);
 manifest.tables=manifest.tables.map(table=>({...table,rows:input.tables[table.name].length}));
 manifest.parts=parts.length;manifest.rows=manifest.tables.reduce((sum,table)=>sum+table.rows,0);
 return {manifest,parts};
}
/** Read actual streamed downloads through the same complete-file validator as Records. */
export async function readCurrentArchive(response:Response){
 if(!response.body)throw new Error('Fixture archive download has no body.');
 let manifest:TransferManifest|undefined;const parts:ArchivePart[]=[];
 for await(const entry of readArchiveFile(response.body)){
  if(entry.kind==='manifest')manifest=entry.manifest as TransferManifest;
  else parts.push(entry.part);
 }
 if(!manifest)throw new Error('Fixture archive download has no manifest.');
 return {manifest,parts};
}
