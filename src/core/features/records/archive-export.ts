import {reconcileLegacyOwnership} from '../ownership/legacy';
import {ArchiveExportCreationError,unfinishedExportIds} from './archive-export-recovery';
import type {ArchiveExportProfile,TransferManifest} from './archive-profile';
import {storedExportProfile} from './archive-fold-profile';
import { quoteIdentifier } from './archive-stage-layout';
import {createId} from '../../shared/ids';
import {RecordError} from './shared';
import {archiveCatalog,archiveHash,ARCHIVE_PART_BYTES,ARCHIVE_PART_ROWS,type ArchiveManifest,type ArchivePart} from './archive-schema';
import {partStatements,stageName} from './archive-storage';
const snapshotName=(id:string,table:string)=>stageName(id,table).replace('archive_stage_','archive_snapshot_');
type Progress={table:number;cursor:number;part:number;snapshotLayout?:'aliased-v1'};
function snapshotColumns(columns:readonly string[],progress:Progress){
 if(progress.snapshotLayout===undefined)return columns.map(quoteIdentifier);
 if(progress.snapshotLayout==='aliased-v1')return columns.map((_,index)=>`c_${index}`);
 throw new RecordError(409,'The stored archive snapshot layout is unsupported.');
}
type Job={id:string;state:string;actor_id:string;manifest_json:string;progress_json:string};
// Catalog columns are nonempty. Balance addition so wide supported tables stay
// below D1's expression-depth limit while counting every typed cell exactly once.
function columnByteSum(columns:readonly string[]):string{
 if(columns.length===1)return `COALESCE(length(CAST(${columns[0]} AS BLOB)),0)`;
 const middle=Math.floor(columns.length/2);
 return `(${columnByteSum(columns.slice(0,middle))}+${columnByteSum(columns.slice(middle))})`;
}
export class ArchiveExportRepository{
 constructor(readonly db:D1Database,readonly profile?:ArchiveExportProfile){}
 async job(id:string,actor:string){const job=await this.db.prepare("SELECT * FROM archive_jobs WHERE id=? AND kind='export' AND actor_id=?").bind(id,actor).first<Job>();if(!job)throw new RecordError(404,'Archive export not found.');return job;}
 async status(id:string,actor:string){const job=await this.job(id,actor),manifest:TransferManifest=JSON.parse(job.manifest_json),progress:Progress=JSON.parse(job.progress_json);return{id,state:job.state==='snapshotting'?'preparing':job.state,completedTables:progress.table,totalTables:manifest.tables.length,...(job.state==='ready'?{manifest}: {})};}
 async unfinished(actor:string){return Promise.all((await unfinishedExportIds(this.db,actor)).map(id=>this.status(id,actor)));}
 async create(actor:string){
  await reconcileLegacyOwnership(this.db);
  if(await this.db.prepare("SELECT name FROM runtime_controls WHERE name='archive_import'").first())throw new RecordError(409,'Finish or abort the current restore before exporting.');
  const catalog=await (this.profile?.catalog(this.db)??archiveCatalog(this.db)),id=createId(),exportedAt=new Date().toISOString();
  const manifest:TransferManifest=this.profile?await this.profile.manifest(this.db,catalog,exportedAt):{format:'orbit-export',version:2,exportedAt,tables:catalog.map(t=>({name:t.name,columns:t.columns.map(c=>c.name),rows:0})),parts:0,rows:0},progress:Progress={table:0,cursor:0,part:0,snapshotLayout:'aliased-v1'};
  const reservation=this.profile?[...await this.profile.reserve(this.db,id,'export'),...await this.profile.writeFence(this.db,id,manifest)]:[];
  // CTAS copies typed cells without JSON expansion, indexes or per-row JavaScript.
  // D1 batch is one transaction: every table belongs to the same source snapshot.
  try{await this.db.batch([...reservation,this.db.prepare("INSERT INTO runtime_controls VALUES('archive_export',?)").bind(id),this.db.prepare("INSERT INTO archive_jobs(id,kind,state,actor_id,manifest_json,progress_json,created_at) VALUES(?,'export','snapshotting',?,?,?,?)").bind(id,actor,JSON.stringify(manifest),JSON.stringify(progress),exportedAt),...catalog.map(t=>this.db.prepare(`CREATE TABLE ${snapshotName(id,t.name)} AS SELECT ${t.columns.map((c,i)=>`${quoteIdentifier(c.name)} AS c_${i}`).join(',')} FROM ${t.name}`)),this.db.prepare("DELETE FROM runtime_controls WHERE name='archive_export'"),...(this.profile?await this.profile.writeFence(this.db,id,manifest):[])]);}catch(error){
   // A lost acknowledgement must never replay the mutation. Only the exact
   // committed job proves that this atomic snapshot transaction succeeded.
   const committed=await this.db.prepare("SELECT state,manifest_json,progress_json FROM archive_jobs WHERE id=? AND kind='export' AND actor_id=?").bind(id,actor).first<Pick<Job,'state'|'manifest_json'|'progress_json'>>();
   if(!committed||committed.state!=='snapshotting'||committed.manifest_json!==JSON.stringify(manifest)||committed.progress_json!==JSON.stringify(progress))throw error;
  }
  try{await this.profile?.observe(this.db,id,'after-snapshot');}catch{throw new ArchiveExportCreationError(id);}
  // The atomic batch committed the job and every snapshot table. Its initial
  // response needs no further D1 requests: a long copy can outlive the local
  // RPC connection. Existing advance() initializes the durable snapshot phase.
  return {id,state:'preparing',completedTables:0,totalTables:catalog.length};
 }
 private async initializeSnapshot(job:Job){const manifest:TransferManifest=JSON.parse(job.manifest_json);manifest.rows=0;
  for(const table of manifest.tables){table.rows=(await this.db.prepare(`SELECT COALESCE(MAX(rowid),0) AS n FROM ${snapshotName(job.id,table.name)}`).first<{n:number}>())!.n;manifest.rows+=table.rows;if(!Number.isSafeInteger(table.rows)||!Number.isSafeInteger(manifest.rows))throw new RecordError(413,'Archive row inventory exceeds safe integer bounds.');}
  const update=this.db.prepare("UPDATE archive_jobs SET state='preparing',manifest_json=? WHERE id=? AND state='snapshotting'").bind(JSON.stringify(manifest),job.id),profile=storedExportProfile(manifest);
  if(profile)await this.db.batch([...await profile.writeFence(this.db,job.id,manifest),update]);else await update.run();
  await profile?.observe(this.db,job.id,'after-initialize');
 }

 async advance(id:string,actor:string){
  // Each committed part is independently resumable; retries never duplicate rows.
  for(let iteration=0;iteration<8;iteration++){
   const job=await this.job(id,actor);if(job.state==='snapshotting'){await this.initializeSnapshot(job);continue;}if(job.state==='ready'||job.state==='aborted')return this.status(id,actor);if(job.state!=='preparing')throw new RecordError(409,'This export is unavailable.');
   const manifest:TransferManifest=JSON.parse(job.manifest_json),progress:Progress=JSON.parse(job.progress_json);while(progress.table<manifest.tables.length&&progress.cursor>=manifest.tables[progress.table]!.rows){progress.table++;progress.cursor=0;}
   const table=manifest.tables[progress.table];if(!table){manifest.parts=progress.part;await this.db.batch([...(await storedExportProfile(manifest)?.writeFence(this.db,id,manifest)??[]),this.db.prepare("UPDATE archive_jobs SET state='ready',manifest_json=?,progress_json=? WHERE id=? AND state='preparing' AND progress_json=?").bind(JSON.stringify(manifest),JSON.stringify(progress),id,job.progress_json)]);await storedExportProfile(manifest)?.observe(this.db,id,'after-ready');return this.status(id,actor);}
   const snapshot=snapshotName(id,table.name),columns=snapshotColumns(table.columns,progress),expression=columnByteSum(columns),sizes=(await this.db.prepare(`SELECT rowid AS position,(${expression}) AS bytes FROM ${snapshot} WHERE rowid>? ORDER BY rowid LIMIT ?`).bind(progress.cursor,ARCHIVE_PART_ROWS).all<{position:number;bytes:number}>()).results;
   if(!sizes.length)throw new Error('Archive snapshot is incomplete.');let end=progress.cursor,total=0;for(const row of sizes){const size=row.bytes+table.name.length+100;if(end!==progress.cursor&&total+size>524288)break;if(size>ARCHIVE_PART_BYTES-1024)throw new RecordError(413,'A stored row exceeds the archive transfer envelope.');total+=size;end=row.position;}
   const rows=(await this.db.prepare(`SELECT ${table.columns.map((c,i)=>`${columns[i]} AS ${quoteIdentifier(c)}`).join(',')} FROM ${snapshot} WHERE rowid>? AND rowid<=? ORDER BY rowid`).bind(progress.cursor,end).all<Record<string,string|number|null>>()).results;
   const records:ArchivePart['records']=rows.map((row,index)=>({table:table.name,index:sizes[index]!.position-1,row:storedExportProfile(manifest)?.encodeRow(row)??row})),part:ArchivePart={index:progress.part,sha256:await archiveHash(records),records};if(new TextEncoder().encode(JSON.stringify(part)).length>ARCHIVE_PART_BYTES)throw new RecordError(413,'A stored row exceeds the archive transfer envelope.');progress.cursor=end;progress.part++;
   const storageFence=await storedExportProfile(manifest)?.writeFence(this.db,id,manifest)??[];
   try{await this.db.batch([...storageFence,...partStatements(this.db,id,part,job.progress_json),this.db.prepare("UPDATE archive_jobs SET progress_json=? WHERE id=? AND state='preparing' AND progress_json=?").bind(JSON.stringify(progress),id,job.progress_json),...storageFence]);}catch(error){const saved=await this.db.prepare('SELECT sha256 FROM archive_parts WHERE job_id=? AND part_index=?').bind(id,part.index).first<{sha256:string}>();if(saved?.sha256!==part.sha256)throw error;}await storedExportProfile(manifest)?.observe(this.db,id,'after-part');
  }return this.status(id,actor);
 }
 async abort(id:string,actor:string){const job=await this.job(id,actor),manifest:TransferManifest=JSON.parse(job.manifest_json);await this.db.batch([...manifest.tables.map(t=>this.db.prepare(`DROP TABLE IF EXISTS ${snapshotName(id,t.name)}`)),this.db.prepare('DELETE FROM archive_parts WHERE job_id=?').bind(id),this.db.prepare("UPDATE archive_jobs SET state='aborted' WHERE id=?").bind(id)]);await storedExportProfile(manifest)?.release(this.db,id);return this.status(id,actor);}
 async download(id:string,actor:string){const job=await this.job(id,actor);if(job.state!=='ready')throw new RecordError(409,'Finish preparing this export before downloading.');const manifest:TransferManifest=JSON.parse(job.manifest_json),encoder=new TextEncoder(),db=this.db;let part=-1,segment=-1,started=false,done=false,queries=0;
  const stream=new ReadableStream<Uint8Array>({async pull(controller){try{if(!started){started=true;controller.enqueue(encoder.encode(JSON.stringify({format:'orbit-export',version:manifest.version,manifest}).slice(0,-1)+',"parts":[\n'));return;}if(done){controller.close();return;}
   const rows=(await db.prepare('SELECT part_index,segment_index,content FROM archive_part_segments WHERE job_id=? AND (part_index>? OR (part_index=? AND segment_index>?)) ORDER BY part_index,segment_index LIMIT ?').bind(id,part,part,segment,manifest.version===3?64:16).all<{part_index:number;segment_index:number;content:string}>()).results;queries++;if(queries>990)throw new Error('Archive download query budget exceeded.');if(!rows.length){if(!await db.prepare("SELECT 1 FROM archive_jobs WHERE id=? AND state='ready'").bind(id).first()||part+1!==manifest.parts)throw new Error('Archive snapshot was removed or is incomplete.');controller.enqueue(encoder.encode('\n]}\n'));done=true;return;}
   for(const row of rows){if(row.part_index!==part){if(row.part_index!==part+1||row.segment_index!==0)throw new Error('Archive part sequence is incomplete.');if(part>=0)controller.enqueue(encoder.encode('\n,'));}else if(row.segment_index!==segment+1)throw new Error('Archive segment sequence is incomplete.');controller.enqueue(encoder.encode(row.content));part=row.part_index;segment=row.segment_index;}
  }catch(error){controller.error(error);}}});return new Response(stream,{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="orbit-export-${id}.json"`,'Cache-Control':'no-store'}});
 }
}
