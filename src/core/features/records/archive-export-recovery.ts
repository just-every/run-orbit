import {RecordError} from './shared';
export class ArchiveExportCreationError extends RecordError {
 constructor(readonly archiveJobId:string){super(409,`Export ${archiveJobId} was committed, but its storage observation could not be confirmed. Find this unfinished export to resume or discard its exact snapshot. A new export does not silently reuse it.`);}
}
export async function unfinishedExportIds(db:D1Database,actor:string){return(await db.prepare("SELECT j.id FROM archive_jobs j WHERE j.kind='export' AND j.actor_id=? AND (j.state IN('snapshotting','preparing','ready') OR EXISTS(SELECT 1 FROM archive_storage_reservations r WHERE r.job_id=j.id)) ORDER BY j.created_at,j.id LIMIT 100").bind(actor).all<{id:string}>()).results.map(row=>row.id);}

export class ArchiveExportConflictError extends RecordError {
 constructor(readonly archiveJobId:string){super(409,`Export ${archiveJobId} retains an immutable snapshot. In Records > Archive, enter this Export transfer ID and choose Resume export to download it, or Discard export before clearing the ID and preparing a current snapshot.`);}
}
