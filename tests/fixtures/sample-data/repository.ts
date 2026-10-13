import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { sampleSeedRuns } from "../../../src/core/platform/schema";

export class SampleDataRepository {
  constructor(private readonly binding: D1Database) {}

  async hasRun(version: string): Promise<boolean> {
    const row = await drizzle(this.binding)
      .select({ version: sampleSeedRuns.version })
      .from(sampleSeedRuns)
      .where(eq(sampleSeedRuns.version, version))
      .limit(1);
    return row.length === 1;
  }

  async markRun(version: string, appliedAt: string): Promise<void> {
    await drizzle(this.binding).insert(sampleSeedRuns).values({ version, appliedAt }).onConflictDoNothing();
  }
}
