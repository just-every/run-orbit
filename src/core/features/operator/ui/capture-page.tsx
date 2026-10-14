import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CaptureProposals } from './capture-proposals';
import './records.css';
import './capture-providers.css';
import './capture-page.css';
import { OperatorShell, OperatorState } from './operator-shell';
import { useOperatorResource } from './use-operator-resource';
import { CaptureProviderSetup } from './capture-provider-form';
import { CaptureSource } from './capture-source';
import type { CaptureProviderDirectory, CaptureSource as CaptureSourceRecord } from './capture-types';

interface Summary {
  captured: number;
  unlinked: number;
  replayed: number;
  conflicts: number;
  attached: number;
  stopped: number;
  bounces: number;
  proposals: number;
  skipped: number;
  skipReasons: Record<string, number>;
}

export function CapturePage() {
  const load = useCallback(async () => {
    const response = await fetch('/api/v1/capture/sources', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Capture sources could not load.');
    return await response.json() as { sources: CaptureSourceRecord[] };
  }, []);
  const sources = useOperatorResource('capture-sources', load);
  const reloadSources = useRef(sources.reload);
  reloadSources.current = sources.reload;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [providerDirectory, setProviderDirectory] = useState<CaptureProviderDirectory | null>(null);
  const [providerError, setProviderError] = useState('');
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerRequest, setProviderRequest] = useState(0);
  const [connectionNotice, setConnectionNotice] = useState('');
  const [focusSourceId, setFocusSourceId] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setProviderLoading(true);
    setProviderError('');
    setProviderDirectory(null);
    void fetch('/api/v1/capture/providers', { credentials: 'same-origin', signal: controller.signal }).then(async (response) => {
      const value = await response.json().catch(() => ({})) as CaptureProviderDirectory & { error?: string };
      if (!response.ok) throw new Error(value.error ?? 'Provider connection details could not load.');
      setProviderDirectory(value);
    }).catch((next: unknown) => {
      if (!controller.signal.aborted) setProviderError(next instanceof Error ? next.message : 'Provider connection details could not load.');
    }).finally(() => {
      if (!controller.signal.aborted) setProviderLoading(false);
    });
    return () => controller.abort();
  }, [providerRequest]);

  // Native OAuth and scope form redirects return a short status in the address.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('result');
    const failure = params.get('error');
    const connected = params.get('connected');
    const scopeSaved = params.get('scopeSaved');
    if (!result && !failure && !connected && !scopeSaved) return;
    try {
      if (result) setSummary(JSON.parse(result) as Summary);
    } catch {
      setError('The import result could not be read.');
    }
    if (failure) setError(failure);
    if (connected) {
      setFocusSourceId(connected);
      setConnectionNotice('Provider connected. Choose at least one mail label, folder or calendar and save that scope before Orbit reads anything.');
      reloadSources.current();
    }
    if (scopeSaved) {
      setFocusSourceId(scopeSaved);
      setConnectionNotice('Selected scope saved. Orbit will read only the folders, labels and calendars you chose.');
      reloadSources.current();
    }
    window.history.replaceState(null, '', '/app/capture');
  }, []);

  useEffect(() => {
    if (!focusSourceId || !sources.data?.sources.some((source) => source.id === focusSourceId)) return;
    const card = document.getElementById(`capture-source-${focusSourceId}`);
    card?.scrollIntoView({ block: 'center' });
    card?.focus({ preventScroll: true });
    setFocusSourceId('');
  }, [focusSourceId, sources.data]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    setSummary(null);
    try {
      const response = await fetch('/api/v1/capture/imports', { method: 'POST', credentials: 'same-origin', body: new FormData(form) });
      const result = await response.json().catch(() => ({})) as { summary?: Summary; error?: string };
      if (!response.ok || !result.summary) throw new Error(result.error ?? 'The files could not be captured.');
      setSummary(result.summary);
      form.reset();
      sources.reload();
      setRevision((value) => value + 1);
    } catch (next) {
      setError((next as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, number][] = summary ? [
    ['Captured', summary.captured],
    ['Attached to an Orbit thread', summary.attached],
    ['Outreach stopped for a reply or booking', summary.stopped],
    ['Delivery reports for Orbit sends', summary.bounces],
    ['Proposed changes', summary.proposals],
    ['Kept in the unlinked queue', summary.unlinked],
    ['Already captured', summary.replayed],
    ['Changed copies refused', summary.conflicts],
    ['Not stored', summary.skipped],
  ] : [];

  return <OperatorShell eyebrow="Customer evidence" title="Capture mail and calendar">
    <CaptureProviderSetup
      directory={providerDirectory}
      loading={providerLoading}
      error={providerError}
      onRetry={() => setProviderRequest((value) => value + 1)}
    />
    {connectionNotice ? <OperatorState>{connectionNotice}</OperatorState> : null}
    <section className="operator-surface operator-detail__section capture-upload" aria-labelledby="capture-add">
      <h2 id="capture-add">Add mail and calendar files</h2>
      <p>Orbit keeps only messages and events with a known contact or company domain. Captured evidence stops outreach to a person who replied or booked a meeting; every other change waits for your review. Nothing is sent.</p>
      <form className="workbench-form" method="post" action="/api/v1/capture/imports" encType="multipart/form-data" onSubmit={add}>
        <label>Mail (.eml or mbox) and calendar (.ics) files<input type="file" name="files" multiple required accept=".eml,.mbox,.ics,message/rfc822,application/mbox,text/calendar" /></label>
        <label className="capture-checkbox"><input type="checkbox" name="includeUnknown" /> Also keep messages with no known contact or company, for this import only. They wait in the unlinked queue.</label>
        <button className="orbit-button orbit-button--primary" disabled={busy}>{busy ? 'Adding…' : 'Add files'}</button>
      </form>
      {error ? <OperatorState kind="error">{error}</OperatorState> : null}
      {summary ? <div role="status"><h3>Import result</h3><div role="region" aria-label="Import result"><table className="capture-summary"><tbody>{rows.map(([name, count]) => <tr key={name}><th scope="row">{name}</th><td>{count}</td></tr>)}</tbody></table></div>
        {summary.skipped > 0 ? <><h4>Why items were not stored</h4><ul>{Object.entries(summary.skipReasons).map(([reason, count]) => <li key={reason}>{reason}: {count}</li>)}</ul></> : null}
      </div> : null}
    </section>
    <section className="operator-surface operator-detail__section capture-sources-section" aria-labelledby="capture-sources">
      <h2 id="capture-sources">Sources</h2>
      <p>Connected accounts stay idle until you save at least one mail folder or calendar. Captured evidence and pending proposals stay here after a disconnect.</p>
      {sources.loading ? <OperatorState>Loading sources…</OperatorState> : null}
      {sources.error ? <OperatorState kind="error">{sources.error.message}</OperatorState> : null}
      {sources.data && !sources.data.sources.length ? <p>No mail or calendar has been captured yet.</p> : null}
      {sources.data?.sources.map((source) => <CaptureSource
        key={source.id}
        source={source}
        directory={providerDirectory}
        onChanged={sources.reload}
      />)}
    </section>
    <CaptureProposals key={revision} onChanged={() => sources.reload()} />
  </OperatorShell>;
}
