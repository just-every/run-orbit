import {checkArchiveOperators,restoreOperatorStatements} from './archive-operators';
import {verifyArchiveContentIdentity} from './archive-content-identity';
import type {ImportContext} from './archive-import-context';
import { stageLayouts, stageCell, quoteIdentifier, liveRowSelector, type StageLayout } from './archive-stage-layout';
import { privacyContextStatement, privacyMatcher, activeSuppressionTokens, suppressionProof } from './suppression';
import {invalidateSuppressedWork} from './suppression-effects';
import { createId } from '../../shared/ids';
import { audit, RecordError } from './shared';
import { archiveCatalog, type ArchiveManifest, type ArchiveTable } from './archive-schema';
import { stageName, stageTables } from './archive-storage';
export type ImportJob = {
    id: string;
    kind: string;
    state: string;
    actor_id: string;
    manifest_json: string;
    progress_json: string;
};
type Progress = {
    phase: 'backup' | 'clear' | 'load' | 'rollback-clear' | 'rollback-load';
    table: number;
    offset: number;
    backupId: string;
};
async function save(db: D1Database, job: ImportJob, p: Progress, statements: D1PreparedStatement[] = [], context?:ImportContext) {
    const enteringRollback=p.phase.startsWith('rollback')&&!String(JSON.parse(job.progress_json||'{}').phase??'').startsWith('rollback');
    const rollback=enteringRollback&&context?.prepareRollback?await context.prepareRollback(job):undefined;
    await db.batch([...(rollback?.before??(context?await context.fence(job):[])),db.prepare('INSERT INTO archive_step_claims VALUES(?,?)').bind(job.id,job.progress_json),db.prepare("INSERT INTO runtime_controls VALUES('archive_applying',?)").bind(job.id),...(rollback?.statements??[]),...statements,db.prepare('UPDATE archive_jobs SET progress_json=? WHERE id=?').bind(JSON.stringify(p),job.id),db.prepare('DELETE FROM archive_step_claims WHERE job_id=?').bind(job.id),db.prepare("DELETE FROM runtime_controls WHERE name='archive_applying'"),...(context?await context.fence(job):[])]);
}
async function begin(db: D1Database, job: ImportJob, catalog: ArchiveTable[], layouts: Map<string, StageLayout>,context?:ImportContext) { const c = (table: string, column: string, alias?: string) => stageCell(layouts.get(table)!, column, alias); const manifest: ArchiveManifest = JSON.parse(job.manifest_json); const parts = (await db.prepare('SELECT count(*) AS n FROM archive_parts WHERE job_id=?').bind(job.id).first<{
    n: number;
}>())!.n; if (context)await verifyArchiveContentIdentity(db,job.id,manifest); if (parts !== manifest.parts)
    throw new RecordError(409, 'The archive is incomplete. Upload every part before restoring.'); for (const table of manifest.tables) {
    const count = (await db.prepare(`SELECT count(*) AS n FROM ${stageName(job.id, table.name)}`).first<{
        n: number;
    }>())!.n;
    if (count !== table.rows)
        throw new RecordError(409, `The archive is missing rows for ${table.name}.`);
} await checkArchiveOperators(db,job.id,layouts.get('operators')!); if(await db.prepare(`SELECT 1 FROM ${stageName(job.id,'audit_entries')} a WHERE ${c('audit_entries','action','a')} IN('contact.suppressed','contact.suppression_cleared','capture.erased_item','capture.erased_mailbox') AND NOT EXISTS(SELECT 1 FROM ${stageName(job.id,'privacy_matching_contexts')} p WHERE ${c('privacy_matching_contexts','context_id','p')}=substr(${c('audit_entries','entity_id','a')},1,32)) LIMIT 1`).first())throw new RecordError(400,'Archive privacy matching context is missing.'); if (!await db.prepare(`SELECT 1 FROM ${stageName(job.id, 'operators')} WHERE ${c('operators','status')}='active' LIMIT 1`).first())
    throw new RecordError(400, 'An archive must retain an active operator for native access.'); for (const table of ['contacts', 'companies', 'opportunities', 'signals'])
    if (await db.prepare(`SELECT id FROM ${table} LIMIT 1`).first())
        throw new RecordError(409, 'Restore requires an empty customer database.'); if (await db.prepare("SELECT name FROM runtime_controls WHERE name IN ('archive_import','archive_export')").first())
    throw new RecordError(409, 'Another archive transfer is preparing or restoring.'); const backupId = createId(), progress: Progress = { phase: 'backup', table: 0, offset: 0, backupId }; await db.batch([...(context?.begin?await context.begin(job):[]),...(context?await context.fence(job):[]),db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'archive_import',CASE WHEN NOT EXISTS(SELECT 1 FROM archive_jobs WHERE id=? AND state='uploading') OR EXISTS(SELECT 1 FROM contacts) OR EXISTS(SELECT 1 FROM companies) OR EXISTS(SELECT 1 FROM opportunities) OR EXISTS(SELECT 1 FROM signals) THEN NULL ELSE ? END").bind(job.id,job.id), db.prepare("INSERT INTO runtime_controls VALUES('restore',?)").bind(job.id), db.prepare("INSERT INTO archive_jobs VALUES(?,'backup','preparing',?,'{}','{}',?)").bind(backupId, job.actor_id, new Date().toISOString()), ...await stageTables(db, backupId, catalog), db.prepare("UPDATE archive_jobs SET state='restoring',progress_json=? WHERE id=?").bind(JSON.stringify(progress), job.id)]); }
/** One durable step. Returns how many table positions it moved: a step that passes over empty
 * tables counts each of them, so a caller's step budget paces a restore by tables as before. */
export async function advanceImport(db: D1Database, job: ImportJob,context?:ImportContext,budget=Infinity): Promise<number> {
    const moved = { skipped: 0, budget };
    await advanceStep(db, job, context, moved);
    return 1 + moved.skipped;
}
type Moved = { skipped: number; budget: number };
/** Passes over one more empty table, or reports the step budget spent so the caller saves this position. */
const passEmpty = (moved: Moved) => ++moved.skipped + 1 < moved.budget;
async function advanceStep(db: D1Database, job: ImportJob, context: ImportContext|undefined, moved: Moved) {
    if (job.state === 'complete' || job.state === 'aborted')
        return;
    const catalog = context?.catalog??await archiveCatalog(db), layouts = await stageLayouts(db, catalog);
    if (job.state === 'uploading') {
        await begin(db, job, catalog, layouts,context);
        return;
    }
    const p: Progress = JSON.parse(job.progress_json);
    // A table with nothing left to back up or load only moves the cursor, so a step passes over it
    // and commits once with its real work: each commit carries the full schema and capacity fences.
    if (p.phase === 'backup') for (;;) {
        const table = catalog[p.table];
        if (!table) {
            p.phase = 'clear';
            p.table = 0;
            p.offset = 0;
            await save(db, job, p,[],context);
            return;
        }
        const count = (await db.prepare(`SELECT count(*) AS n FROM (SELECT 1 FROM ${table.name} LIMIT 10000 OFFSET ?)`).bind(p.offset).first<{ n: number }>())!.n;
        if (!count) {
            p.table++;
            p.offset = 0;
            if (passEmpty(moved)) continue;
            await save(db, job, p,[],context);
            return;
        }
        const layout = layouts.get(table.name)!;
        const statement = db.prepare(`INSERT INTO ${stageName(p.backupId, table.name)}(${layout.columns.map(c => stageCell(layout, c.name)).join(',')}) SELECT ${layout.columns.map(c => quoteIdentifier(c.name)).join(',')} FROM ${table.name} LIMIT 10000 OFFSET ?`).bind(p.offset);
        p.offset += count;
        await save(db, job, p, [statement],context);
        return;
    }
    // Clear keeps one table per step, so a restore interrupted mid-clear stops between tables.
    if (p.phase === 'clear' || p.phase === 'rollback-clear') {
        const table = [...catalog].reverse()[p.table];
        if (!table) {
            p.phase = p.phase === 'clear' ? 'load' : 'rollback-load';
            p.table = 0;
            p.offset = 0;
            await save(db, job, p,[],context);
            return;
        }
        if (table.name === 'operators') {
            p.table++;
            await save(db, job, p,[],context);
            return;
        }
        const retain=p.phase!=='clear'?'':table.name==='audit_entries'?" WHERE action NOT IN('contact.suppressed','contact.suppression_cleared','capture.erased_item','capture.erased_mailbox')":table.name==='privacy_matching_contexts'?" WHERE context_id NOT IN(SELECT substr(entity_id,1,32) FROM audit_entries WHERE action IN('contact.suppressed','contact.suppression_cleared','capture.erased_item','capture.erased_mailbox'))":'';
        const count = (await db.prepare(`SELECT count(*) AS n FROM (SELECT 1 FROM ${table.name}${retain} LIMIT 10000)`).first<{
            n: number;
        }>())!.n;
        if (!count)
            p.table++;
        const selector = liveRowSelector(layouts.get(table.name)!);
        // Identity-free owner tables must be cleared completely; owner values named
        // rowid are never mistaken for SQLite's hidden address. The source is locked.
        const clear = selector ? `DELETE FROM ${table.name} WHERE (${selector}) IN(SELECT ${selector} FROM ${table.name}${retain} LIMIT 10000)` : `DELETE FROM ${table.name}${retain}`;
        await save(db, job, p, count ? [db.prepare(clear)] : [],context);
        return;
    }
    for (;;) {
    const rollback = p.phase === 'rollback-load', table = catalog[p.table], source = rollback ? p.backupId : job.id;
    if (!table) {
        await finish(db, job, p, catalog, rollback, layouts,context);
        return;
    }
    const layout = layouts.get(table.name)!, c = (name: string, alias?: string) => stageCell(layout, name, alias);
    const staged = stageName(source, table.name), rows = (await db.prepare(`SELECT rowid AS n FROM ${staged} WHERE rowid>=? ORDER BY rowid LIMIT 10000`).bind(p.offset).all<{
        n: number;
    }>()).results;
    if (!rows.length) {
        p.table++;
        p.offset = 0;
        if (passEmpty(moved)) continue;
        await save(db, job, p,[],context);
        return;
    }
    const end = rows.at(-1)!.n;
    let columns = table.columns.map(c => c.name);
    if (rollback)
        columns = layout.columns.filter(column => column.hidden === 0).map(column => column.name);
    const values = columns.map(c => table.name === 'operators' ? (c === 'email' ? `'archive-${job.id}-'||${stageCell(layout,'id')}||'@invalid'` : c === 'setup_owner' ? '0' : stageCell(layout,c)) : stageCell(layout,c));
    if(table.name==='privacy_matching_contexts'&&await db.prepare(`SELECT 1 FROM ${staged} s JOIN privacy_matching_contexts p ON p.context_id=${c('context_id','s')} WHERE ${c('matching_key','s')}<>p.matching_key LIMIT 1`).first())throw new RecordError(409,'Archive privacy matching context conflicts with retained safety state.');
    if(table.name==='audit_entries'&&await db.prepare(`SELECT 1 FROM ${staged} s JOIN audit_entries a ON a.id=${c('id','s')} WHERE ${c('action','s')} IN('contact.suppressed','contact.suppression_cleared','capture.erased_item','capture.erased_mailbox') AND (${c('action','s')}<>a.action OR ${c('entity_id','s')}<>a.entity_id OR ${c('details_json','s')}<>a.details_json OR ${c('occurred_at','s')}<>a.occurred_at) LIMIT 1`).first())throw new RecordError(409,'Archive anonymous safety history conflicts with retained audit history.');
    const deduplicate=table.name==='privacy_matching_contexts'?`AND ${c('context_id')} NOT IN(SELECT context_id FROM privacy_matching_contexts)`:table.name==='audit_entries'?`AND (${c('action')} NOT IN('contact.suppressed','contact.suppression_cleared','capture.erased_item','capture.erased_mailbox') OR ${c('id')} NOT IN(SELECT id FROM audit_entries))`:'';
    const statement = db.prepare(`INSERT INTO ${table.name}(${columns.map(quoteIdentifier).join(',')}) SELECT ${values.join(',')} FROM ${staged} WHERE rowid>=? AND rowid<=? ${table.name === 'operators' ? `AND ${c('id')} NOT IN(SELECT id FROM operators)` : ''} ${deduplicate} ORDER BY rowid`).bind(p.offset, end);
    // Keep the existing inclusive cursor representation without unsafe MAX_SAFE_INTEGER + 1.
    if (end === Number.MAX_SAFE_INTEGER) { p.table++; p.offset = 0; } else p.offset = end + 1;
    const suppression:D1PreparedStatement[]=[];
    if(table.name==='contacts'&&!rollback){
        const contacts=(await db.prepare(`SELECT ${c('id')} AS id,${c('email')} AS email,${c('contactability')} AS contactability FROM ${staged} WHERE rowid>=? AND rowid<=?`).bind(rows[0]!.n,end).all<{id:string;email:string|null;contactability:string}>()).results;
        const active=await activeSuppressionTokens(db);
        if(active.size||contacts.some(contact=>contact.contactability==='do_not_contact')){
            // Legacy archives have no keyed context. Initialize inside the guarded
            // restore transaction, then resume this same contact chunk. Rollback
            // still restores the original contexts from its untouched backup.
            if(!await db.prepare('SELECT 1 FROM privacy_matching_contexts LIMIT 1').first()){
                p.offset=rows[0]!.n;
                await save(db,job,p,[privacyContextStatement(db)],context);
                return;
            }
            const match=await privacyMatcher(db);
            const aliases=(await db.prepare(`SELECT ${stageCell(layouts.get('record_aliases')!,'survivor_id','a')} AS survivor_id,${stageCell(layouts.get('record_aliases')!,'identity_key','a')} AS identity_key FROM ${stageName(source,'record_aliases')} a JOIN ${staged} c ON ${c('id','c')}=${stageCell(layouts.get('record_aliases')!,'survivor_id','a')} WHERE ${stageCell(layouts.get('record_aliases')!,'record_type','a')}='contact' AND c.rowid>=? AND c.rowid<=?`).bind(rows[0]!.n,end).all<{survivor_id:string;identity_key:string}>()).results;
            const identities=new Map<string,string[]>();for(const alias of aliases){const values=identities.get(alias.survivor_id)??[];values.push(alias.identity_key);identities.set(alias.survivor_id,values);}
            for(const contact of contacts){const tokens=[...new Set((await Promise.all([contact.email,...(identities.get(contact.id)??[])].map(email=>match(email)))).flat())];
                if(contact.contactability==='do_not_contact')suppression.push(...tokens.filter(token=>!active.has(token)).map(token=>suppressionProof(db,token)));
                else if(tokens.some(token=>active.has(token)))suppression.push(db.prepare("UPDATE contacts SET contactability='do_not_contact' WHERE id=?").bind(contact.id));
            }
        }
    }
    await save(db, job, p, [statement,...suppression],context);
    return;
    }
}
async function finish(db: D1Database, job: ImportJob, p: Progress, catalog: ArchiveTable[], rollback: boolean, layouts: Map<string, StageLayout>,context?:ImportContext) { const layout=layouts.get('operators')!, cell=(name:string)=>stageCell(layout,name), source = rollback ? p.backupId : job.id, operators = stageName(source, 'operators'); const columns = catalog.find(t => t.name === 'operators')!.columns.map(c => c.name); const statements: D1PreparedStatement[] = [...(context?await context.fence(job):[]),db.prepare('PRAGMA defer_foreign_keys=ON'), db.prepare('INSERT INTO archive_step_claims VALUES(?,?)').bind(job.id, job.progress_json), db.prepare("INSERT INTO runtime_controls VALUES('archive_applying',?)").bind(job.id)]; if (!rollback)
    statements.push(db.prepare('DELETE FROM delegation_codes'), db.prepare('DELETE FROM delegation_grants'), db.prepare('DELETE FROM identity_owner_signins'), db.prepare('DELETE FROM identity_proofs'), db.prepare('DELETE FROM identity_bindings'), db.prepare('DELETE FROM sessions')); statements.push(...restoreOperatorStatements(db,job.id,p.backupId,layout,columns,rollback,layouts.get('access_collaborators'))); if (!rollback) {
    statements.push(...invalidateSuppressedWork(db));
    statements.push(db.prepare(`UPDATE owner_bootstrap SET owner_id=(SELECT id FROM operators WHERE setup_owner=1 AND status='active'),email=(SELECT email FROM operators WHERE setup_owner=1 AND status='active'),display_name=(SELECT display_name FROM operators WHERE setup_owner=1 AND status='active'),workspace_name=COALESCE((SELECT name FROM workspace_settings),workspace_name),timezone=COALESCE((SELECT timezone FROM workspace_settings),timezone),currency=COALESCE((SELECT currency FROM workspace_settings),currency),stages_json=(SELECT json_group_array(json_object('id',id,'name',name)) FROM (SELECT id,name FROM pipeline_stages ORDER BY position)) WHERE EXISTS(SELECT 1 FROM operators WHERE setup_owner=1 AND status='active')`));
    const actor = await db.prepare(`SELECT ${cell('id')} AS id FROM ${operators} WHERE ${cell('id')}=? OR lower(${cell('email')})=lower((SELECT email FROM operators WHERE id=?)) LIMIT 1`).bind(job.actor_id,job.actor_id).first<{id:string}>();
    statements.push(audit(db, actor?.id ?? job.actor_id, 'data.restored', 'workspace', 'workspace', { initiatedBy: job.actor_id }));
} statements.push(...(context?await context.finish(job,rollback):[]));statements.push(db.prepare('DELETE FROM archive_step_claims WHERE job_id=?').bind(job.id), db.prepare("DELETE FROM runtime_controls WHERE name IN ('restore','archive_import','archive_applying')"), db.prepare('UPDATE archive_jobs SET state=? WHERE id=?').bind(rollback ? 'aborted' : 'complete', job.id));statements.push(...(context?await context.fence(job):[])); await db.batch(statements); }
export async function abortImport(db: D1Database, job: ImportJob,context?:ImportContext) { if (job.state === 'complete')
    throw new RecordError(409, 'A completed restore cannot be aborted.'); if (job.state === 'aborted')
    return; const catalog = context?.catalog??await archiveCatalog(db); if (job.state === 'uploading') {
    await db.batch([db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'archive_abort',CASE WHEN EXISTS(SELECT 1 FROM archive_jobs WHERE id=? AND state='uploading') THEN ? ELSE NULL END").bind(job.id,job.id), ...catalog.map(t => db.prepare(`DROP TABLE ${stageName(job.id, t.name)}`)), db.prepare('DELETE FROM archive_parts WHERE job_id=?').bind(job.id), db.prepare("UPDATE archive_jobs SET state='aborted' WHERE id=?").bind(job.id), db.prepare("DELETE FROM runtime_controls WHERE name='archive_abort'")]);
    return;
} const p: Progress = JSON.parse(job.progress_json); if (p.phase === 'backup') {
    await db.batch([db.prepare('INSERT INTO archive_step_claims VALUES(?,?)').bind(job.id, job.progress_json), db.prepare('DELETE FROM archive_step_claims WHERE job_id=?').bind(job.id), db.prepare("DELETE FROM runtime_controls WHERE name IN('restore','archive_import')"), db.prepare("UPDATE archive_jobs SET state='aborted' WHERE id=?").bind(job.id)]);
    return;
} if (!p.phase.startsWith('rollback')) {
    p.phase = 'rollback-clear';
    p.table = 0;
    p.offset = 0;
    await save(db, job, p,[],context);
} await advanceImport(db, { ...job, progress_json: JSON.stringify(p) },context); }
