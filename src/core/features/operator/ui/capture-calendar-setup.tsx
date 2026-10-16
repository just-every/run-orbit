import { useId, useState, type FormEvent } from 'react';
import { ConsoleLink } from './capture-guide';
import { OperatorState } from './operator-shell';

/** Paste a calendar's private iCal address; Orbit checks it returns a calendar before saving it. */
export function CaptureCalendarSetup({ error: initialError }: { error?: string }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? '');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/v1/capture/calendar-links', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: form.get('url'), name: form.get('name') }) });
      const result = await response.json().catch(() => ({})) as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? 'The calendar could not be added.');
      window.location.assign(`/app/capture?connected=${encodeURIComponent(result.id)}`);
    } catch (next) {
      setError((next as Error).message);
      setBusy(false);
    }
  }
  return <div className="capture-panel capture-panel--primary">
    <h2>Add a calendar by its private link</h2>
    <p>Most calendars can share a private address that calendar apps subscribe to. Orbit reads it every 15 minutes and keeps meetings with your contacts. Orbit never changes your calendar.</p>
    <form className="capture-link-form" method="post" action="/api/v1/capture/calendar-links" onSubmit={submit}>
      <label htmlFor={`${id}-url`}>Calendar’s iCal address
        <input id={`${id}-url`} name="url" type="text" inputMode="url" required placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" autoComplete="off" spellCheck={false} />
        <small>It starts with https:// or webcal:// and usually ends in .ics.</small>
      </label>
      <label htmlFor={`${id}-name`}>Name <span className="capture-optional">(optional)</span>
        <input id={`${id}-name`} name="name" maxLength={120} placeholder="Work calendar" autoComplete="off" />
      </label>
      <button className="orbit-button orbit-button--primary" type="submit" disabled={busy}>{busy ? 'Checking the link…' : 'Add calendar'}</button>
    </form>
    {error ? <OperatorState kind="error">{error}</OperatorState> : null}
    <h3 className="capture-section-title">Where to find the link</h3>
    <details className="capture-how">
      <summary>Google Calendar</summary>
      <ol>
        <li><ConsoleLink href="https://calendar.google.com/calendar/r/settings">Open Google Calendar settings</ConsoleLink>.</li>
        <li>On the left, under <strong>Settings for my calendars</strong>, choose your calendar, then <strong>Integrate calendar</strong>.</li>
        <li>Copy <strong>Secret address in iCal format</strong> and paste it above. Treat it like a password: anyone with it can see your calendar.</li>
      </ol>
    </details>
    <details className="capture-how">
      <summary>Outlook or Microsoft 365</summary>
      <ol>
        <li>Open calendar sharing in <ConsoleLink href="https://outlook.office.com/calendar/options/calendar/SharedCalendars">Outlook for work</ConsoleLink> or <ConsoleLink href="https://outlook.live.com/calendar/0/options/calendar/SharedCalendars">Outlook.com</ConsoleLink>.</li>
        <li>Under <strong>Publish a calendar</strong>, choose your calendar and <strong>Can view all details</strong>, then <strong>Publish</strong>.</li>
        <li>Copy the <strong>ICS</strong> link (not the HTML one) and paste it above.</li>
      </ol>
    </details>
    <details className="capture-how">
      <summary>Apple iCloud Calendar</summary>
      <ol>
        <li>On <ConsoleLink href="https://www.icloud.com/calendar/">iCloud Calendar</ConsoleLink> or in the Calendar app, open the sharing settings for your calendar.</li>
        <li>Turn on <strong>Public Calendar</strong> and copy the link that starts with <code>webcal://</code>. Paste it above.</li>
      </ol>
    </details>
  </div>;
}
