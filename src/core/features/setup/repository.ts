import { orbitBusinessSettings } from '../agent-door';
import { RecordError } from '../records/shared';
import { SettingsRepository } from '../settings/repository';

export interface SetupInput { brandColor?: string; ownerName?: string; name: string; timezone: string; currency: string; stages: string[] }

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
export async function completeSetup(db: D1Database, operatorId: string, input: SetupInput, firstBuildAccent?: string): Promise<void> {
  const current = await readSetup(db, operatorId);
  if (!current.owner) throw new RecordError(403, 'Only the workspace owner can finish setup.');
  if (current.complete) return;
  const settings = new SettingsRepository(db);
  const { workspace, stages } = await settings.read() as unknown as { workspace: Record<string, unknown>; stages: { id: string; name: string }[] };
  await settings.update({
    name: input.name, timezone: input.timezone, currency: input.currency,
    workingHours: JSON.parse(String(workspace.working_hours_json)),
    staleIntervalDays: Number(workspace.stale_interval_days),
    awaitingResponseWorkingDays: Number(workspace.awaiting_response_working_days),
    freeMailDomains: JSON.parse(String(workspace.free_mail_domains_json)),
  }, operatorId);
  const unused = [...stages];
  await settings.stages(input.stages.map((name) => {
    const index = unused.findIndex((stage) => stage.name === name);
    return index === -1 ? { name } : { id: unused.splice(index, 1)[0]!.id, name };
  }), operatorId);
  // The owner's own name replaces the stand-in "Owner" on deals, timelines and the welcome. A name is not
  // authority, so updated_at (the session authority version) stays and the owner stays signed in.
  if (input.ownerName) await db.prepare('UPDATE operators SET display_name=? WHERE id=?').bind(input.ownerName, operatorId).run();
  if (input.brandColor) {
    const business = orbitBusinessSettings({ DB: db });
    if (input.brandColor !== await business.resolve('brand_color', firstBuildAccent)) {
      await business.setOverride('brand_color', input.brandColor, operatorId);
    }
  }
  await db.prepare("INSERT OR IGNORE INTO first_run_setup (id, completed_at) VALUES ('workspace', ?)").bind(new Date().toISOString()).run();
}
