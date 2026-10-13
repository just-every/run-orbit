import type { Clock } from "../../platform/clock";
import { createId } from "../../shared/ids";
import { toIsoString } from "../../shared/time";

import { DraftsRepository } from "./repository";

export class DraftRevisionConflict extends Error {
  constructor() {
    super("The draft changed or is stale. Reload it before editing.");
  }
}

export class DraftsService {
  constructor(
    private readonly repository: DraftsRepository,
    private readonly clock: Clock
  ) {}

  async ensureDraft(input: Omit<Parameters<DraftsRepository["ensureDraft"]>[0], "now">): Promise<void> {
    await this.repository.ensureDraft({ ...input, now: toIsoString(this.clock.now()) });
  }

  async readDraft(id: string) {
    return this.repository.findDraft(id);
  }

  async listOpportunityDrafts(opportunityId: string) {
    return this.repository.listOpportunityDrafts(opportunityId);
  }

  async updateDraft(input: {
    id: string;
    expectedRevision: number;
    recipientEmail: string;
    subject: string;
    body: string;
    actorId: string;
  }) {
    const now = this.clock.now();
    const updated = await this.repository.updateWithRevision({
      ...input,
      updatedAt: toIsoString(now),
      timelineEntryId: createId(now.getTime()),
      auditEntryId: createId(now.getTime() + 1)
    });
    if (!updated) throw new DraftRevisionConflict();

    return this.repository.findDraft(input.id);
  }
}
