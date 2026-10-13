import type { Clock } from "../../platform/clock";
import { toIsoString } from "../../shared/time";

import { SignalsRepository } from "./repository";

export class SignalsService {
  constructor(
    private readonly repository: SignalsRepository,
    private readonly clock: Clock
  ) {}

  async ensureSource(input: Omit<Parameters<SignalsRepository["ensureSource"]>[0], "now">): Promise<void> {
    await this.repository.ensureSource({ ...input, now: toIsoString(this.clock.now()) });
  }

  async recordSignal(input: Omit<Parameters<SignalsRepository["recordSignal"]>[0], "now">): Promise<void> {
    await this.repository.recordSignal({ ...input, now: toIsoString(this.clock.now()) });
  }

  async ensureLink(input: Parameters<SignalsRepository["ensureLink"]>[0]): Promise<void> {
    await this.repository.ensureLink(input);
  }

  async listOpportunitySignals(opportunityId: string) {
    return this.repository.listOpportunitySignals(opportunityId);
  }
}
