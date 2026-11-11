import { agentErasureStatements, operatorPolicyRefs, type Tombstone } from '../../../base/modules/agent-door/index.ts';
import { redactionStatements } from '@runeditrun/rer/modules/portability/journal';
import { operatorAgentArtifacts } from './erasure';

/**
 * Statements for the operator-erasure batch. They redact what the agent door recorded about the person
 * (the agents they sponsor, the decisions, approvals, reviews and events that name them) and retire them
 * from the door's policy references and from the Business-signed roster (bs_team, bs_settings.document,
 * editor identities). Orbit does not delete bs_* itself: Base's rule inside agentErasureStatements does.
 * The tombstone ties every redacted record and retirement marker back to the `operator.erased` audit entry.
 */
export async function operatorRetirementStatements(db: D1Database, operatorId: string, secret: string | undefined, tombstone: Tombstone): Promise<D1PreparedStatement[]> {
  return agentErasureStatements({
    db, map: operatorAgentArtifacts, secret: secret ?? '',
    subject: { values: JSON.stringify([operatorId]), policyRefs: JSON.stringify(await operatorPolicyRefs(db, operatorId)) },
    tombstone, checkpoint: () => redactionStatements(db),
  });
}
