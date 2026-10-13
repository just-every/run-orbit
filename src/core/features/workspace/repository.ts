import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { pipelineStages, workspaceSettings } from "../../platform/schema";

export class WorkspaceRepository {
  constructor(private readonly binding: D1Database) {}

  async ensureSettings(input: {
    name: string;
    timezone: string;
    currency: string;
    workingHoursJson: string;
    staleIntervalDays: number;
    awaitingResponseWorkingDays: number;
    freeMailDomainsJson: string;
    now: string;
  }): Promise<void> {
    await drizzle(this.binding)
      .insert(workspaceSettings)
      .values({ id: "workspace", ...input, createdAt: input.now, updatedAt: input.now })
      .onConflictDoNothing();
    // An established workspace has finished first-run setup (from the schema that records it).
    if (await this.binding.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'first_run_setup'").first())
      await this.binding.prepare("INSERT OR IGNORE INTO first_run_setup (id, completed_at) VALUES ('workspace', ?)").bind(input.now).run();
  }

  async ensureStage(input: { id: string; name: string; position: number; now: string }): Promise<void> {
    await drizzle(this.binding)
      .insert(pipelineStages)
      .values({ ...input, createdAt: input.now, updatedAt: input.now })
      .onConflictDoNothing();
  }

  async findSettings() {
    return (await drizzle(this.binding).select().from(workspaceSettings).where(eq(workspaceSettings.id, "workspace")).limit(1))[0];
  }

  async listStages() {
    return drizzle(this.binding).select().from(pipelineStages).orderBy(asc(pipelineStages.position));
  }
}
