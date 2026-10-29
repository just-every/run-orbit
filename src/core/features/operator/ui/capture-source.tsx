import { useEffect, useRef, useState } from 'react';
import { OperatorState } from './operator-shell';
import { CaptureScope } from './capture-scope';
import { formatDate } from './formatters';
import {
  isCaptureProvider,
  isRevokedSource,
  isUnavailableSource,
  type CaptureSource,
  type CaptureSyncResponse,
} from './capture-types';

const when = (value: string | null) => value ? formatDate(value) : 'Never';

function statusLabel(source: CaptureSource, receivesMail: boolean) {
  if (source.state === 'disconnected') return 'Disconnected';
  // A restored Orbit address keeps its history, but only an installation with a receiving mailbox gets new mail.
  if (source.adapter === 'forward' && !receivesMail) return 'Not receiving mail';
  if (source.state === 'syncing') return 'Syncing';
  if (source.adapter === 'file') return 'Connected';
  if (source.adapter === 'forward' && !source.has_credential) return 'Create a new address';
  if (!source.has_credential) return 'Reconnect after restore';
  if (isRevokedSource(source)) return 'Access revoked · reconnect required';
  if (source.state === 'error') return 'Reconnect required';
  if (isUnavailableSource(source)) return 'Provider unavailable';
  if (source.last_error) return 'Sync needs attention';
  return 'Connected';
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return body.error || fallback;
}

const kinds: Record<string, string> = { google: 'Google', microsoft: 'Microsoft', file: 'Files', forward: 'Mail sent to your Orbit address', ical: 'Calendar link' };

export function CaptureSource({
  source: savedSource,
  onChanged,
  receivesMail = true,
}: {
  source: CaptureSource;
  onChanged: () => void;
  receivesMail?: boolean;
}) {
  const [syncPending, setSyncPending] = useState(false);
  const [scopePending, setScopePending] = useState(false);
  const [disconnectPending, setDisconnectPending] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [actionError, setActionError] = useState('');
  const [more, setMore] = useState(false);
  const [scopeChanged, setScopeChanged] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const workLifetime = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  // Keep a confirmed disconnect visible even if an earlier source refresh arrives late.
  const source = disconnected ? { ...savedSource, state: 'disconnected', has_credential: 0, last_error: null } : savedSource;
  const busy = syncPending || scopePending || disconnectPending;
  const scopeLifetime = workLifetime.current;
  const isCurrent = (lifetime: number) => mounted.current && lifetime === workLifetime.current;
  const oauth = isCaptureProvider(source.adapter);
  const accessRevoked = isRevokedSource(source);
  const needsReconnect = source.state === 'disconnected' || accessRevoked || source.state === 'error' || !source.has_credential;
  const persistedHasScope = !oauth || (source.scope.mail?.folders.length ?? 0) > 0 || (source.scope.calendars?.length ?? 0) > 0;

  async function syncNow() {
    if (busy || needsReconnect) return;
    const lifetime = workLifetime.current;
    setSyncPending(true);
    setActionError('');
    setSyncResult('');
    try {
      const response = await fetch(`/api/v1/capture/sources/${source.id}/sync`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(await responseError(response, 'Sync did not complete.'));
      const result = await response.json() as CaptureSyncResponse;
      if (!isCurrent(lifetime)) return;
      if (!result.summary || typeof result.more !== 'boolean') throw new Error('The sync response did not confirm whether more items remain. Source status was refreshed.');
      if (result.summary.halted === 'revoked') {
        setActionError('Provider access was revoked. Reconnect this source before Orbit can read more.');
      } else if (result.summary.halted === 'unavailable') {
        setActionError('The provider is unavailable. Orbit stopped this sync and kept the last saved cursor. Try again when the provider is available.');
      } else if (result.more) {
        setMore(true);
        setSyncResult(`This sync read ${result.summary.captured} items, skipped ${result.summary.skipped}, and proposed ${result.summary.proposals} changes. More pages remain; continue sync to read them.`);
      } else {
        setMore(false);
        setSyncResult(`Sync finished: ${result.summary.captured} items captured, ${result.summary.skipped} not stored, and ${result.summary.proposals} changes proposed.`);
      }
      onChanged();
    } catch (error) {
      if (!isCurrent(lifetime)) return;
      setActionError((error as Error).message || 'Sync did not complete.');
      onChanged();
    } finally {
      if (isCurrent(lifetime)) setSyncPending(false);
    }
  }

  async function disconnect() {
    if (disconnectPending) return;
    if (!window.confirm(`Disconnect ${source.name}? Intake stops now and its stored credential is deleted. Evidence already captured stays.`)) return;
    setDisconnectPending(true);
    setActionError('');
    try {
      const response = await fetch(`/api/v1/capture/sources/${source.id}/disconnect`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });
      if (!response.ok) throw new Error(await responseError(response, 'The source could not be disconnected.'));
      if (!mounted.current) return;
      workLifetime.current += 1;
      setDisconnected(true);
      setSyncPending(false);
      setScopePending(false);
      setScopeChanged(false);
      setMore(false);
      setSyncResult('');
      setActionError('');
      onChanged();
    } catch (error) {
      if (mounted.current) setActionError((error as Error).message || 'The source could not be disconnected.');
    } finally {
      if (mounted.current) setDisconnectPending(false);
    }
  }

  return <article id={`capture-source-${source.id}`} className="capture-source" aria-label={source.name} tabIndex={-1}>
    <div className="capture-source-heading">
      <div><h3>{source.name}</h3><p>{kinds[source.adapter] ?? source.adapter}</p></div>
      <span className={`capture-source-status${isUnavailableSource(source) ? ' capture-source-status--outage' : accessRevoked ? ' capture-source-status--revoked' : ''}`}>{statusLabel(source, receivesMail)}</span>
    </div>
    <dl className="records-detail-list">
      <div><dt>Last success</dt><dd>{when(source.last_success_at)}</dd></div>
      <div><dt>Captured</dt><dd>{source.captured_count}</dd></div>
      <div><dt>Not stored</dt><dd>{source.skipped_count}</dd></div>
      <div><dt>Proposals waiting</dt><dd>{source.proposals_waiting}</dd></div>
      {source.last_error ? <div className="capture-source-error"><dt>Last error</dt><dd>{source.last_error}</dd></div> : null}
    </dl>

    {source.adapter === 'file' ? <p className="capture-file-source-note"><a href="/app/settings/capture/connect/files">Upload more files</a> to add evidence from this source.</p>
    : source.adapter === 'forward' ? <>
      {actionError ? <OperatorState kind="error">{actionError}</OperatorState> : null}
      {!receivesMail ? <p className="capture-file-source-note">This Orbit can’t receive mail yet, so nothing new arrives at this address. Its earlier captures stay. <a href="/app/settings/capture/connect/address">See the one-time setup</a>.</p> : null}
      <div className="capture-source-actions">
        {source.state !== 'disconnected' ? <a className="orbit-button orbit-button--primary" href="/app/settings/capture/connect/address">{source.has_credential ? 'Show my Orbit address' : 'Create a new address'}</a> : <a className="orbit-button orbit-button--primary" href="/app/settings/capture/connect/address">Create a new address</a>}
        {source.state !== 'disconnected' ? <button className="orbit-button orbit-button--quiet" type="button" disabled={disconnectPending} onClick={() => void disconnect()}>Disconnect {source.name}</button> : null}
      </div>
    </> : <>
      {needsReconnect ? <section className="capture-source-reconnect" aria-label={`Reconnect ${source.name}`}>
        <h4>{accessRevoked ? 'Reconnect after access was revoked' : source.state === 'disconnected' ? 'Reconnect this disconnected source' : !source.has_credential ? 'Reconnect after restore' : 'Reconnect this source'}</h4>
        {oauth ? <><p>Paste the same Client ID and a current Client secret. Your captured evidence and proposal history stay in place.</p>
          <a className="orbit-button orbit-button--primary" href={`/app/settings/capture/connect/${source.adapter}?step=5&source=${encodeURIComponent(source.id)}`}>Reconnect {source.name}</a></>
        : <><p>Paste the calendar’s current link. Captured meetings stay in place.</p><a className="orbit-button orbit-button--primary" href="/app/settings/capture/connect/calendar">Add the calendar again</a></>}
      </section> : oauth ? <CaptureScope
        source={source}
        onChanged={() => { if (isCurrent(scopeLifetime)) onChanged(); }}
        onBusyChange={(pending) => { if (isCurrent(scopeLifetime)) setScopePending(pending); }}
        onScopeChanged={(changed) => { if (isCurrent(scopeLifetime)) setScopeChanged(changed); }}
        busy={busy}
      /> : null}

      {actionError ? <OperatorState kind="error">{actionError}</OperatorState> : null}
      {syncResult ? <OperatorState>{syncResult}</OperatorState> : null}
      {!needsReconnect ? <div className="capture-source-actions">
        <button className="orbit-button orbit-button--primary" type="button" disabled={busy || source.state === 'syncing' || !persistedHasScope || scopeChanged} onClick={() => void syncNow()}>{syncPending || source.state === 'syncing' ? 'Syncing…' : more ? 'Continue sync' : scopeChanged ? 'Save scope before syncing' : persistedHasScope ? (oauth ? 'Sync now' : 'Check now') : 'Choose a source before syncing'}</button>
        <button className="orbit-button orbit-button--quiet" type="button" disabled={disconnectPending} onClick={() => void disconnect()}>Disconnect {source.name}</button>
      </div> : source.state !== 'disconnected' ? <button className="orbit-button orbit-button--quiet" type="button" disabled={disconnectPending} onClick={() => void disconnect()}>Disconnect {source.name}</button> : null}
    </>}
  </article>;
}
