import type {LegacyLineage} from '../../shared/archive-lineage';
import type {ArchiveTable,ArchiveManifest,ArchivePart} from './archive-schema';
export interface ArchiveV3Manifest{format:'orbit-export';version:3;generation:'orbit-fold-1';schemaHash:string;legacyLineage?:LegacyLineage;exportedAt:string;tables:ArchiveManifest['tables'];parts:number;rows:number}
export type TransferManifest=ArchiveManifest|ArchiveV3Manifest;
export interface ArchiveExportProfile{
 catalog(db:D1Database):Promise<ArchiveTable[]>;
 manifest(db:D1Database,catalog:ArchiveTable[],exportedAt:string):Promise<TransferManifest>;
 reserve(db:D1Database,id:string,kind:'export'|'import'):Promise<D1PreparedStatement[]>;
 writeFence(db:D1Database,id:string,manifest:TransferManifest):Promise<D1PreparedStatement[]>;
 observe(db:D1Database,id:string,phase:string):Promise<number>;
 release(db:D1Database,id:string):Promise<void>;
 encodeRow(row:Record<string,unknown>):ArchivePart['records'][number]['row'];
}
