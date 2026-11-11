import assert from 'node:assert/strict';
import {isolatedDatabase} from './isolated-database';
import {agentErasureStatements} from '../../src/base/modules/agent-door/index.ts';
import {contactAgentArtifacts} from '../../src/core/features/agent-door/erasure';
import {redactionStatements} from '@runeditrun/rer/modules/portability/journal';

// An email subject selects agent records that name exactly that address, never another person's
// address that merely ends with it: erasing al@example.com leaves sal@example.com's work untouched.
export async function agentErasureMatcherProof() {
  const fixture = await isolatedDatabase(), db = fixture.db;
  try {
    const now = Date.now();
    for (const [id, email] of [['decision-al', 'al@example.com'], ['decision-sal', 'sal@example.com']] as const) {
      await db.batch([
        db.prepare("INSERT INTO agent_door_calls(agent,key,digest,decision_id,created_at,state,outcome,expires_at) VALUES('agent',?,'digest',?,?,'done',?,?)")
          .bind('key-' + id, id, now, JSON.stringify({summary: 'Sent a note to ' + email + '.'}), now + 86_400_000),
        db.prepare("INSERT INTO agent_door_audit(id,at,agent,classes,row,evidence) VALUES(?,?,'agent','[]',?,?)")
          .bind(id, new Date(now).toISOString(), JSON.stringify({decision_id: null, tool: 'orbit.contacts.write'}), JSON.stringify({recipient: email})),
      ]);
    }
    const before = (id: string) => db.prepare('SELECT * FROM agent_door_calls WHERE decision_id=?').bind(id).first();
    const sal = {call: await before('decision-sal'), audit: await db.prepare("SELECT * FROM agent_door_audit WHERE id='decision-sal'").first()};
    await db.batch(await agentErasureStatements({db, map: contactAgentArtifacts, secret: 'x'.repeat(40), subject: {values: JSON.stringify(['al@example.com'])},
      tombstone: {erasure_id: 'erasure-al', at: new Date(now).toISOString()}, checkpoint: () => redactionStatements(db)}));
    assert.deepEqual({call: await before('decision-sal'), audit: await db.prepare("SELECT * FROM agent_door_audit WHERE id='decision-sal'").first()}, sal, 'the other person\'s records are untouched');
    const erased = await before('decision-al') as {outcome: string};
    assert.ok(!erased.outcome.includes('al@example.com') && erased.outcome.includes('subject_erased'), 'the erased person\'s own record is redacted');
    assert.equal((await db.prepare("SELECT evidence FROM agent_door_audit WHERE id='decision-al'").first<string>('evidence')), null);
  } finally { await fixture.close(); }
}
