import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureFixture, fixtureMailbox, eml } from '../support/capture-fixture';

const count = async (db: D1Database, sql: string, ...bindings: unknown[]) => Number(await db.prepare(sql).bind(...bindings).first('n'));

test('CAPTURE-001 CAPTURE-002 CAPTURE-003 SIGNAL-003 OUT-004 RECORD-012 an mbox and calendar files become signals with their evidence; replay, threading, delivery reports and private mail behave as the contract says', async () => {
  const f = await captureFixture();
  try {
    const mail = fixtureMailbox(f), files = [{ name: 'export.mbox', text: mail.mbox }, { name: 'invite.ics', text: mail.invite }, { name: 'cancel.ics', text: mail.cancellation }];
    const response = await f.upload(files);
    assert.equal(response.status, 201);
    const { summary } = await response.json() as { summary: Record<string, any> };
    assert.equal(summary.captured, 6, 'reply, auto-reply, bounce, forward, invite and cancellation');
    assert.equal(summary.skipped, 1);
    assert.deepEqual(summary.skipReasons, { 'No known contact or company domain': 1 });
    assert.equal(summary.attached, 3, 'the threaded reply, the threaded auto-reply and the delivery report attach to the Orbit thread');

    // A private message with no known participant leaves no trace.
    for (const [table, column] of [['signals', 'payload_json'], ['signals', 'subject'], ['capture_items', 'headers'], ['capture_items', 'body'], ['timeline_entries', 'payload_json'], ['audit_entries', 'details_json'], ['capture_proposals', 'details_json']])
      assert.equal(await count(f.db, `SELECT count(*) n FROM ${table} WHERE instr(lower(${column}),'friend@freemail.example')>0 OR instr(lower(${column}),'dinner on saturday')>0`), 0, `${table}.${column} holds nothing of the private message`);

    // Each signal keeps the original headers and body it rests on.
    const reply = await f.db.prepare("SELECT s.id,s.type,s.confidence,s.occurred_at,i.headers,i.body FROM signals s JOIN capture_items i ON i.signal_id=s.id WHERE i.headers LIKE '%reply-1@acme.example%'").first<{ id: string; type: string; confidence: string; occurred_at: string; headers: string; body: string }>();
    assert.equal(reply!.type, 'email.replied'); assert.equal(reply!.confidence, 'observed');
    assert.match(reply!.headers, /in-reply-to: /); assert.match(reply!.body, /Can we talk on Tuesday\?/);

    // OUT-004: the threaded reply is on the opportunity once and moved it to NOW.
    assert.equal(await count(f.db, "SELECT count(*) n FROM timeline_entry_records WHERE timeline_entry_id=? AND record_type='opportunity' AND record_id=?", reply!.id, f.opportunity), 1);
    assert.equal(await count(f.db, "SELECT count(*) n FROM timeline_entry_records WHERE timeline_entry_id=? AND record_type='company' AND record_id=?", reply!.id, f.company), 1, 'the reply lands on the account');
    const opportunity = await f.db.prepare('SELECT queue_state,queue_reason FROM opportunities WHERE id=?').bind(f.opportunity).first<{ queue_state: string; queue_reason: string }>();
    assert.equal(opportunity!.queue_state, 'now');

    // RECORD-012: a permanent delivery report for Orbit's send to Bob stops Bob.
    assert.equal(await f.db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.bob).first('contactability'), 'do_not_contact');
    assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE message_id=?').bind(f.bobThread).first('state'), 'bounced');
    assert.equal(await f.db.prepare("SELECT confidence FROM signals WHERE type LIKE '%:email.auto_replied'").first('confidence'), 'inferred');

    // Calendar events keep their original times.
    const invite = await f.db.prepare("SELECT s.type,s.occurred_at,s.payload_json FROM signals s WHERE s.type='meeting.booked'").first<{ type: string; occurred_at: string; payload_json: string }>();
    assert.equal(JSON.parse(invite!.payload_json).data.start, new Date(Date.parse(mail.start) - 9 * 3600000).toISOString(), 'DTSTART in Asia/Tokyo resolves to UTC');
    assert.ok(await f.db.prepare("SELECT 1 FROM signals WHERE type='meeting.cancelled'").first());

    // SIGNAL-003: the same files again change nothing; a changed copy with the same identity is refused and recorded.
    const signals = await count(f.db, 'SELECT count(*) n FROM signals'), timeline = await count(f.db, 'SELECT count(*) n FROM timeline_entries'), proposals = await count(f.db, 'SELECT count(*) n FROM capture_proposals');
    const again = await (await f.upload(files)).json() as { summary: Record<string, number> };
    assert.equal(again.summary.replayed, 6); assert.equal(again.summary.captured, 0);
    const changed = await (await f.upload([{ name: 'changed.eml', text: mail.reply.replace('Can we talk on Tuesday?', 'Can we talk on Friday?') }])).json() as { summary: Record<string, number> };
    assert.equal(changed.summary.conflicts, 1);
    assert.deepEqual([await count(f.db, 'SELECT count(*) n FROM signals'), await count(f.db, 'SELECT count(*) n FROM timeline_entries'), await count(f.db, 'SELECT count(*) n FROM capture_proposals')], [signals, timeline, proposals]);
    const source = await f.db.prepare("SELECT rejected_count,last_error FROM signal_sources WHERE id='capture-files'").first<{ rejected_count: number; last_error: string }>();
    assert.equal(source!.rejected_count, 1); assert.match(source!.last_error, /different content/);

    // An operator may keep unknown senders for one import: they wait in the unlinked queue, never on a record.
    const kept = await (await f.upload([{ name: 'personal.eml', text: mail.personal }], true)).json() as { summary: Record<string, number> };
    assert.equal(kept.summary.unlinked, 1);
    const unlinked = await f.request('/api/v1/sources/unlinked');
    assert.ok(((await unlinked.json()) as { signals: { subject: string }[] }).signals.some(signal => signal.subject === 'Dinner on Saturday?'));
    assert.equal(await count(f.db, "SELECT count(*) n FROM signal_links l JOIN signals s ON s.id=l.signal_id WHERE s.subject='Dinner on Saturday?'"), 0);

    // Before hydration the form posts natively and returns to the Capture page with its result.
    const native = await f.upload([{ name: 'personal.eml', text: mail.personal }], false, { cookie: f.cookie, origin: 'https://orbit.test', accept: 'text/html' });
    assert.equal(native.status, 303);
    assert.equal(JSON.parse(new URL(native.headers.get('location')!, 'https://orbit.test').searchParams.get('result')!).replayed, 1);
    // A file that is neither mail nor calendar is refused whole.
    const refused = await f.upload([{ name: 'notes.txt', text: 'hello' }]);
    assert.equal(refused.status, 400);
    assert.equal((await f.upload([{ name: 'undated.eml', text: eml({ From: 'ana@acme.example', 'Message-ID': '<undated@acme.example>' }, 'No date') }]).then(r => r.json()) as { summary: { skipReasons: Record<string, number> } }).summary.skipReasons['No valid Date header'], 1);
  } finally { await f.dispose(); }
});
