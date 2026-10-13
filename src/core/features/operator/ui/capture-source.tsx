import { useEffect, useRef, useState } from 'react';
import { OperatorState } from './operator-shell';
import { CaptureProviderForm } from './capture-provider-form';
import { CaptureScope } from './capture-scope';
import {
  isCaptureProvider,
  isRevokedSource,
  isUnavailableSource,
  type CaptureProviderDirectory,
  type CaptureSource,
  type CaptureSyncResponse,
} from './capture-types';

const when = (value: string | null) => value ? new Date(value).toLocaleString() : 'Never';

function statusLabel(source: CaptureSource) {
  if (source.state === 'disconnected') return 'Disconnected';
  if (source.state === 'syncing') return 'Syncing';
  if (source.adapter === 'file') return 'Connected';
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

export function CaptureSource({
  source: savedSource,
  directory,
  onChanged,
}: {
  source: CaptureSource;
  directory: CaptureProviderDirectory | null;
  onChanged: () => void;
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
  const providerInfo = directory?.providers.find((provider) => provider.id === source.adapter);
  const canReconnect = Boolean(directory) && isCaptureProvider(source.adapter) && Boolean(providerInfo);
  const accessRevoked = isRevokedSource(source);
  const needsReconnect = source.state === 'disconnected' || accessRevoked || source.state === 'error' || !source.has_credential;
  const persistedHasScope = (source.scope.mail?.folders.length ?? 0) > 0 || (source.scope.calendars?.length ?? 0) > 0;

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
      <div><h3>{source.name}</h3><p>{source.adapter === 'google' ? 'Google' : source.adapter === 'microsoft' ? 'Microsoft' : 'Files'}</p></div>
      <span className={`capture-source-status${isUnavailableSource(source) ? ' capture-source-status--outage' : accessRevoked ? ' capture-source-status--revoked' : ''}`}>{statusLabel(source)}</span>
    </div>
    <dl className="records-detail-list">
      <div><dt>Last success</dt><dd>{when(source.last_success_at)}</dd></div>
      <div><dt>Captured</dt><dd>{source.captured_count}</dd></div>
      <div><dt>Not stored</dt><dd>{source.skipped_count}</dd></div>
      <div><dt>Proposals waiting</dt><dd>{source.proposals_waiting}</dd></div>
      {source.last_error ? <div className="capture-source-error"><dt>Last error</dt><dd>{source.last_error}</dd></div> : null}
    </dl>

    {source.adapter !== 'file' ? <>
      {needsReconnect ? <section className="capture-source-reconnect" aria-label={`Reconnect ${source.name}`}>
        <h4>{accessRevoked ? 'Reconnect after access was revoked' : source.state === 'disconnected' ? 'Reconnect this disconnected source' : !source.has_credential ? 'Reconnect after restore' : 'Reconnect this source'}</h4>
        <p>Enter the same provider client ID and a current client secret. Orbit will return here; your captured evidence and proposal history stay in place.</p>
        {canReconnect && directory ? <CaptureProviderForm directory={directory} source={source} provider={providerInfo} /> : <p>Provider connection details are unavailable; try again when the service is available.</p>}
      </section> : <CaptureScope
        source={source}
        onChanged={() => { if (isCurrent(scopeLifetime)) onChanged(); }}
        onBusyChange={(pending) => { if (isCurrent(scopeLifetime)) setScopePending(pending); }}
        onScopeChanged={(changed) => { if (isCurrent(scopeLifetime)) setScopeChanged(changed); }}
        busy={busy}
      />}

      {actionError ? <OperatorState kind="error">{actionError}</OperatorState> : null}
      {syncResult ? <OperatorState>{syncResult}</OperatorState> : null}
      {!needsReconnect ? <div className="capture-source-actions">
        <button className="orbit-button orbit-button--primary" type="button" disabled={busy || source.state === 'syncing' || !persistedHasScope || scopeChanged} onClick={() => void syncNow()}>{syncPending || source.state === 'syncing' ? 'Syncing…' : more ? 'Continue sync' : scopeChanged ? 'Save scope before syncing' : persistedHasScope ? 'Sync now' : 'Choose a source before syncing'}</button>
        <button className="orbit-button orbit-button--quiet" type="button" disabled={disconnectPending} onClick={() => void disconnect()}>Disconnect {source.name}</button>
      </div> : <button className="orbit-button orbit-button--quiet" type="button" disabled={disconnectPending} onClick={() => void disconnect()}>Disconnect {source.name}</button>}
    </> : <p className="capture-file-source-note">Add files above to capture evidence from this source.</p>}
  </article>;
}
