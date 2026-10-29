import {restoreRecordMailStatements} from '../outreach/record-mail-archive';
import {archiveHash} from './archive-schema';
import {RecordError} from './shared';
import {prepareViewRollback} from './archive-view-rollback';
import {lineageCommitStatements} from './archive-lineage';
import type {TransferManifest} from './archive-profile';
import {archiveSchemaFence} from './archive-schema-fence';
import {restoreNativeProjectionSql} from '../graph/restore-projection';
import {foldRestoreCatalog} from './archive-fold-catalog';
import {archiveStorageFence,archiveRestoreCoverage,releaseArchiveStorage} from './archive-storage-budget';
import {stageName} from './archive-storage';
import type {ArchiveTable} from './archive-schema';
import type {ImportJob} from './archive-import-progress';
export interface ImportContext{catalog:ArchiveTable[];begin?(job:ImportJob):Promise<D1PreparedStatement[]>;fence(job:ImportJob):Promise<D1PreparedStatement[]>;prepareRollback?(job:ImportJob):Promise<{before:D1PreparedStatement[];statements:D1PreparedStatement[]}>;finish(job:ImportJob,rollback:boolean):Promise<D1PreparedStatement[]>;cleanup(job:ImportJob):Promise<void>}
export async function foldedImportContext(db:D1Database,job:ImportJob):Promise<ImportContext|undefined>{
 if(!await db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='archive_job_profiles'").first())return;
 const profile=await db.prepare("SELECT catalog_json,catalog_hash FROM archive_job_profiles WHERE job_id=? AND generation='orbit-fold-1'").bind(job.id).first<{catalog_json:string;catalog_hash:string}>();if(!profile)return;
 const catalog:ArchiveTable[]=JSON.parse(profile.catalog_json);if(await archiveHash(catalog)!==profile.catalog_hash)throw new RecordError(409,'The stored target archive catalog was changed.');
 return{catalog,prepareRollback:current=>prepareViewRollback(db,current,catalog,profile),begin:()=>archiveRestoreCoverage(db,job.id,catalog),fence:async()=>[...archiveSchemaFence(db,catalog),...await archiveStorageFence(db,job.id)],async finish(_job,rollback){if(rollback)return[];return[...await lineageCommitStatements(db,job.id,JSON.parse(job.manifest_json) as TransferManifest,catalog.filter(t=>!['access_grants','access_invitations','access_form_authorities'].includes(t.name))),
 ...restoreRecordMailStatements(db,new Date().toISOString()),db.prepare("UPDATE workflow_versions SET status='paused',preview_id=NULL,preview_json=NULL"),db.prepare("UPDATE workflow_runs SET status='stopped',reason='Restored run needs fresh activation' WHERE status NOT IN('completed','undone')"),db.prepare("UPDATE workflow_approvals SET status='expired' WHERE status='pending'"),db.prepare('UPDATE sales_dashboards SET authority=0'),db.prepare("UPDATE sales_dashboard_schedules SET state='paused'"),
 db.prepare('DELETE FROM api_credentials'),db.prepare('DELETE FROM call_credentials'),db.prepare("UPDATE slack_personal_deletions SET state='held',error='Restored deletion needs explicit confirmation' WHERE state<>'deleted'"),db.prepare('UPDATE slack_personal_preferences SET enabled=0'),db.prepare("UPDATE slack_personal_notices SET state='held',error='Archive restored; fresh personal opt-in required' WHERE state IN('queued','rate-limited','failed','submitting')"),db.prepare('DELETE FROM slack_credentials'),db.prepare('DELETE FROM slack_action_tokens'),db.prepare("UPDATE slack_deletions SET state='held',error='Restored deletion needs administrator confirmation' WHERE state<>'deleted'"),db.prepare('UPDATE slack_channels SET enabled=0'),db.prepare('UPDATE slack_mappings SET revoked_at=COALESCE(revoked_at,?)').bind(new Date().toISOString()),db.prepare("UPDATE slack_installation SET state='disconnected',error='Archive restored; reconnect Slack credentials'"),
 db.prepare('DELETE FROM access_grants'),db.prepare('DELETE FROM access_invitations'),db.prepare('DELETE FROM access_form_authorities'),
 db.prepare("UPDATE access_memberships SET status='removed' WHERE operator_id IN(SELECT operator_id FROM access_collaborators)"),
 db.prepare('DELETE FROM publication_targets'),db.prepare("UPDATE publication_operations SET state='withdrawn' WHERE state='published'"),
 db.prepare("UPDATE signal_sources SET enabled=0,secret_ciphertext=NULL WHERE type='fixed_form'"),
 db.prepare("INSERT INTO access_workspaces SELECT 'workspace','orbit',name,1 FROM workspace_settings WHERE NOT EXISTS(SELECT 1 FROM access_workspaces)"),
 db.prepare("INSERT INTO access_legacy_mapping SELECT 1,'orbit','workspace' FROM access_workspaces WHERE NOT EXISTS(SELECT 1 FROM access_legacy_mapping)"),
 db.prepare("INSERT INTO original_operator_provisions SELECT id,created_at FROM operators WHERE NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id) AND id NOT IN(SELECT operator_id FROM original_operator_provisions)"),
 db.prepare("INSERT INTO access_memberships SELECT 'workspace',id,'legacy_operator',status,created_at FROM operators WHERE NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id) AND EXISTS(SELECT 1 FROM access_workspaces) ON CONFLICT(workspace_id,operator_id) DO UPDATE SET status=excluded.status,role='legacy_operator' WHERE access_memberships.status<>excluded.status OR access_memberships.role<>'legacy_operator'"),
 db.prepare("INSERT OR IGNORE INTO graph_workspace_epochs VALUES('workspace',1)"),
 ...['contact','company','opportunity'].map(kind=>db.prepare("INSERT OR IGNORE INTO schema_types VALUES('workspace',?,'{}',1)").bind(kind)),
 ...restoreNativeProjectionSql.map(sql=>db.prepare(sql)),
 // No imported operator session or captured publication capability is an execution grant.
 ];},async cleanup(current){const progress=JSON.parse(current.progress_json||'{}'),ids=[current.id,...(progress.backupId?[progress.backupId]:[])];await db.batch(ids.flatMap(id=>[...catalog.map(t=>db.prepare(`DROP TABLE IF EXISTS ${stageName(id,t.name)}`)),db.prepare('DELETE FROM archive_parts WHERE job_id=?').bind(id)]));await releaseArchiveStorage(db,current.id);}};
}
