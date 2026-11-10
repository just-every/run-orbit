import type { AgentArtifactMap } from '../../../base/modules/agent-door/index.ts'

// The seed declares every table and column. ?1 holds native identifiers plus
// bounded text selectors, never caller SQL. JSON numbers and keys are metadata,
// not mentions. Source IDs and recorded names can be only one character long.
const sourceId = "CASE WHEN subject.type='object' THEN json_extract(subject.value,'$.sourceUserId') END"
const recordedName = "CASE WHEN subject.type='object' THEN json_extract(subject.value,'$.name') END"
const textValue = `coalesce((${sourceId}),(${recordedName}))`
const tokenCharacter = "'[A-Za-z0-9_@.+/:-]'"
// Preserve identifier/URI/version tokens. A sentence's final period delimits a
// name, but the period within version 1.0 or another token does not. Colons
// delimit recorded names while remaining part of source identifiers. Non-ASCII
// letters also continue a name; Unicode spaces/punctuation delimit it.
const boundary = (position: string, outward: number) => {
  const char = `substr(text,${position},1)`, next = `substr(text,(${position})+(${outward}),1)`
  return `(${char} NOT GLOB ${tokenCharacter} OR ((${recordedName}) IS NOT NULL AND (${char}=':' OR (${char}='.' AND ${next} NOT GLOB ${tokenCharacter}))))
    AND NOT ((${recordedName}) IS NOT NULL AND coalesce(unicode(${char}),0)>127 AND ${char} NOT GLOB '[\u00a0\u2000-\u206f\u2e00-\u2e7f\u3000-\u303f]')`
}
// Check every literal occurrence, including one after an embedded occurrence.
const textMention = (column: string) => `EXISTS(
  WITH RECURSIVE hits(text,source,pos) AS (
    SELECT content.value,(${textValue}),instr(content.value,(${textValue}))
    FROM json_tree(CASE WHEN json_valid(${column}) THEN ${column} ELSE json_quote(${column}) END) content
    WHERE content.type='text'
    UNION ALL
    SELECT text,source,pos+instr(substr(text,pos+1),source) FROM hits
    WHERE pos>0 AND instr(substr(text,pos+1),source)>0
  )
  SELECT 1 FROM hits WHERE pos>0
    AND ${boundary('pos-1', -1)}
    AND ${boundary('pos+length(source)', 1)}
)`
const mentions = (table: string, columns: string[]) => 'EXISTS(SELECT 1 FROM json_each(?1) subject WHERE ' + columns.map(name => {
  const column = table + '.' + name
  return "(subject.type='text' AND instr(CAST(" + column + " AS TEXT),CAST(subject.value AS TEXT))>0) OR (subject.type='object' AND (CAST(" + column + " AS TEXT)=(" + sourceId + ') OR ' + textMention(column) + '))'
}).join(' OR ') + ')'
const calls = mentions('agent_door_calls', ['key', 'outcome']), approvals = mentions('agent_door_approvals', ['saved', 'approvals', 'result']), reviews = mentions('agent_door_reviews', ['saved', 'marked_by']), audits = mentions('agent_door_audit', ['row', 'evidence'])
const decisions = "SELECT decision_id FROM agent_door_calls WHERE " + calls + " UNION SELECT json_extract(saved,'$.decision_id') FROM agent_door_approvals WHERE " + approvals + " UNION SELECT json_extract(saved,'$.decision_id') FROM agent_door_reviews WHERE " + reviews + " UNION SELECT id FROM agent_door_audit WHERE " + audits
const match = (sql: string) => ({ sql, params: ['values'] })
export const contactAgentArtifacts: AgentArtifactMap = { artifacts: [
  { table: 'agent_door_relay', columns: ['sequence','decision_id','business'], unrelated: 'Value-free decision ids and installation Business id only; projections are computed from the erasure-aware audit.' },
  { table: 'agent_door_state', columns: ['id','envelope','local_document','local_revision','local_paused','decision_lock','decision_until'], unrelated: 'Installation policy and admission leases; customer subjects are not policy principals.' },
  { table: 'agent_door_agents', columns: ['id','name','specialist','sponsor','sponsor_name','revoked','window','requests','tombstone'], unrelated: 'Non-person agent identities and native operator sponsors; customer subjects are not operators.' },
  { table: 'agent_door_calls', columns: ['agent','key','digest','decision_id','created_at','state','outcome','expires_at'], match: match('decision_id IN (' + decisions + ')') },
  { table: 'agent_door_audit', columns: ['sequence','id','at','agent','classes','row','evidence'], match: match('id IN (' + decisions + ') OR json_extract(row,\'$.decision_id\') IN (' + decisions + ') OR json_extract(row,\'$.replay_of\') IN (' + decisions + ')') },
  { table: 'agent_door_approvals', columns: ['id','state','saved','approvals','result','version'], match: match('json_extract(saved,\'$.decision_id\') IN (' + decisions + ') OR ' + approvals) },
  { table: 'agent_door_reviews', columns: ['id','state','saved','marked_by','marked_at'], match: match('json_extract(saved,\'$.decision_id\') IN (' + decisions + ') OR ' + reviews) },
  { table: 'agent_door_events', columns: ['sequence','id','uri','event'], match: match(mentions('agent_door_events', ['uri','event']) + ' OR json_extract(event,\'$.decision_id\') IN (' + decisions + ')') },
  { table: 'agent_door_usage', columns: ['decision_id','at','seed','specialist','agent','classes'], match: match('decision_id IN (' + decisions + ')') },
  { table: 'agent_door_retired_refs', columns: ['digest','marker'], unrelated: 'Value-free suppression digests and erasure markers; empty until Orbit declares operator retirement, and excluded from the version 2 archive, which is full at 100 tables.' },
  { table: 'agent_door_replay_aliases', columns: ['agent','alias','call_id','tombstone'], unrelated: 'Installation-private, value-free replay aliases; excluded from archives and exports.' },
] }

// Business holds only external decision projections. Tombstone pulls purge personal
// projections; authority loss, stop and unreachable rules govern its custody (W-r1–W-r5).
