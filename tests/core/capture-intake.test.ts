import {workflowJourney} from '../support/workflow-journey';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureFixture, fixtureMailbox, eml } from '../support/capture-fixture';
import { MAX_ITEMS_PER_IMPORT } from '../../src/core/features/capture/contracts';
import {signedReplies} from '../support/signed-reply';

import {refuseCaptureImpersonation,acceptCaptureStop} from '../support/sanity-capture-boundary';
import {reviewCapturedEvidence} from '../support/sanity-capture-review';
const count = async (db: D1Database, sql: string, ...bindings: unknown[]) => Number(await db.prepare(sql).bind(...bindings).first('n'));

test('CAPTURE-001 CAPTURE-002 CAPTURE-003 CAPTURE-004 CAPTURE-005 SIGNAL-003 OUT-004 ACTION-005 RECORD-012 file intake preserves evidence and exact identity, holds changes for review, stops follow-up and never approves mail',async()=>{
 const f=await captureFixture();try{
 const mailbox=fixtureMailbox(f);
 await refuseCaptureImpersonation(f);
 await reviewCapturedEvidence(f,mailbox);
 {
    const mail = mailbox, files = [{ name: 'export.mbox', text: mail.mbox }, { name: 'invite.ics', text: mail.invite }, { name: 'cancel.ics', text: mail.cancellation }];
    const response = await f.upload(files);
    assert.equal(response.status, 201);
    const { summary } = await response.json() as { summary: Record<string, any> };
    assert.equal(summary.captured, 4, 'new reply, automatic reply, bounce and cancellation');
    assert.equal(summary.replayed, 2, 'the previously reviewed forward and invite are unchanged');
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

    // One reply seen through both capture and the signed provider door remains
    // one recipient's notification, including a read made between deliveries.
    const inbox = await (await f.request('/api/v1/notifications')).json() as {notifications:{id:string;kind:string;opportunityId:string;readAt:string|null}[]};
    const notices = inbox.notifications.filter(item=>item.kind==='customer.reply'&&item.opportunityId===f.opportunity);
    assert.equal(notices.length,1,'The reply and its queue transition share one notification');
    assert.equal((await f.request(`/api/v1/notifications/${notices[0]!.id}/read`,{method:'POST'})).status,200);
    const separator=mail.reply.indexOf('\r\n\r\n'),providerCopy=new FormData();
    providerCopy.set('from','"Ana R." <ana@acme.example>');providerCopy.set('subject','Re: Proposal for Acme');providerCopy.set('headers',mail.reply.slice(0,separator));providerCopy.set('text',mail.reply.slice(separator+4));
    const deliver=signedReplies(f.db);assert.equal((await deliver(providerCopy)).status,200);assert.equal((await deliver(providerCopy)).status,200);
    const afterCopy=await(await f.request('/api/v1/notifications')).json() as typeof inbox;
    const remaining=afterCopy.notifications.filter(item=>item.kind==='customer.reply'&&item.opportunityId===f.opportunity);
    assert.equal(remaining.length,1);assert.equal(remaining[0]!.id,notices[0]!.id);assert.ok(remaining[0]!.readAt,'Another writer cannot make a read event unread again');

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
    assert.equal((await (await f.upload([{ name: 'undated.eml', text: eml({ From: 'ana@acme.example', 'Message-ID': '<undated@acme.example>' }, 'No date') }])).json() as { summary: { skipReasons: Record<string, number> } }).summary.skipReasons['No valid Date header'], 1);

    // Folded component markers count before any import writes, just like ordinary markers.
    const event = (index: number) => ['BEGIN:VEVENT', `UID:folded-${index}@acme.example`, 'DTSTAMP:20200101T090000Z', 'DTSTART:20200102T090000Z', 'SUMMARY:Folded meeting', 'ATTENDEE:mailto:ana@acme.example', 'END:VEVENT'].join('\r\n');
    const calendar = (events: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'METHOD:REQUEST', ...events, 'END:VCALENDAR'].join('\r\n');
    const fold = (text: string) => text.replaceAll('BEGIN:VEVENT', 'BEGIN:VE\r\n VENT').replaceAll('END:VEVENT', 'END:VE\r\n\tVENT');
    const events = Array.from({ length: MAX_ITEMS_PER_IMPORT + 1 }, (_, index) => event(index));
    const beforeCalendar = await count(f.db, 'SELECT count(*) n FROM signals');
    const over = await f.upload([{ name: 'over.ics', text: calendar(events) }]);
    assert.equal(over.status, 413);
    const foldedOver = await f.upload([{ name: 'folded-over.ics', text: fold(calendar(events)) }]);
    assert.equal(foldedOver.status, over.status);
    assert.deepEqual(await foldedOver.json(), await over.json());
    assert.equal(await count(f.db, 'SELECT count(*) n FROM signals'), beforeCalendar);
    // Long whitespace remains real content; transport-only trailing SP/TAB and line endings replay.
    const hostile = [
      { type: 'text/plain; ' + ' '.repeat(65536) + '=', body: 'Fresh reply' },
      { type: 'text/plain; charset=' + ' '.repeat(8192) + '"utf-8" invalid', body: 'A malformed parameter leaves this body readable' },
      { type: 'text/plain', body: 'First line\n' + '\n'.repeat(8192) + 'Last line' },
    ].map(({ type, body }, index) => eml({ From: 'ana@acme.example', To: 'seller@orbit.test', Date: 'Wed, 01 Jan 2020 09:00:00 +0000', 'Message-ID': `<hostile-${index}@acme.example>`, 'Content-Type': type }, body));
    hostile.push(eml({ From: 'ana@acme.example', Date: 'Wed, 01 Jan 2020 09:00:00 +0000', 'Message-ID': '<hostile-header@acme.example>', 'X-Hostile': ' '.repeat(8192) + '\u2028invalid' }, 'A malformed header leaves the message readable'));
    const hostileImport = await f.upload(hostile.map((text, index) => ({ name: `hostile-${index}.eml`, text })));
    assert.equal(hostileImport.status, 201);
    assert.equal((await hostileImport.json() as { summary: { captured: number } }).summary.captured, hostile.length);
    assert.equal(await count(f.db, "SELECT count(*) n FROM capture_items WHERE headers LIKE '%hostile-header@acme.example%' AND body='A malformed header leaves the message readable' AND headers NOT LIKE '%x-hostile:%'"), 1);
    for (let index = 0; index < hostile.length; index++) {
      const transport = hostile[index]!.split('\r\n').map(line => line + ' \t').join('\r') + '\r\r';
      const replay = await f.upload([{ name: 'transport.eml', text: transport }]);
      assert.equal(replay.status, 201);
      assert.equal((await replay.json() as { summary: { replayed: number } }).summary.replayed, 1);
    }
    const changedWhitespace = await f.upload([{ name: 'changed-whitespace.eml', text: hostile[0]!.replace(' '.repeat(65536), ' '.repeat(65535)) }]);
    assert.equal((await changedWhitespace.json() as { summary: { conflicts: number } }).summary.conflicts, 1);
    const changedBlankLines = await f.upload([{ name: 'changed-blank-lines.eml', text: hostile[2]!.replace('\r\n\r\n\r\n', '\r\n\r\n') }]);
    assert.equal((await changedBlankLines.json() as { summary: { conflicts: number } }).summary.conflicts, 1);
    await acceptCaptureStop(f);
    // A contact's mailbox may also be an operator mailbox; explain its exclusion accurately.
    const invited = await f.request('/api/v1/settings/operators', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'ana@acme.example', displayName: 'Ana operator' }) });
    assert.equal(invited.status, 201);
    const signalsBeforeInternal = await count(f.db, 'SELECT count(*) n FROM signals');
    const internal = await f.upload([{ name: 'internal.eml', text: eml({ From: 'ana@acme.example', To: 'seller@orbit.test', Date: 'Wed, 01 Jan 2020 09:00:00 +0000', 'Message-ID': '<internal-contact@acme.example>' }, 'Internal team message') }]);
    assert.equal(internal.status, 201);
    const internalSummary = (await internal.json() as { summary: { skipped: number; skipReasons: Record<string, number> } }).summary;
    assert.equal(internalSummary.skipped, 1);
    assert.match(Object.keys(internalSummary.skipReasons).join(' '), /operator addresses.*excluded/i);
    assert.equal(await count(f.db, 'SELECT count(*) n FROM signals'), signalsBeforeInternal);


 }
 await workflowJourney(f);
 }finally{await f.dispose();}
});
