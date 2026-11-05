import { and, asc, desc, eq, sql } from "drizzle-orm";
import {customerSignalSql} from './test-events';
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

  async findOpportunityEvidence(opportunityId: string, signalId: string) {
    // Require the exact live deal link in the same read as the original evidence.
    return this.binding.prepare(`SELECT s.id,s.source_event_id AS sourceEventId,s.type,s.subject,
      s.occurred_at AS occurredAt,s.received_at AS receivedAt,s.confidence,
      l.linking_basis AS linkingBasis,ss.name AS source,CASE WHEN ci.signal_id IS NULL THEN s.payload_json END AS originalPayload,
      ci.headers AS originalHeaders,ci.body AS originalBody
      FROM signal_links l JOIN signals s ON s.id=l.signal_id
      JOIN signal_sources ss ON ss.id=s.source_id
      LEFT JOIN capture_items ci ON ci.signal_id=s.id
      WHERE l.record_type='opportunity' AND l.record_id=? AND s.id=?`)
      .bind(opportunityId, signalId).first<{
        id:string;sourceEventId:string;type:string;subject:string|null;occurredAt:string;
        receivedAt:string;confidence:string;linkingBasis:string;source:string;
        originalPayload:string|null;originalHeaders:string|null;originalBody:string|null;
      }>();
  }

  async listOpportunitySignals(opportunityId: string) {
    return drizzle(this.binding)
      .select({
        id: signals.id,
        type: signals.type,
        subject: signals.subject,
        occurredAt: signals.occurredAt,
        receivedAt: signals.receivedAt,
        confidence: sql<string>`CASE WHEN ${sql.raw(customerSignalSql('signals'))} THEN ${signals.confidence} ELSE 'test' END`,
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
