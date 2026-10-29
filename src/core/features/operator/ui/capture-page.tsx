import {CaptureMailRule} from './capture-mail-rule';
import { useCallback, useEffect, useRef, useState } from 'react';
import './records.css';
import './capture-providers.css';
import './capture-setup.css';
import { OperatorState } from './operator-shell';
import { useOperatorResource } from './use-operator-resource';
import { CaptureSource } from './capture-source';
import type { CaptureSource as CaptureSourceRecord } from './capture-types';

interface Overview { sources: CaptureSourceRecord[]; forward: { configured: boolean; available: boolean; address: string | null } }

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const icons = {
  mail: <svg viewBox="0 0 48 48" aria-hidden="true"><path {...stroke} d="M8 18h32v20H8zM8 18l16 12 16-12M24 6v6M15 9l3 4M33 9l-3 4" /></svg>,
  calendar: <svg viewBox="0 0 24 24" aria-hidden="true"><path {...stroke} d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5" /></svg>,
  google: <img src="/capture/google.svg" alt="" aria-hidden="true" />,
  microsoft: <img src="/capture/microsoft.svg" alt="" aria-hidden="true" />,
  files: <svg viewBox="0 0 24 24" aria-hidden="true"><path {...stroke} d="M8 7V3h8l4 4v11h-4M16 3v4h4M4 7h8l4 4v10H4zM12 7v4h4" /></svg>,
};
const ways = [
  { href: '/app/settings/capture/connect/calendar', icon: icons.calendar, title: 'Calendar link', text: 'Paste your calendar’s private iCal address. Works with Google, Outlook and Apple calendars.' },
  { href: '/app/settings/capture/connect/google', icon: icons.google, title: 'Google account', text: 'Read the Gmail labels and calendars you choose. About 10 minutes in Google Cloud.' },
  { href: '/app/settings/capture/connect/microsoft', icon: icons.microsoft, title: 'Microsoft account', text: 'Read the Outlook folders and calendars you choose. About 10 minutes in Microsoft Entra.' },
  { href: '/app/settings/capture/connect/files', icon: icons.files, title: 'Mail and calendar files', text: 'Upload .eml, mbox or .ics files.' },
];

function OtherWays({ title, skip }: { title: string; skip?: string }) {
  return <section className="capture-ways-list" aria-labelledby="capture-other-ways">
    <h2 id="capture-other-ways">{title}</h2>
    <ul>{ways.filter((way) => way.href !== skip).map((way) => <li key={way.href}>
      <span className="capture-ways-list__icon">{way.icon}</span><h3>{way.title}</h3><p>{way.text}</p>
      <a href={way.href} aria-label={`Set up ${way.title.toLowerCase()}`}>Set up <span aria-hidden="true">→</span></a>
    </li>)}</ul>
  </section>;
}

/** The empty page: one primary action, the Orbit address, and quieter alternatives. */
function Start({ forward }: { forward: Overview['forward'] }) {
  const ready = forward.configured && forward.available;
  return <>
    <p className="capture-lead">Orbit reads customer email and meetings so it can stop outreach when someone replies and suggest record updates you approve. Nothing is sent from here.</p>
    <section className="capture-start" aria-labelledby="capture-start-heading">
      <span className="capture-start__icon">{icons.mail}</span>
      <div className="capture-start__main">
        <h2 id="capture-start-heading">Your Orbit address</h2>
        <p>Send customer mail to a private address and Orbit files it against the right contact.</p>
        {ready ? <form method="post" action="/api/v1/capture/forward"><button className="orbit-button orbit-button--primary capture-start__button" type="submit">Create my Orbit address</button></form>
          : <a className="orbit-button orbit-button--primary capture-start__button" href="/app/settings/capture/connect/address">Get my Orbit address</a>}
        {ready ? null : <p className="capture-note">A one-time step first: the address needs Orbit hosted on Cloudflare with a domain of your own. Without one, use the calendar link, a file upload, or Google or Microsoft below.</p>}
      </div>
      <ol className="capture-start__hints">
        <li><span aria-hidden="true">1</span>Copy your address</li>
        <li><span aria-hidden="true">2</span>Bcc it when you write to a customer, or forward a thread</li>
        <li><span aria-hidden="true">3</span>Orbit files it. You approve any changes.</li>
      </ol>
    </section>
    <OtherWays title="Other ways to connect" />
  </>;
}

function Daily({ data, onChanged, focus }: { data: Overview; onChanged: () => void; focus: string }) {
  const waiting = data.sources.reduce((total, source) => total + source.proposals_waiting, 0);
  const hasAddress = data.sources.some((source) => source.adapter === 'forward' && source.state !== 'disconnected');
  useEffect(() => {
    if (!focus) return;
    const card = document.getElementById(`capture-source-${focus}`);
    card?.scrollIntoView({ block: 'center' });
    card?.focus({ preventScroll: true });
  }, [focus]);
  return <>
    <a className={`capture-review-banner${waiting ? '' : ' capture-review-banner--quiet'}`} href="/app/review">
      <span><strong>{waiting ? `${waiting} proposed ${waiting === 1 ? 'change' : 'changes'} to review` : 'No proposed changes are waiting'}</strong>
        <small>{waiting ? 'Orbit changes nothing until you accept.' : 'New evidence shows up here first.'}</small></span>
      <span className="capture-review-banner__go">Review <span aria-hidden="true">→</span></span>
    </a>
    <section className="capture-sources-section" aria-labelledby="capture-sources">
      <h2 id="capture-sources">Connected</h2>
      {data.sources.map((source) => <CaptureSource key={source.id} source={source} onChanged={onChanged} receivesMail={data.forward.configured && data.forward.available} />)}
    </section>
    {!hasAddress ? <section className="capture-ways-list" aria-labelledby="capture-address-way"><h2 id="capture-address-way">Add your Orbit address</h2><ul><li>
      <span className="capture-ways-list__icon">{icons.mail}</span><h3>Orbit address</h3><p>Bcc or forward customer mail to a private address. No setup in Google or Microsoft.</p>
      <a href="/app/settings/capture/connect/address" aria-label="Set up your Orbit address">Set up <span aria-hidden="true">→</span></a></li></ul></section> : null}
    <OtherWays title="Connect another" />
  </>;
}

/** Settings › Capture: the mail and meetings Orbit reads, and the ways to add more. */
export function CaptureSettings() {
  const load = useCallback(async () => {
    const [sources, forward] = await Promise.all([fetch('/api/v1/capture/sources', { credentials: 'same-origin' }), fetch('/api/v1/capture/forward', { credentials: 'same-origin' })]);
    if (!sources.ok || !forward.ok) throw new Error('Capture could not load.');
    return { sources: (await sources.json() as { sources: CaptureSourceRecord[] }).sources, forward: await forward.json() } as Overview;
  }, []);
  const overview = useOperatorResource('capture-overview', load);
  const reload = useRef(overview.reload);
  reload.current = overview.reload;
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [focus, setFocus] = useState('');
  // Setup forms return here with a short status in the address.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected'), saved = params.get('scopeSaved'), failure = params.get('error');
    if (!connected && !saved && !failure) return;
    if (connected) { setFocus(connected); setNotice('Connected. Orbit has read what it can; new items arrive on their own.'); }
    if (saved) { setFocus(saved); setNotice('Saved. Orbit reads only the labels, folders and calendars you chose, and checks for new mail every few minutes.'); }
    if (failure) setError(failure);
    reload.current();
    window.history.replaceState(null, '', '/app/settings/capture');
  }, []);
  const live = overview.data?.sources.filter((source) => source.state !== 'disconnected' || source.captured_count > 0) ?? [];
  return <section aria-label="Mail and meetings">
    {notice ? <OperatorState>{notice}</OperatorState> : null}
    {error ? <OperatorState kind="error">{error}</OperatorState> : null}
    {overview.loading ? <OperatorState>Loading Capture…</OperatorState> : null}
    {overview.error ? <OperatorState kind="error">{overview.error.message}</OperatorState> : null}
    {overview.data ? <CaptureMailRule/> : null}
    {overview.data ? live.length ? <Daily data={{ ...overview.data, sources: live }} onChanged={overview.reload} focus={focus} /> : <Start forward={overview.data.forward} /> : null}
  </section>;
}
