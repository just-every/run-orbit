import { useEffect, useState, type FormEvent } from 'react';
import { OperatorState } from './operator-shell';

interface Summary {
  captured: number; unlinked: number; replayed: number; conflicts: number; attached: number;
  stopped: number; bounces: number; proposals: number; skipped: number; skipReasons: Record<string, number>;
}

/** Upload .eml, mbox and .ics files exported from any mail or calendar app. */
export function CaptureFilesSetup({ error: initialError }: { error?: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(initialError ?? '');
  const [busy, setBusy] = useState(false);
  // A form posted before hydration returns here with its result in the address.
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('result');
    if (!result) return;
    try { setSummary(JSON.parse(result) as Summary); } catch { setError('The import result could not be read.'); }
  }, []);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setError(''); setSummary(null);
    try {
      const response = await fetch('/api/v1/capture/imports', { method: 'POST', credentials: 'same-origin', body: new FormData(form) });
      const result = await response.json().catch(() => ({})) as { summary?: Summary; error?: string };
      if (!response.ok || !result.summary) throw new Error(result.error ?? 'The files could not be captured.');
      setSummary(result.summary);
      form.reset();
    } catch (next) {
      setError((next as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const rows: [string, number][] = summary ? [
    ['Captured', summary.captured], ['Attached to an Orbit thread', summary.attached], ['Outreach stopped for a reply or booking', summary.stopped],
    ['Delivery reports for Orbit sends', summary.bounces], ['Proposed changes', summary.proposals], ['Kept in the unlinked queue', summary.unlinked],
    ['Already captured', summary.replayed], ['Changed copies refused', summary.conflicts], ['Not stored', summary.skipped],
  ] : [];
  return <div className="capture-panel capture-panel--primary capture-upload">
    <h2>Upload mail and calendar files</h2>
    <p>Export messages as .eml files or a whole mailbox as mbox (Gmail: Google Takeout; Apple Mail: Export Mailbox; Thunderbird: Save As), and calendars as .ics. Orbit keeps messages and meetings with your contacts; nothing is sent.</p>
    <form className="capture-upload__form" method="post" action="/api/v1/capture/imports" encType="multipart/form-data" onSubmit={add}>
      <label>Mail (.eml or mbox) and calendar (.ics) files<input type="file" name="files" multiple required accept=".eml,.mbox,.ics,message/rfc822,application/mbox,text/calendar" /></label>
      <label className="capture-checkbox"><input type="checkbox" name="includeUnknown" /> Also keep messages with no known contact or company, for this upload only. They wait in the unlinked queue.</label>
      <button className="orbit-button orbit-button--primary" disabled={busy}>{busy ? 'Adding…' : 'Add files'}</button>
    </form>
    {error ? <OperatorState kind="error">{error}</OperatorState> : null}
    {summary ? <div role="status"><h3>Import result</h3><div role="region" aria-label="Import result"><table className="capture-summary"><tbody>{rows.map(([name, count]) => <tr key={name}><th scope="row">{name}</th><td>{count}</td></tr>)}</tbody></table></div>
      {summary.skipped > 0 ? <><h4>Why items were not stored</h4><ul>{Object.entries(summary.skipReasons).map(([reason, count]) => <li key={reason}>{reason}: {count}</li>)}</ul></> : null}
      {summary.proposals > 0 ? <p><a className="orbit-button orbit-button--quiet" href="/app/capture/review">Review {summary.proposals} proposed {summary.proposals === 1 ? 'change' : 'changes'}</a></p> : null}
    </div> : null}
  </div>;
}
