import {RecordError} from './shared';
import type {TransferManifest} from './archive-profile';
import {observeArchiveStorage} from './archive-storage-budget';

export class ArchiveImportCreationError extends RecordError {
 constructor(readonly archiveJobId:string){super(409,`Restore ${archiveJobId} was committed, but its storage observation or response could not be confirmed. Retry with the same archive, or find this unfinished restore and cancel it.`);}
}

/** A repeated create request may recover only this actor's exact durable input. */
export async function recoverableImport(db:D1Database,actor:string,manifest:TransferManifest,id?:string){
 const row=await db.prepare("SELECT j.id,j.manifest_json FROM archive_jobs j JOIN archive_job_profiles p ON p.job_id=j.id JOIN archive_storage_reservations r ON r.job_id=j.id WHERE j.kind='import' AND j.actor_id=? AND j.state IN('uploading','restoring') AND p.generation='orbit-fold-1' AND (? IS NULL OR j.id=?) ORDER BY j.created_at,j.id LIMIT 1").bind(actor,id??null,id??null).first<{id:string;manifest_json:string}>();
 return row?.manifest_json===JSON.stringify(manifest)?row.id:undefined;
}

export async function acknowledgeImport<T>(db:D1Database,id:string,status:()=>Promise<T>){
 try{await observeArchiveStorage(db,id,'after-staging');return await status();}
 catch{throw new ArchiveImportCreationError(id);}
}

export async function unfinishedImportIds(db:D1Database,actor:string){
 return(await db.prepare("SELECT j.id FROM archive_jobs j WHERE j.kind='import' AND j.actor_id=? AND (j.state IN('uploading','restoring') OR EXISTS(SELECT 1 FROM archive_storage_reservations r WHERE r.job_id=j.id)) ORDER BY j.created_at,j.id LIMIT 100").bind(actor).all<{id:string}>()).results.map(row=>row.id);
}
