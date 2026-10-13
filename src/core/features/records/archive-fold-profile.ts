import {storedLegacyLineage} from './archive-lineage';
import {archiveSchemaFence} from './archive-schema-fence';
import {foldArchiveCatalog,foldSchemaHash} from './archive-fold-catalog';
import {encodeArchiveRow} from './archive-binary';
import {reserveArchiveStorage,archiveStorageFence,observeArchiveStorage,releaseArchiveStorage} from './archive-storage-budget';
import type {ArchiveExportProfile,TransferManifest} from './archive-profile';
import {RecordError} from './shared';
export const foldExportProfile:ArchiveExportProfile={
 catalog:foldArchiveCatalog,
 async manifest(db,catalog,exportedAt){const legacyLineage=await storedLegacyLineage(db,catalog);return{...(legacyLineage?{legacyLineage}:{}),format:'orbit-export',version:3,generation:'orbit-fold-1',schemaHash:await foldSchemaHash(catalog),exportedAt,tables:catalog.map(t=>({name:t.name,columns:t.columns.map(c=>c.name),rows:0})),parts:0,rows:0};},
 reserve:reserveArchiveStorage,
 async writeFence(db,id,manifest){const catalog=await foldArchiveCatalog(db);if(manifest.version!==3||manifest.schemaHash!==await foldSchemaHash(catalog))throw new RecordError(409,'Archive schema changed during transfer.');return[...archiveSchemaFence(db,catalog),...await archiveStorageFence(db,id)];},
 observe:observeArchiveStorage,release:releaseArchiveStorage,encodeRow:encodeArchiveRow,
};
/** Continuations use the durable job discriminator, never the current route default. */
export function storedExportProfile(manifest:TransferManifest):ArchiveExportProfile|undefined{if(manifest.version===2)return undefined;if(manifest.version===3&&manifest.generation==='orbit-fold-1')return foldExportProfile;throw new RecordError(409,'Unknown stored archive generation.');}
