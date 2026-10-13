/** Mail and calendar files as a person would export them. Pure text: usable from Node tests and Playwright. */
const ago = (minutes: number) => new Date(Date.now() - minutes * 60000);
const rfc = (date: Date) => date.toUTCString().replace('GMT', '+0000');
export function eml(headers: Record<string, string>, body: string) {
  return Object.entries(headers).map(([name, value]) => `${name}: ${value}`).join('\r\n') + '\r\n\r\n' + body.replace(/\n/g, '\r\n');
}
const ics = (lines: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fixture//EN', ...lines, 'END:VCALENDAR'].join('\r\n');
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const zoned = (date: Date) => stamp(date).replace('Z', '');

/** A mailbox and calendar export as a person would hand them to Orbit. */
export function fixtureMailbox(f: { anaThread: string; bobThread: string }, domain = 'acme.example') {
  const reply = eml({ From: `"Ana R." <ana@${domain}>`, To: 'Sam Seller <seller@orbit.test>', Subject: 'Re: Proposal for Acme', Date: rfc(ago(30)), 'Message-ID': `<reply-1@${domain}>`, 'In-Reply-To': f.anaThread, References: f.anaThread, 'Content-Type': 'text/plain; charset=utf-8' },
    'Thanks, this looks right. Can we talk on Tuesday?\n\nAna\nTel: +1 415 555 0100\n\nOn Mon, Sam Seller wrote:\n> Reviewed body: Proposal for Acme');
  const autoReply = eml({ From: `Bob Stone <bob@${domain}>`, To: 'seller@orbit.test', Subject: 'Automatic reply: Rollout plan', Date: rfc(ago(50)), 'Message-ID': `<auto-1@${domain}>`, 'Auto-Submitted': 'auto-replied', 'In-Reply-To': f.bobThread, References: f.bobThread }, 'I am out of the office until Monday.');
  const bounce = eml({ From: `Mail Delivery System <MAILER-DAEMON@mx.${domain}>`, To: 'seller@orbit.test', Subject: 'Undelivered Mail Returned to Sender', Date: rfc(ago(40)), 'Message-ID': `<dsn-1@mx.${domain}>`, 'MIME-Version': '1.0', 'Content-Type': 'multipart/report; report-type=delivery-status; boundary="dsn-boundary"' },
    ['--dsn-boundary', 'Content-Type: text/plain', '', 'Your message could not be delivered.', '', '--dsn-boundary', 'Content-Type: message/delivery-status', '', `Reporting-MTA: dns; mx.${domain}`, '', `Final-Recipient: rfc822; bob@${domain}`, 'Action: failed', 'Status: 5.1.1', 'Diagnostic-Code: smtp; 550 5.1.1 User unknown', '', '--dsn-boundary', 'Content-Type: text/rfc822-headers', '', `Message-ID: ${f.bobThread}`, `To: bob@${domain}`, 'Subject: Rollout plan', '', '--dsn-boundary--'].join('\n'));
  const forward = eml({ From: 'Sam Seller <seller@orbit.test>', To: 'seller@orbit.test', Subject: 'Fwd: Pricing question', Date: rfc(ago(20)), 'Message-ID': `<fwd-1.${domain}@orbit.test>` },
    `Worth a look.\n\n---------- Forwarded message ---------\nFrom: Cara Diaz <cara@${domain}>\nDate: Mon, 12 Oct 2026 09:00:00 +0000\nSubject: Pricing question\n\nWhat does the enterprise plan cost?`);
  const personal = eml({ From: 'Old Friend <friend@freemail.example>', To: 'seller@orbit.test', Subject: 'Dinner on Saturday?', Date: rfc(ago(10)), 'Message-ID': `<private-1.${domain}@freemail.example>` }, 'Are you free for dinner on Saturday? Bring the kids.');
  const start = new Date(Math.floor(Date.now() / 1000 + 3 * 86400) * 1000), end = new Date(start.getTime() + 3600000);
  const invite = ics(['METHOD:REQUEST', 'BEGIN:VEVENT', `UID:meeting-1@${domain}`, 'SEQUENCE:0', `DTSTAMP:${stamp(ago(15))}`, `CREATED:${stamp(ago(15))}`, `DTSTART;TZID=Asia/Tokyo:${zoned(start)}`, `DTEND;TZID=Asia/Tokyo:${zoned(end)}`, 'SUMMARY:Acme rollout review', 'ORGANIZER;CN=Sam Seller:mailto:seller@orbit.test', `ATTENDEE;CN=Ana Ruiz:mailto:ana@${domain}`, 'STATUS:CONFIRMED', 'END:VEVENT']);
  const cancellation = ics(['METHOD:CANCEL', 'BEGIN:VEVENT', `UID:meeting-2@${domain}`, 'SEQUENCE:1', `DTSTAMP:${stamp(ago(5))}`, `DTSTART:${stamp(new Date(Date.now() + 5 * 86400000))}`, 'SUMMARY:Pricing call', 'ORGANIZER:mailto:seller@orbit.test', `ATTENDEE:mailto:bob@${domain}`, 'STATUS:CANCELLED', 'END:VEVENT']);
  const mbox = [reply, autoReply, bounce, forward, personal].map(message => `From sender@example Mon Oct 12 09:00:00 2026\n${message.replace(/\r\n/g, '\n').replace(/^From /gm, '>From ')}\n`).join('\n');
  return { reply, autoReply, bounce, forward, personal, invite, cancellation, mbox, start: start.toISOString() };
}
export function unsubscribeMessage(domain = 'acme.example') {
  return eml({ From: `Ana Ruiz <ana@${domain}>`, To: 'seller@orbit.test', Subject: 'Please stop', Date: rfc(ago(8)), 'Message-ID': `<unsubscribe-1@${domain}>` }, 'Please remove me from your list.\n\nAna');
}
