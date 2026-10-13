import { drizzle } from "drizzle-orm/d1";

import { auditEntries } from "../../platform/schema";

export class AuditRepository {
  constructor(private readonly binding: D1Database) {}

  async ensureEntry(input: {
    id: string;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    detailsJson: string;
    occurredAt: string;
  }): Promise<void> {
    await drizzle(this.binding).insert(auditEntries).values(input).onConflictDoNothing();
  }
}
