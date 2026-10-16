import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouterState } from '@tanstack/react-router';
import './records.css';
import './capture-providers.css';
import './capture-setup.css';
import { OperatorShell, OperatorState } from './operator-shell';
import { useOperatorResource } from './use-operator-resource';
import { CaptureGuide } from './capture-guide';
import { googleSteps, microsoftSteps } from './capture-guide-providers';
import { CaptureAddressSetup } from './capture-address-setup';
import { CaptureCalendarSetup } from './capture-calendar-setup';
import { CaptureFilesSetup } from './capture-files-setup';
import { CaptureScope } from './capture-scope';
import type { CaptureProviderDirectory, CaptureSource } from './capture-types';

const titles: Record<string, { title: string; lead: string }> = {
  address: { title: 'Send mail to Orbit', lead: 'The quickest way to start: no setup in Google or Microsoft.' },
  calendar: { title: 'Add your calendar', lead: 'Paste the private link your calendar already offers. No setup in Google or Microsoft.' },
  google: { title: 'Connect your Google account', lead: 'Google asks every app that reads Gmail to have its own sign-in key. You make one in Google Cloud once. It takes about 10 minutes and costs nothing.' },
  microsoft: { title: 'Connect your Microsoft account', lead: 'Microsoft asks every app that reads Outlook to be registered. You register Orbit once in Microsoft Entra. It takes about 10 minutes and costs nothing.' },
  files: { title: 'Upload mail and calendar files', lead: 'Bring in history you exported from any mail or calendar app.' },
};

function useSources() {
  const load = useCallback(async () => {
    const response = await fetch('/api/v1/capture/sources', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Capture sources could not load.');
    return (await response.json() as { sources: CaptureSource[] }).sources;
  }, []);
  return useOperatorResource('capture-sources', load);
}

/** Step 6: after the provider sends the owner back, choose what Orbit may read. */
function ChooseScope({ sourceId }: { sourceId: string | null }) {
  const sources = useSources();
  const source = sources.data?.find((item) => item.id === sourceId);
  if (!sourceId) return <p className="capture-guide__lead">Finish step 5 first. After you approve Orbit, you come back here to choose exactly which mail and calendars Orbit reads. Until you save a choice, Orbit reads nothing.</p>;
  if (sources.error) return <OperatorState kind="error">{sources.error.message}</OperatorState>;
  if (!source) return <OperatorState>Loading your connection…</OperatorState>;
  return <>
    <p className="capture-guide__lead">Connected. Choose at least one label, folder or calendar; Orbit reads only what you tick.</p>
    <CaptureScope source={source} busy={false} onBusyChange={() => {}} onScopeChanged={() => {}} onChanged={() => window.location.assign(`/app/capture?scopeSaved=${encodeURIComponent(source.id)}`)} />
  </>;
}

function ProviderGuide({ method, search }: { method: 'google' | 'microsoft'; search: URLSearchParams }) {
  const [directory, setDirectory] = useState<CaptureProviderDirectory | null>(null);
  const [error, setError] = useState('');
  const sources = useSources();
  useEffect(() => {
    void fetch('/api/v1/capture/providers', { credentials: 'same-origin' }).then(async (response) => {
      const value = await response.json().catch(() => ({})) as CaptureProviderDirectory & { error?: string };
      if (!response.ok) throw new Error(value.error ?? 'Connection details could not load.');
      setDirectory(value);
    }).catch((next: unknown) => setError(next instanceof Error ? next.message : 'Connection details could not load.'));
  }, []);
  const provider = directory?.providers.find((item) => item.id === method);
  const reconnectId = search.get('source'), reconnect = sources.data?.find((item) => item.id === reconnectId && item.adapter === method);
  if (error) return <OperatorState kind="error">{error}</OperatorState>;
  if (!directory) return <OperatorState>Loading…</OperatorState>;
  if (!directory.available || !provider) return <OperatorState kind="error">This installation is missing ORBIT_ENCRYPTION_KEY, so it cannot keep a sign-in key safely.</OperatorState>;
  const finish = <ChooseScope sourceId={search.get('connected')} />;
  const steps = method === 'google' ? googleSteps(provider, finish, reconnect) : microsoftSteps(provider, finish, reconnect);
  const step = Number(search.get('step'));
  return <>
    {search.get('error') ? <OperatorState kind="error">{search.get('error')}</OperatorState> : null}
    <CaptureGuide label={method === 'google' ? 'Google' : 'Microsoft'} steps={steps} initial={Number.isInteger(step) && step >= 1 && step <= steps.length ? step : 1} />
  </>;
}

export function CaptureConnectPage() {
  const { method } = useParams({ strict: false }) as { method?: string };
  const searchText = useRouterState({ select: (state) => state.location.searchStr });
  const search = new URLSearchParams(searchText);
  const page = titles[method ?? ''];
  if (!page) return <OperatorShell eyebrow="Capture" title="Not found"><OperatorState kind="error">There is no such way to connect. <a href="/app/capture">Back to Capture</a></OperatorState></OperatorShell>;
  const error = search.get('error') ?? undefined;
  return <OperatorShell eyebrow={<nav className="capture-breadcrumb" aria-label="Breadcrumb"><a href="/app/capture">Capture</a> <span aria-hidden="true">/</span> <span aria-current="page">{page.title}</span></nav>} title={page.title}>
    <p className="capture-lead">{page.lead}</p>
    {method === 'google' || method === 'microsoft' ? <ProviderGuide key={method} method={method} search={search} />
      : method === 'address' ? <CaptureAddressSetup error={error} />
      : method === 'calendar' ? <CaptureCalendarSetup error={error} />
      : <CaptureFilesSetup error={error} />}
  </OperatorShell>;
}
