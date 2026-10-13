import type { Clock } from "../../platform/clock";
import { toIsoString } from "../../shared/time";

import { WorkspaceRepository } from "./repository";

export class WorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly clock: Clock
  ) {}

  async ensureWorkspace(input: {
    name: string;
    timezone: string;
    currency: string;
    workingHours: unknown;
    staleIntervalDays: number;
    awaitingResponseWorkingDays: number;
    freeMailDomains: string[];
  }): Promise<void> {
    const now = toIsoString(this.clock.now());
    await this.repository.ensureSettings({
      ...input,
      workingHoursJson: JSON.stringify(input.workingHours),
      freeMailDomainsJson: JSON.stringify(input.freeMailDomains),
      now
    });
  }

  async ensurePipelineStage(input: { id: string; name: string; position: number }): Promise<void> {
    await this.repository.ensureStage({ ...input, now: toIsoString(this.clock.now()) });
  }

  async readPresentation() {
    const settings = await this.repository.findSettings();
    return settings
      ? { currency: settings.currency, name: settings.name, timezone: settings.timezone }
      : undefined;
  }
}
