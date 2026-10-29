import {draftRecordLinks} from '../outreach/record-mail-links';
import {draftMailDatabase,recordMailDatabase} from '../outreach/record-mail-storage';
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import { drafts } from "../../platform/schema";

export class DraftsRepository {
  constructor(private readonly binding: D1Database) {}

  async ensureDraft(input: {
    id: string;
    opportunityId: string;
    recommendationId: string | null;
    authorId: string;
    recipientContactId: string | null;
    recipientEmail: string;
    subject: string;
    body: string;
    revision: number;
    isStale: boolean;
    staleReason: string | null;
    now: string;
  }): Promise<void> {
    await drizzle(this.binding)
      .insert(drafts)
      .values({ ...input, createdAt: input.now, updatedAt: input.now })
      .onConflictDoNothing();
  }

  async findDraft(id: string) {
    const draft=(await drizzle(await draftMailDatabase(this.binding,id)).select().from(drafts).where(eq(drafts.id, id)).limit(1))[0];
    if(!draft)return undefined;
    // The native creation event retains the agent preparer separately from the
    // sponsoring operator ID used by the draft's permissions and relationships.
    const attribution=await this.binding.prepare("SELECT json_extract(a.actor,'$.label') AS label FROM timeline_entries t JOIN orbit_native_attribution a ON a.table_name='timeline_entries' AND a.id=t.id WHERE t.kind='draft.created' AND json_extract(t.payload_json,'$.draftId')=? AND json_extract(a.actor,'$.for.id')=? ORDER BY t.recorded_at,t.id LIMIT 1").bind(id,draft.authorId).first<{label:string}>();
    return {...draft,...(attribution?{authorLabel:attribution.label}:{})};
  }

  async listOpportunityDrafts(opportunityId: string) {
    const rows=await Promise.all([this.binding,recordMailDatabase(this.binding)].map(binding=>drizzle(binding)
      .select().from(drafts).where(eq(drafts.opportunityId,opportunityId))
      .orderBy(desc(drafts.updatedAt),desc(drafts.id))));
    return rows.flat().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||b.id.localeCompare(a.id));
  }

  async hasOpportunity(opportunityId: string): Promise<boolean> {
    return Boolean(await this.binding.prepare('SELECT id FROM opportunities WHERE id=?').bind(opportunityId).first());
  }

  async updateWithRevision(input: {
    id: string;
    expectedRevision: number;
    recipientEmail: string;
    subject: string;
    body: string;
    actorId: string;
    updatedAt: string;
    timelineEntryId: string;
    auditEntryId: string;
  }): Promise<boolean> {
    const binding=await draftMailDatabase(this.binding,input.id);
    const statements = [
      binding
        .prepare(
          "UPDATE drafts SET recipient_email = ?, subject = ?, body = ?, merge_review_json = NULL, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? AND is_stale = 0 AND NOT EXISTS (SELECT 1 FROM outbound_messages WHERE draft_id = drafts.id AND revision = drafts.revision)"
        )
        .bind(input.recipientEmail, input.subject, input.body, input.updatedAt, input.id, input.expectedRevision),
      binding
        .prepare(
          "INSERT INTO timeline_entries (id, kind, occurred_at, recorded_at, actor_type, actor_id, source, payload_json) SELECT ?, 'draft.updated', ?, ?, 'operator', ?, 'drafts', ? WHERE EXISTS (SELECT 1 FROM drafts WHERE id = ? AND revision = ? AND updated_at = ?)"
        )
        .bind(
          input.timelineEntryId,
          input.updatedAt,
          input.updatedAt,
          input.actorId,
          JSON.stringify({ draftId: input.id, revision: input.expectedRevision + 1 }),
          input.id,
          input.expectedRevision + 1,
          input.updatedAt
        ),
      binding
        .prepare(
          "INSERT INTO timeline_entry_records (timeline_entry_id, record_type, record_id) SELECT ?, 'opportunity', opportunity_id FROM drafts WHERE id = ? AND revision = ? AND updated_at = ? AND opportunity_id IS NOT NULL"
        )
        .bind(input.timelineEntryId, input.id, input.expectedRevision + 1, input.updatedAt),
      binding
        .prepare(
          "INSERT INTO audit_entries (id, actor_id, action, entity_type, entity_id, details_json, occurred_at) SELECT ?, ?, 'draft.updated', 'draft', ?, ?, ? WHERE EXISTS (SELECT 1 FROM drafts WHERE id = ? AND revision = ? AND updated_at = ?)"
        )
        .bind(
          input.auditEntryId,
          input.actorId,
          input.id,
          JSON.stringify({ revision: input.expectedRevision + 1 }),
          input.updatedAt,
          input.id,
          input.expectedRevision + 1,
          input.updatedAt
        )
    ];

    statements.push(...draftRecordLinks(binding,input.id,input.timelineEntryId));
    const [result] = await binding.batch(statements);
    return result.meta.changes === 1;
  }
}
