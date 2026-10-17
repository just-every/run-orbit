import {archiveContentIdentity} from '../../shared/archive-identity';
import type {TransferManifest} from './archive-profile';
import {RecordError} from './shared';

export async function storedArchiveContentDigest(db:D1Database,id:string){
 const identity=await db.prepare('SELECT digest FROM archive_file_identities WHERE job_id=?').bind(id).first<{digest:string}>();
 return identity?.digest;
}

/** Uploaded parts are immutable and their record hashes were checked on upload.
 * Bind the full durable inventory to the selected file before any restore write.
 * Jobs created before content identities keep their original per-part checks.
 */
export async function verifyArchiveContentIdentity(db:D1Database,id:string,manifest:TransferManifest){
 const digest=await storedArchiveContentDigest(db,id);if(!digest)return;
 const parts=(await db.prepare('SELECT part_index AS "index",sha256 FROM archive_parts WHERE job_id=? ORDER BY part_index').bind(id).all<{index:number;sha256:string}>()).results;
 if(parts.length!==manifest.parts)throw new RecordError(409,'The archive is incomplete. Upload every part before restoring.');
 if(await archiveContentIdentity(manifest,parts)!==digest)throw new RecordError(409,'The uploaded archive does not match the selected file. Cancel this restore and select the original archive again. Restore has not started.');
}
