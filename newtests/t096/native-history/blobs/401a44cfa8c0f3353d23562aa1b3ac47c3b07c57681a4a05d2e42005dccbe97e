import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { signalLinks, signalSources, signals } from "../../platform/schema";

export class SignalsRepository {
  constructor(private readonly binding: D1Database) {}

  async ensureSource(input: { id: string; name: string; type: string; enabled: boolean; now: string }): Promise<void> {
    await drizzle(this.binding)
      .insert(signalSources)
      .values({ ...input, createdAt: input.now, updatedAt: input.now })
      .onConflictDoNothing();
  }

  async recordSignal(input: {
    id: string;
    sourceId: string;
    sourceEventId: string;
    type: string;
    subject: string | null;
    occurredAt: string;
    receivedAt: string;
    payloadHash: string;
    confidence: "observed" | "inferred";
    linkingBasis: string;
    now: string;
  }): Promise<void> {
    await drizzle(this.binding)
      .insert(signals)
      .values({ ...input, createdAt: input.now })
      .onConflictDoNothing();
  }

  async ensureLink(input: {
    signalId: string;
    recordType: "contact" | "company" | "opportunity";
    recordId: string;
    linkingBasis: string;
    linkedAt: string;
  }): Promise<void> {
    await drizzle(this.binding).insert(signalLinks).values(input).onConflictDoNothing();
  }

  async listOpportunitySignals(opportunityId: string) {
    return drizzle(this.binding)
      .select({
        id: signals.id,
        type: signals.type,
        subject: signals.subject,
        occurredAt: signals.occurredAt,
        receivedAt: signals.receivedAt,
        confidence: signals.confidence,
        linkingBasis: signalLinks.linkingBasis,
        source: signalSources.name
      })
      .from(signalLinks)
      .innerJoin(signals, eq(signalLinks.signalId, signals.id))
      .innerJoin(signalSources, eq(signals.sourceId, signalSources.id))
      .where(and(eq(signalLinks.recordType, "opportunity"), eq(signalLinks.recordId, opportunityId)))
      .orderBy(desc(signals.occurredAt), asc(signals.id));
  }
}
