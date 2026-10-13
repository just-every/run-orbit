import { contactEmailKey } from "./identity";
import { assertCommercialRelationship } from "../../../family/sales/relationships";
import type { Clock } from "../../platform/clock";
import { toIsoString } from "../../shared/time";

import { RecordsRepository } from "./repository";

export class RecordsService {
  constructor(
    private readonly repository: RecordsRepository,
    private readonly clock: Clock
  ) {}

  async ensureCompany(input: Omit<Parameters<RecordsRepository["ensureCompany"]>[0], "now">): Promise<void> {
    await this.repository.ensureCompany({ ...input, now: toIsoString(this.clock.now()) });
  }

  async ensureContact(input: Omit<Parameters<RecordsRepository["ensureContact"]>[0], "now">): Promise<void> {
    await this.repository.ensureContact({ ...input, email: input.email?.trim().toLowerCase()??null, emailKey: contactEmailKey(input.email), now: toIsoString(this.clock.now()) });
  }

  async ensureOpportunity(input: Omit<Parameters<RecordsRepository["ensureOpportunity"]>[0], "now">): Promise<void> {
    await this.repository.ensureOpportunity({ ...input, now: toIsoString(this.clock.now()) });
  }

  async ensureOpportunityContact(
    input: Omit<Parameters<RecordsRepository["ensureOpportunityContact"]>[0], "now">
  ): Promise<void> {
    const existing = await this.repository.relationshipKeys(input.contactId, input.opportunityId);
    assertCommercialRelationship(input, existing);
    await this.repository.ensureOpportunityContact({ ...input, now: toIsoString(this.clock.now()) });
  }

  async listOpportunityContacts(opportunityId: string) {
    return this.repository.listOpportunityContacts(opportunityId);
  }
}
