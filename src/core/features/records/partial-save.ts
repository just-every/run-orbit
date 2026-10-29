import type {RecordsRepository} from './repository';
import {RecordError, requireRecord, type RecordKind} from './shared';

/** The values a record page saves one at a time (custom:<key> names a custom field). The stage moves through its own
 * reviewed endpoint and a deal's company through its relationships, so neither is a plain value here. */
const editable: Record<RecordKind, readonly string[]> = {
 contact: ['name', 'email', 'phone', 'job_title', 'timezone', 'company_id', 'contactability'],
 company: ['name', 'primary_domain'],
 opportunity: ['title', 'owner_id', 'value_cents', 'expected_close_at'],
};
const refusals: Record<string, string> = {
 stage_id: 'Choose the stage with the Stage field, which moves the deal and checks the fields its stage requires.',
 company_id: 'Choose the deal company under People, where its relationships are recorded.',
};
/** A row's own columns that an ordinary save takes back whole. */
const columns: Record<RecordKind, readonly string[]> = {
 contact: editable.contact,
 company: editable.company,
 opportunity: ['title', 'stage_id', 'owner_id', 'company_id', 'value_cents', 'expected_close_at'],
};

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export type PartialSave = {conflict: false; id: string; changed: boolean; record: Record<string, any>} | {conflict: true; record: Record<string, any>; changedBy: string | null; fields: string[]};

/** PATCH /records/<kind>/<id>: saves the changed values on the record as it stands, through the ordinary save, so
 * validation, identity keys, one Timeline line per field, re-scoring and stale drafts are those of any edit. A value
 * that no longer holds the base it was changed from is a conflict, unless it already holds the change itself. */
export async function partialSave(repo: RecordsRepository, kind: RecordKind, id: string, changes: Record<string, unknown>, base: Record<string, unknown>, actor: string): Promise<PartialSave> {
 const fields = Object.keys(changes);
 if (!fields.length) throw new RecordError(400, 'Send at least one changed value.');
 for (const field of fields) {
  if (kind === 'opportunity' && refusals[field]) throw new RecordError(400, refusals[field]!);
  if (!field.startsWith('custom:') && !editable[kind].includes(field)) throw new RecordError(400, `This page cannot change ${field.replaceAll('_', ' ')}.`);
  if (field.startsWith('custom:') && !field.slice(7).trim()) throw new RecordError(400, 'Name the custom field.');
 }
 const row = await requireRecord(repo.db, kind, id), custom = JSON.parse(row.custom_fields_json ?? '{}') as Record<string, unknown>;
 const current = (field: string) => field.startsWith('custom:') ? custom[field.slice(7)] : row[field];
 const conflicts = fields.filter(field => Object.hasOwn(base, field) && !same(current(field), base[field]) && !same(current(field), changes[field]));
 if (conflicts.length) return {conflict: true, record: row, changedBy: await lastEditor(repo.db, kind, id), fields: conflicts};
 const input: Record<string, unknown> = Object.fromEntries(columns[kind].map(column => [column, row[column] ?? null]));
 const customFields = {...custom};
 for (const field of fields) {
  if (field.startsWith('custom:')) customFields[field.slice(7)] = changes[field] as string | number | boolean | null;
  else input[field] = changes[field];
 }
 input.custom_fields = customFields;
 const saved = await repo.save(kind, input, actor, id, {ordinaryEdit: true});
 return {conflict: false, id, changed: saved.changed, record: await requireRecord(repo.db, kind, id)};
}

/** Who saved this record last, to name them when their change meets yours. */
async function lastEditor(db: D1Database, kind: RecordKind, id: string) {
 const row = await db.prepare(`SELECT o.display_name AS name FROM audit_entries a JOIN operators o ON o.id=a.actor_id WHERE a.entity_type=? AND a.entity_id=? AND a.action='record.updated' ORDER BY a.occurred_at DESC LIMIT 1`).bind(kind, id).first<{name: string}>();
 return row?.name ?? null;
}
