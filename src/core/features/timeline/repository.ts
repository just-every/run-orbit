import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { operators, signalSources, timelineEntries, timelineEntryRecords } from "../../platform/schema";

export class TimelineRepository {
  constructor(private readonly binding: D1Database) {}

  async ensureEntry(input: {
    id: string;
    kind: string;
    occurredAt: string;
    recordedAt: string;
    actorType: string;
    actorId: string | null;
    source: string;
    payloadJson: string;
  }): Promise<void> {
    await drizzle(this.binding).insert(timelineEntries).values(input).onConflictDoNothing();
  }

  async ensureRecord(input: {
    timelineEntryId: string;
    recordType: "contact" | "company" | "opportunity";
    recordId: string;
  }): Promise<void> {
    await drizzle(this.binding).insert(timelineEntryRecords).values(input).onConflictDoNothing();
  }

  async listOpportunityEntries(opportunityId: string) {
    return drizzle(this.binding)
      .select({
        id: timelineEntries.id,
        kind: timelineEntries.kind,
        occurredAt: timelineEntries.occurredAt,
        recordedAt: timelineEntries.recordedAt,
        actorType: timelineEntries.actorType,
        source: timelineEntries.source,
        operatorName: sql<string | null>`CASE WHEN ${timelineEntries.actorType}='agent' THEN json_extract(${timelineEntries.payloadJson},'$.preparedBy.label') ELSE ${operators.displayName} END`,
        signalSourceName: signalSources.name,
        payloadJson: timelineEntries.payloadJson
      })
      .from(timelineEntryRecords)
      .innerJoin(timelineEntries, eq(timelineEntryRecords.timelineEntryId, timelineEntries.id))
      .leftJoin(
        operators,
        and(eq(timelineEntries.actorType, "operator"), eq(timelineEntries.actorId, operators.id))
      )
      .leftJoin(
        signalSources,
        and(eq(timelineEntries.actorType, "source"), eq(timelineEntries.actorId, signalSources.id))
      )
      .where(and(eq(timelineEntryRecords.recordType, "opportunity"), eq(timelineEntryRecords.recordId, opportunityId)))
      .orderBy(desc(timelineEntries.occurredAt), asc(timelineEntries.id));
  }
}
