import {upgradeCaptureMailRuleArchiveRecord} from '../capture/archive';
import {recoverableImport,acknowledgeImport,unfinishedImportIds} from './archive-import-recovery';
import {storedArchiveContentDigest} from './archive-content-identity';
import {uploadedArchiveGrowth} from './archive-size-plan';
import {foldRestoreCatalog} from './archive-fold-catalog';
import {archiveSchemaFence} from './archive-schema-fence';
import {validateFoldManifest,validateFoldPart} from './archive-fold-validation';
import {reserveArchiveStorage,archiveStorageFence,observeArchiveStorage} from './archive-storage-budget';
import {foldedImportContext} from './archive-import-context';
import type {TransferManifest} from './archive-profile';
import { createId } from '../../shared/ids';
import { RecordError } from './shared';
import { archiveHash, validateManifest, validatePart, type ArchiveManifest } from './archive-schema';
import { partStatements, stageTables } from './archive-storage';
import { uploadStatements } from './archive-stage-upload';
import {upgradeLibraryArchiveRecord} from './library-archive-compatibility';
import { advanceImport, abortImport, type ImportJob } from './archive-import-progress';
export class ArchiveImportRepository {
    constructor(readonly db: D1Database,readonly folded=false) { }
    async job(id: string, actor: string) { const job = await this.db.prepare("SELECT * FROM archive_jobs WHERE id=? AND kind='import' AND actor_id=?").bind(id, actor).first<ImportJob>(); if (!job)
        throw new RecordError(404, 'Archive import not found.'); return job; }
    async status(id: string, actor: string) {
        const job=await this.job(id,actor),manifest:TransferManifest=JSON.parse(job.manifest_json),progress=JSON.parse(job.progress_json||'{}');
        const context=await foldedImportContext(this.db,job),totalTables=context?.catalog.length??manifest.tables.length;
        const complete=job.state==='complete',completedTables=complete?totalTables:Math.min(progress.table??0,totalTables);
        const rollback=String(progress.phase??'').startsWith('rollback'),phases=rollback?['rollback-clear','rollback-load']:['backup','clear','load'];
        const totalSteps=phases.length*totalTables+1,completedSteps=complete?totalSteps:Math.max(0,phases.indexOf(progress.phase))*totalTables+completedTables;
        const nextPart=complete?manifest.parts:(await this.db.prepare('SELECT count(*) AS n FROM archive_parts WHERE job_id=?').bind(id).first<{n:number}>())!.n;
        const contentDigest=this.folded?await storedArchiveContentDigest(this.db,id):undefined;
        return {id,state:job.state,manifest,nextPart,phase:progress.phase,completedTables,totalTables,completedSteps,totalSteps,...(contentDigest?{contentDigest}:{})};
    }
    async unfinished(actor:string){return Promise.all((await unfinishedImportIds(this.db,actor)).map(id=>this.status(id,actor)));}
    async create(input: unknown, actor: string,contentDigest?:string) {
        if(contentDigest!==undefined&&(!this.folded||!/^[a-f0-9]{64}$/.test(contentDigest)))throw new RecordError(400,'Provide a valid content digest for a hosted archive restore.');
        const {manifest,catalog}=await(this.folded?validateFoldManifest(this.db,input):validateManifest(this.db,input));
        if(this.folded){const existing=await recoverableImport(this.db,actor,manifest,contentDigest);if(existing)return acknowledgeImport(this.db,existing,()=>this.status(existing,actor));}
        const id=createId(),stagingCatalog=this.folded?await foldRestoreCatalog(this.db,catalog):catalog;
        const reservation=this.folded?[...await reserveArchiveStorage(this.db,id,'import'),...archiveSchemaFence(this.db,catalog),...await archiveStorageFence(this.db,id)]:[];
        try{await this.db.batch([...reservation,...(this.folded?[this.db.prepare("INSERT INTO archive_job_profiles VALUES(?,'orbit-fold-1',?,?)").bind(id,JSON.stringify(stagingCatalog),await archiveHash(stagingCatalog))]:[]),this.db.prepare("INSERT INTO archive_jobs(id,kind,state,actor_id,manifest_json,created_at) VALUES(?,'import','uploading',?,?,?)").bind(id,actor,JSON.stringify(manifest),new Date().toISOString()),...(contentDigest?[this.db.prepare('INSERT INTO archive_file_identities VALUES(?,?)').bind(id,contentDigest)]:[]),...await stageTables(this.db,id,stagingCatalog)]);}
        catch(error){
            if(!this.folded)throw error;
            // Reconcile the exact committed transaction or a concurrent identical
            // owner request. Never replay a staging mutation after a lost ACK.
            const committed=await recoverableImport(this.db,actor,manifest,contentDigest,id)??await recoverableImport(this.db,actor,manifest,contentDigest);
            if(!committed)throw error;
            return acknowledgeImport(this.db,committed,()=>this.status(committed,actor));
        }
        return this.folded?acknowledgeImport(this.db,id,()=>this.status(id,actor)):this.status(id,actor);
    }
    async upload(id: string, index: number, input: unknown, actor: string) {
        const job = await this.job(id, actor), manifest: TransferManifest = JSON.parse(job.manifest_json), context=await foldedImportContext(this.db,job), { catalog, inputCatalog } = await (context?validateFoldManifest(this.db,manifest):validateManifest(this.db,manifest)), part = context?validateFoldPart(input,inputCatalog,manifest):validatePart(input, inputCatalog, manifest as ArchiveManifest);
        if (index !== part.index || index >= manifest.parts || await archiveHash(part.records) !== part.sha256)
            throw new RecordError(400, 'Archive part index or checksum does not match.');
        const previous = await this.db.prepare('SELECT sha256 FROM archive_parts WHERE job_id=? AND part_index=?').bind(id, index).first<{
            sha256: string;
        }>();
        if (previous) {
            if (previous.sha256 !== part.sha256)
                throw new RecordError(409, 'This part was already uploaded with different contents.');
            return this.status(id, actor);
        }
        if (job.state !== 'uploading')
            throw new RecordError(409, 'This import no longer accepts new parts.');
        const count = (await this.db.prepare('SELECT count(*) AS n FROM archive_parts WHERE job_id=?').bind(id).first<{
            n: number;
        }>())!.n;
        if (index !== count)
            throw new RecordError(409, 'Upload the next missing archive part first.');
        // A request contains at most 1000 rows. Stage typed cells, never JSON-expanded D1 rows.
        await this.db.batch([...(context?[...await context.fence(job),...await archiveStorageFence(this.db,id,await uploadedArchiveGrowth(this.db,part,catalog,manifest.version===3))]:[]),...partStatements(this.db, id, part),...(context?[this.db.prepare('INSERT INTO archive_part_inventory VALUES(?,?,?)').bind(id,index,part.records.length)]:[]), ...await uploadStatements(this.db, id, { ...part, records: part.records.map(upgradeCaptureMailRuleArchiveRecord).map(upgradeLibraryArchiveRecord).map(record => record.table === 'contacts' && !('contactability_revision' in record.row) ? { ...record, row: { ...record.row, contactability_revision: 0 } } : record) }, catalog,manifest.version===3),...(context?await archiveStorageFence(this.db,id):[])]);
        if(context)await observeArchiveStorage(this.db,id,'after-upload');return this.status(id, actor);
    }
    async advance(id: string, actor: string) {
        let job=await this.job(id,actor);const context=await foldedImportContext(this.db,job),deadline=Date.now()+2000;
        // Amortize hosted request latency while keeping each durable step resumable.
        for(let step=0;step<8&&!['complete','aborted'].includes(job.state);){
            step+=await advanceImport(this.db,job,context,8-step);job=await this.job(id,actor);
            if(Date.now()>=deadline)break;
        }
        if(context)await observeArchiveStorage(this.db,id,'after-restore-step');
        if(context&&['complete','aborted'].includes(job.state))await context.cleanup(job);
        return this.status(id,actor);
    }
    async abort(id: string, actor: string) { const job = await this.job(id, actor); const context=await foldedImportContext(this.db,job);await abortImport(this.db, job,context);if(context)await observeArchiveStorage(this.db,id,'after-abort-step');const current=await this.job(id,actor);if(context&&current.state==='aborted')await context.cleanup(current); return this.status(id, actor); }
}
