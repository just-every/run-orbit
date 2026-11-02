import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Fixture for the README journey's archive: one captured .eml (through the Capture upload door) and Slack
// definitions plus provenance, with the bot token and action capability rows that must never travel.
const execute = promisify(execFile);
const credential = 'synthetic-orbit-slack-bot-ciphertext', actionToken = 'synthetic-orbit-action-token';
const eml = ['From: "Ada Lovelace" <ada@northwind.example>', 'To: Owner <owner@example.test>', 'Subject: Re: Freight proposal', 'Date: Mon, 02 Nov 2026 09:00:00 +0000',
  'Message-ID: <synthetic-orbit-1@northwind.example>', 'Content-Type: text/plain; charset=utf-8', '', 'Thanks, this looks right. Can we talk on Tuesday?'].join('\r\n');

/** Upload one message to the running installation as the signed-in operator. */
export async function captureMail(operator, origin) {
  const response = await operator.context().request.post(`${origin}/api/v1/capture/imports`, { headers: { Origin: origin },
    multipart: { files: { name: 'reply.eml', mimeType: 'message/rfc822', buffer: Buffer.from(eml) }, includeUnknown: 'on' } });
  assert.equal(response.status(), 201, await response.text());
  const { summary } = await response.json();
  assert.equal(summary.captured + summary.unlinked, 1, 'the message is retained as captured evidence');
}

const sql = (root, command) => execute(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'orbit-local-db', '--local', '--persist-to', '.wrangler/state', '--config', 'wrangler.jsonc', '--json', '--command', command],
  { cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', X_LOCAL_EXPLORER: 'false' }, maxBuffer: 64 * 1024 * 1024 }).then(({ stdout }) => JSON.parse(stdout).map((result) => result.results));

/** Slack routing, mapping, notice and a held deletion, all in the shape a restore leaves, plus the authority rows that stay behind. */
export async function seedSlack(root) {
  await sql(root, `
INSERT INTO slack_installation(id,team_id,bot_user_id,state,error,origin,connected_at,enterprise_id,app_id) VALUES('installation','TWORKSPACE','UBOT','disconnected','Archive restored; reconnect Slack credentials','https://slack.com','2026-11-02T09:00:00.000Z','','AORBIT');
INSERT INTO slack_credentials(id,ciphertext) VALUES('bot','${credential}');
INSERT INTO slack_channels(id,name,events_json,enabled) VALUES('CINTERNAL','sales-internal','["stage","won"]',0);
INSERT INTO slack_mappings(team_id,enterprise_id,app_id,slack_user_id,operator_id,revoked_at,policy_epoch,confirmed_at) VALUES('TWORKSPACE','','AORBIT','UMAPPED',(SELECT id FROM operators WHERE setup_owner=1),'2026-11-02T09:05:00.000Z',1,'2026-11-02T09:01:00.000Z');
INSERT INTO slack_notices(id,event_key,event_kind,channel_id,record_type,record_id,state,content_json,stage_from,stage_to,message_ts,created_at,updated_at,installation_epoch,delivery_team_id,delivery_app_id) VALUES('synthetic-orbit-notice','synthetic-orbit-event','stage','CINTERNAL','opportunity','synthetic-orbit-deal','sent','{"title":"Synthetic stage change"}','New','Qualified','1800000000.000001','2026-11-02T09:02:00.000Z','2026-11-02T09:03:00.000Z','epoch-1','TWORKSPACE','AORBIT');
INSERT INTO slack_action_tokens(id,notice_id,action,event_key,channel_id,record_type,record_id,installation_epoch) VALUES('${actionToken}','synthetic-orbit-notice','orbit_ack','synthetic-orbit-event','CINTERNAL','opportunity','synthetic-orbit-deal','epoch-1');
INSERT INTO slack_deletions(notice_id,team_id,app_id,channel_id,message_ts,state,error,created_at,updated_at) VALUES('synthetic-orbit-notice','TWORKSPACE','AORBIT','CINTERNAL','1800000000.000001','held','Restored deletion needs administrator confirmation','2026-11-02T09:04:00.000Z','2026-11-02T09:04:00.000Z');`);
}

const kept = ['capture_items', 'slack_installation', 'slack_channels', 'slack_mappings', 'slack_notices', 'slack_deletions'], authority = ['slack_credentials', 'slack_action_tokens'];
/** The captured and Slack rows an archive carries, and how many authority rows the installation holds. */
export async function readEvidence(root) {
  const results = await sql(root, [...kept.map((table) => `SELECT * FROM ${table} ORDER BY rowid`), `SELECT s.* FROM signals s JOIN capture_items c ON c.signal_id=s.id ORDER BY s.id`, ...authority.map((table) => `SELECT count(*) n FROM ${table}`)].join(';\n'));
  return { rows: Object.fromEntries([...kept, 'capture_signals'].map((name, index) => [name, results[index]])), authority: Object.fromEntries(authority.map((name, index) => [name, results[kept.length + 1 + index][0].n])) };
}

/** The archive file holds the evidence and Slack definitions, and neither authority table nor its values. */
export function assertArchiveCarries(exported, archive, evidence) {
  const counts = Object.fromEntries(exported.tables.map((table) => [table.name, table.count]));
  for (const table of kept) assert.equal(counts[table], evidence.rows[table].length, `${table} is archived with its rows`);
  assert.ok(evidence.rows.capture_items.length > 0 && evidence.rows.slack_notices.length > 0 && evidence.rows.slack_deletions.length > 0, 'the archived installation holds captured evidence and Slack history');
  for (const table of authority) assert.ok(!(table in counts), `${table} is not archived`);
  for (const secret of [credential, actionToken]) assert.ok(!archive.includes(secret), 'bot credential and action capability stay out of the archive file');
}

export function assertRestored(before, after) {
  assert.deepEqual(before.authority, { slack_credentials: 1, slack_action_tokens: 1 }, 'the archived installation held bot and action authority');
  assert.deepEqual(after.rows, before.rows, 'captured evidence and Slack definitions, mappings, notices and deletion history are restored unchanged');
  assert.deepEqual(after.authority, { slack_credentials: 0, slack_action_tokens: 0 }, 'the restored installation holds no bot credential or action capability');
}
