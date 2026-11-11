import { agentErasureStatements, operatorPolicyRefs } from '../../../base/modules/agent-door/index.ts';
import { redactionStatements } from '@runeditrun/rer/modules/portability/journal';
import { createId } from '../../shared/ids';
import { operatorAgentArtifacts } from './erasure';

/**
 * Statements for the operator-erasure batch that retire the person from the agent door's policy
 * references and from the Business-signed roster (bs_team, bs_settings.document, editor identities).
 * Orbit does not delete bs_* itself: Base's rule inside agentErasureStatements does. No agent call is
 * selected, so the replay-alias secret is never used; it only has to satisfy the length rule.
 */
export async function operatorRetirementStatements(db: D1Database, operatorId: string): Promise<D1PreparedStatement[]> {
  return agentErasureStatements({
    db, map: operatorAgentArtifacts, secret: crypto.randomUUID() + crypto.randomUUID(),
    subject: { policyRefs: JSON.stringify(await operatorPolicyRefs(db, operatorId)) },
    tombstone: { erasure_id: createId(), at: new Date().toISOString() },
    checkpoint: () => redactionStatements(db),
  });
}
