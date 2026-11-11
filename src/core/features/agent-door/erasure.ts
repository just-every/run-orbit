import type { AgentArtifactMap } from '../../../base/modules/agent-door/index.ts'

// The seed declares every table and column. ?1 holds native identifiers plus
// bounded text selectors, never caller SQL. JSON numbers and keys are metadata,
// not mentions. Source IDs and recorded names can be only one character long.
// A text selector (an email or identifier) matches only as a whole token, so
// erasing al@example.com never selects another person's sal@example.com.
const sourceId = "CASE WHEN subject.type='object' THEN json_extract(subject.value,'$.sourceUserId') END"
const recordedName = "CASE WHEN subject.type='object' THEN json_extract(subject.value,'$.name') END"
const textValue = `CASE WHEN subject.type='text' THEN CAST(subject.value AS TEXT) ELSE coalesce((${sourceId}),(${recordedName})) END`
const strictTokenCharacter = "'[A-Za-z0-9_@.+/:-]'"
const separatorTokenCharacter = "'[A-Za-z0-9_@.+-]'"
const minimumSeparatorLength = 8
const tokenCharacter = `CASE WHEN length((${textValue}))<${minimumSeparatorLength} AND instr((${textValue}),'@')=0 THEN ${strictTokenCharacter} ELSE ${separatorTokenCharacter} END`
// Short identifiers preserve URI/version tokens; longer IDs and emails can
// occur in path segments. A period delimits a sentence when its outward
// neighbor is not an identifier character. Recorded names also delimit at
// colons. Non-ASCII letters continue names; Unicode punctuation does not.
const boundary = (position: string, outward: number) => {
  const char = `substr(text,${position},1)`, next = `substr(text,(${position})+(${outward}),1)`
  return `(${char} NOT GLOB token OR (${char}='.' AND ${next} NOT GLOB token) OR (named AND ${char}=':'))
    AND NOT (named AND coalesce(unicode(${char}),0)>127 AND ${char} NOT GLOB '[\u00a0\u2000-\u206f\u2e00-\u2e7f\u3000-\u303f]')`
}
// Search decoded string values, never JSON keys or numbers. Seed recursion
// only with literal hits and carry selector facts through subsequent hits.
// A bounded occurrence can follow an embedded one in the same string.
const textMention = (column: string) => `EXISTS(
  WITH RECURSIVE hits(text,source,pos,token,named) AS (
    SELECT content.value,(${textValue}),instr(content.value,(${textValue})),(${tokenCharacter}),(${recordedName}) IS NOT NULL
    FROM json_tree(CASE WHEN json_valid(${column}) THEN ${column} ELSE json_quote(${column}) END) content
    WHERE content.type='text' AND instr(content.value,(${textValue}))>0
    UNION ALL
    SELECT text,source,pos+instr(substr(text,pos+1),source),token,named FROM hits
    WHERE pos>0 AND instr(substr(text,pos+1),source)>0
  )
  SELECT 1 FROM hits WHERE pos>0
    AND ${boundary('pos-1', -1)}
    AND ${boundary('pos+length(source)', 1)}
)`
const mentions = (table: string, columns: string[]) => 'EXISTS(SELECT 1 FROM json_each(?1) subject WHERE ' + columns.map(name => {
  const column = table + '.' + name
  return "((subject.type='text' OR subject.type='object') AND (CAST(" + column + " AS TEXT)=(" + sourceId + ') OR ' + textMention(column) + '))'
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
  { table: 'agent_door_retired_refs', columns: ['digest','marker'], unrelated: 'Value-free suppression digests and erasure markers; excluded from the version 2 archive, which is full at 100 tables, as every agent-door table is.' },
  { table: 'agent_door_replay_aliases', columns: ['agent','alias','call_id','tombstone'], unrelated: 'Installation-private, value-free replay aliases; excluded from archives and exports.' },
] }

// Business holds only external decision projections. Tombstone pulls purge personal
// projections; authority loss, stop and unreachable rules govern its custody (W-r1–W-r5).

// Erasing an operator retires their policy references and, with them, their Business roster entry
// (Base's rule inside agentErasureStatements). It selects no agent record by value: attributed agent
// records keep Orbit's existing operator-erasure behaviour, so every selection here is empty. The
// subject carries `policyRefs`, the JSON list `operatorPolicyRefs` returns for the erased operator.
export const operatorAgentArtifacts: AgentArtifactMap = { artifacts: contactAgentArtifacts.artifacts.map(item => item.table === 'agent_door_state'
  ? { table: item.table, columns: item.columns, retire: { refs: 'policyRefs' } }
  : item.match ? { table: item.table, columns: item.columns, match: { sql: '0', params: [] } } : item) }
