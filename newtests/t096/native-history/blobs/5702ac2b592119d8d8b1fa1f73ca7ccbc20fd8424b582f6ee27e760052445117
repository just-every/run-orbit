import { sql } from 'drizzle-orm';
import { privacyMatcher, suppressionPredicate, suppressionProof } from './suppression';
import { contactSeedContextFence, contactSeedGeneration } from './seed-generation';
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { companies, contacts, opportunities, opportunityContacts } from "../../platform/schema";

export class RecordSeedRepository {
  constructor(private readonly binding: D1Database) {}

  async ensureCompany(input: {
    id: string;
    name: string;
    primaryDomain: string | null;
    primaryDomainKey: string | null;
    now: string;
  }): Promise<void> {
    await drizzle(this.binding)
      .insert(companies)
      .values({ ...input, createdAt: input.now, updatedAt: input.now })
      .onConflictDoNothing();
  }

  async ensureContact(input: {
    id: string;
    companyId: string | null;
    name: string | null;
    email: string | null;
    emailKey: string | null;
    phone: string | null;
    jobTitle: string | null;
    timezone: string | null;
    contactability: "contactable" | "do_not_contact";
    now: string;
  }): Promise<void> {
    const generation = await contactSeedGeneration(this.binding);
    if (generation.legacy) {
      const query = drizzle(this.binding).insert(contacts)
        .values({ ...input, createdAt: input.now, updatedAt: input.now })
        .onConflictDoNothing().toSQL();
      await this.binding.batch([generation.fence, this.binding.prepare(query.sql).bind(...query.params)]);
      return;
    }
    const tokens = await (await privacyMatcher(this.binding))(input.email);
    const query = drizzle(this.binding).insert(contacts).values({
      ...input,
      contactability: sql`CASE WHEN ${sql.raw(suppressionPredicate(tokens))} THEN 'do_not_contact' ELSE ${input.contactability} END`,
      createdAt: input.now,
      updatedAt: input.now
    }).onConflictDoNothing().toSQL();
    await this.binding.batch([
      generation.fence,
      ...contactSeedContextFence(this.binding, tokens),
      ...(input.contactability === 'do_not_contact' ? tokens.map(token => suppressionProof(this.binding, token)) : []),
      this.binding.prepare(query.sql).bind(...query.params)
    ]);
  }

  async ensureOpportunity(input: {
    id: string;
    title: string;
    lifecycle: "open" | "won" | "lost";
    stageId: string;
    ownerId: string | null;
    companyId: string | null;
    valueCents: number;
    expectedCloseAt: string | null;
    score: number;
    band: "low" | "medium" | "high";
    queueState: "now" | "next" | "none";
    queueReason: string | null;
    lastContributingSignalAt: string | null;
    now: string;
  }): Promise<void> {
    await drizzle(this.binding)
      .insert(opportunities)
      .values({ ...input, createdAt: input.now, updatedAt: input.now })
      .onConflictDoNothing();
  }

  async ensureOpportunityContact(input: {
    opportunityId: string;
    contactId: string;
    isPrimary: boolean;
    now: string;
  }): Promise<void> {
    await drizzle(this.binding)
      .insert(opportunityContacts)
      .values({
        opportunityId: input.opportunityId,
        contactId: input.contactId,
        isPrimary: input.isPrimary,
        createdAt: input.now
      })
      .onConflictDoNothing();
  }

  async relationshipKeys(contactId: string, opportunityId: string) {
    const [contact, opportunity] = await Promise.all([
      this.binding.prepare("SELECT id FROM contacts WHERE id = ?").bind(contactId).first<{ id: string }>(),
      this.binding.prepare("SELECT id FROM opportunities WHERE id = ?").bind(opportunityId).first<{ id: string }>()
    ]);
    return { contactIds: new Set(contact ? [contact.id] : []), opportunityIds: new Set(opportunity ? [opportunity.id] : []) };
  }

  async listOpportunityContacts(opportunityId: string) {
    return drizzle(this.binding)
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        jobTitle: contacts.jobTitle,
        contactability: contacts.contactability,
        isPrimary: opportunityContacts.isPrimary
      })
      .from(opportunityContacts)
      .innerJoin(contacts, eq(opportunityContacts.contactId, contacts.id))
      .where(eq(opportunityContacts.opportunityId, opportunityId));
  }
}
