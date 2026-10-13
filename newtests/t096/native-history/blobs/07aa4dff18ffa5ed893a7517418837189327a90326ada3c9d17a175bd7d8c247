import { TimelineRepository } from "./repository";

export class TimelineService {
  constructor(private readonly repository: TimelineRepository) {}

  async ensureEntry(input: Parameters<TimelineRepository["ensureEntry"]>[0]): Promise<void> {
    await this.repository.ensureEntry(input);
  }

  async ensureRecord(input: Parameters<TimelineRepository["ensureRecord"]>[0]): Promise<void> {
    await this.repository.ensureRecord(input);
  }

  async listOpportunityEntries(opportunityId: string) {
    const entries = await this.repository.listOpportunityEntries(opportunityId);
    return entries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      occurredAt: entry.occurredAt,
      recordedAt: entry.recordedAt,
      actorType: entry.actorType,
      actorName: resolveActorName(entry),
      sourceName: humanizeIdentity(entry.source),
      payloadJson: entry.payloadJson
    }));
  }
}

function resolveActorName(entry: {
  actorType: string;
  operatorName: string | null;
  signalSourceName: string | null;
  source: string;
}): string {
  if (entry.actorType === "operator") {
    if (!entry.operatorName) throw new Error("Timeline operator actor is missing.");
    return entry.operatorName;
  }
  if (entry.actorType === "source") {
    if (!entry.signalSourceName) throw new Error("Timeline signal source actor is missing.");
    return entry.signalSourceName;
  }
  if (entry.actorType === "feature") return humanizeIdentity(entry.source);
  throw new Error(`Unsupported timeline actor type: ${entry.actorType}`);
}

function humanizeIdentity(value: string): string {
  return value
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
