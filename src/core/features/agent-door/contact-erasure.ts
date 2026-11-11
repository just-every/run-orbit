import { agentErasureStatements, type Tombstone } from '../../../base/modules/agent-door/index.ts';
import { redactionStatements } from '@runeditrun/rer/modules/portability/journal';
import { createId } from '../../shared/ids';
import { contactAgentArtifacts } from './erasure';

/**
 * Statements for the contact-erasure batch that redact what the agent door recorded about the contact:
 * held calls and approvals that saved their values, call outcomes, audit and events. The subject is the
 * contact's native id and its exact addresses; each matches only as a whole token (al@example.com never
 * selects sal@example.com). The replay secret is the installation's SESSION_SECRET, the same one the door
 * uses, so a retried call for an erased contact answers `subject_erased` instead of creating it again.
 */
export async function contactAgentErasureStatements(db: D1Database, secret: string | undefined, contactId: string, identities: string[]): Promise<D1PreparedStatement[]> {
  const tombstone: Tombstone = { erasure_id: createId(), at: new Date().toISOString() };
  const statements = await agentErasureStatements({
    db, map: contactAgentArtifacts, secret: secret ?? '', subject: { values: JSON.stringify([contactId, ...identities]) },
    tombstone, checkpoint: () => redactionStatements(db),
  });
  // Base keeps a redacted event's row id, but Orbit's own timeline trigger builds that id from the contact's id
  // (`<timeline entry>:contact:<contact id>`). Run after Base's guarded redaction; the sequence keeps ids unique and
  // the row keeps its place in the feed. A cursor that still holds the old id resolves to this row (event-cursor.ts).
  statements.push(db.prepare("UPDATE agent_door_events SET id=replace(id,?1,'erased-'||sequence),event=json_set(event,'$.id',replace(id,?1,'erased-'||sequence)) WHERE instr(id,?1)>0").bind(contactId));
  return statements;
}
