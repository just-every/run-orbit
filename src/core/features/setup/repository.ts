import { RecordError } from '../records/shared';
import { SettingsRepository } from '../settings/repository';
import { PipelinesRepository } from '../pipelines/repository';
import type { PipelineStageInput } from '../pipelines/contracts';

export interface SetupInput { ownerName?: string; name: string; timezone: string; currency: string; stages: string[] }

export async function firstRunComplete(db: D1Database): Promise<boolean> {
  return Boolean(await db.prepare("SELECT 1 FROM first_run_setup WHERE id='workspace'").first());
}

export async function readSetup(db: D1Database, operatorId: string) {
  const [complete, owner, workspace, stages] = await Promise.all([
    firstRunComplete(db),
    db.prepare('SELECT setup_owner FROM operators WHERE id=?').bind(operatorId).first<{ setup_owner: number }>(),
    db.prepare("SELECT name,timezone,currency FROM workspace_settings WHERE id='workspace'").first<{ name: string; timezone: string; currency: string }>(),
    db.prepare('SELECT name FROM pipeline_stages ORDER BY position').all<{ name: string }>(),
  ]);
  return { complete, owner: owner?.setup_owner === 1, workspace, stages: stages.results.map((stage) => stage.name) };
}

/** The setup owner confirms the workspace once; completion is durable and later edits use Settings. */
export async function completeSetup(db: D1Database, operatorId: string, input: SetupInput): Promise<void> {
  const current = await readSetup(db, operatorId);
  if (!current.owner) throw new RecordError(403, 'Only the workspace owner can finish setup.');
  if (current.complete) return;
  const settings = new SettingsRepository(db);
  const { workspace, stages, pipelines } = await settings.read() as unknown as {
    workspace: Record<string, unknown>;
    stages: { id: string; name: string; pipeline_id: string; probability: number; required_fields: PipelineStageInput['requiredFields']; stale_interval_days: number | null }[];
    pipelines: { id: string; name: string; is_default: number; revision: number }[];
  };
  const pipeline = pipelines.find(item => item.is_default === 1);
  if (!pipeline) throw new RecordError(409, 'The default pipeline is unavailable.');
  await settings.update({
    name: input.name, timezone: input.timezone, currency: input.currency,
    workingHours: JSON.parse(String(workspace.working_hours_json)),
    staleIntervalDays: Number(workspace.stale_interval_days),
    awaitingResponseWorkingDays: Number(workspace.awaiting_response_working_days),
    freeMailDomains: JSON.parse(String(workspace.free_mail_domains_json)),
  }, operatorId);
  const unused = stages.filter(stage => stage.pipeline_id === pipeline.id);
  await new PipelinesRepository(db).update(pipeline.id, { name: pipeline.name, revision: pipeline.revision, stages: input.stages.map((name, position) => {
    const index = unused.findIndex((stage) => stage.name === name);
    const existing = index === -1 ? undefined : unused.splice(index, 1)[0];
    return {
      ...(existing ? { id: existing.id } : {}), name,
      probability: existing?.probability || Math.round(10 + 80 * position / Math.max(1, input.stages.length - 1)),
      requiredFields: existing?.required_fields ?? [], staleIntervalDays: existing?.stale_interval_days ?? null,
    };
  }) }, operatorId);
  // The owner's own name replaces the stand-in "Owner" on deals, timelines and the welcome. A name is not
  // authority, so updated_at (the session authority version) stays and the owner stays signed in.
  if (input.ownerName) await db.prepare('UPDATE operators SET display_name=? WHERE id=?').bind(input.ownerName, operatorId).run();
  await db.prepare("INSERT OR IGNORE INTO first_run_setup (id, completed_at) VALUES ('workspace', ?)").bind(new Date().toISOString()).run();
}
