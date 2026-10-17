import { useCallback, useState, type FormEvent } from 'react';
import { ConsoleLink } from './capture-guide';
import { CopyField } from './capture-copy-field';
import { EnvironmentField, useDeployEnvironment } from './deploy-environment';
import { OperatorState } from './operator-shell';
import { useOperatorResource } from './use-operator-resource';
import {formatDate} from './formatters';

interface Confirmation { provider: 'Gmail'; account: string | null; code: string | null; link: string | null; receivedAt: string }
interface ForwardStatus { configured: boolean; available: boolean; local: boolean; address: string | null; confirmations: Confirmation[] }

const keeps = 'Orbit keeps a message only when someone in it is already a contact, or writes from the domain of a company in Orbit. Nothing is ever sent from your address.';

/** Shown only when the installation has no receiving mailbox: the one-time hosting step, in plain words. */
function NotConfigured() {
  const { environment, setEnvironment, name } = useDeployEnvironment();
  return <div className="capture-panel">
    <h2>This Orbit can’t receive mail yet</h2>
    <p>Whoever installed Orbit does this once, in the Cloudflare account Orbit runs on. It needs <strong>a domain of your own that uses Cloudflare</strong>: Orbit’s own <code>workers.dev</code> address cannot receive mail. With a domain, it takes about five minutes:</p>
    <EnvironmentField id="address-environment-hint" environment={environment} setEnvironment={setEnvironment}/>
    <ol className="capture-plain-steps">
      <li>In Cloudflare, open your domain, then <strong>Email</strong> › <strong>Email Routing</strong>, and turn it on for a spare subdomain such as <code>capture.example.com</code> (your normal mail is not affected).</li>
      <li>Under <strong>Routing rules</strong>, add the address <code>orbit@capture.example.com</code> with the action <strong>Send to a Worker</strong> and choose the Worker <code>sales-orbit-{name}</code>, this Orbit.</li>
      <li>Under <strong>Settings</strong>, turn on <strong>Subaddressing</strong>, so private tags like <code>orbit+abc@…</code> reach the same rule.</li>
      <li>In the Orbit folder you deployed from, run this, with your own address in place of <code>orbit@capture.example.com</code>, then come back here:<CopyField label="Set the Orbit address command" value={`CAPTURE_MAIL_ADDRESS=orbit@capture.example.com rer deploy --env-file .dev.vars.deploy --environment ${name} --set-secret CAPTURE_MAIL_ADDRESS`}/></li>
    </ol>
    <p className="capture-panel__aside">Until then, the calendar link and file upload work without it.</p>
  </div>;
}

function Create() {
  return <div className="capture-panel capture-panel--primary">
    <h2>Create your Orbit address</h2>
    <p>You get a private email address. Any customer mail you send or forward to it lands in Orbit, filed against the right contact.</p>
    <form method="post" action="/api/v1/capture/forward"><button className="orbit-button orbit-button--primary" type="submit">Create my Orbit address</button></form>
    <p className="capture-panel__aside">{keeps}</p>
  </div>;
}

interface TryOutcome { result: 'refused' | 'confirmation' | 'captured'; reason?: string; summary?: { captured: number; skipped: number; proposals: number; skipReasons: Record<string, number> } }
function outcomeText(outcome: TryOutcome) {
  if (outcome.result === 'refused') return outcome.reason ?? 'Orbit did not accept that message.';
  if (outcome.result === 'confirmation') return 'That was a forwarding confirmation; its code is shown below.';
  const summary = outcome.summary!;
  if (summary.captured) return `Captured. ${summary.proposals} proposed ${summary.proposals === 1 ? 'change' : 'changes'} to review.`;
  return `Not stored: ${Object.keys(summary.skipReasons)[0] ?? 'already captured'}.`;
}
/** Mail from the internet cannot reach Orbit on this computer; a saved message takes the same receiving path. */
function TryLocally({ onCaptured }: { onCaptured: () => void }) {
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setResult('');
    try {
      const response = await fetch('/api/v1/capture/forward/try', { method: 'POST', credentials: 'same-origin', body: new FormData(form) });
      const body = await response.json().catch(() => ({})) as TryOutcome & { error?: string };
      setResult(response.ok ? outcomeText(body) : body.error ?? 'Orbit did not accept that message.');
      form.reset(); onCaptured();
    } finally { setBusy(false); }
  }
  return <div className="capture-local-note">
    <p><strong>Running on this computer.</strong> Mail from the internet can’t reach Orbit here; once Orbit is deployed, mail sent to this address arrives on its own. To see it work now, save a customer email as an .eml file (in Gmail: ⋮ › Download message) and send it to your address:</p>
    <form className="capture-try-form" onSubmit={send}>
      <label>Saved email (.eml)<input type="file" name="message" accept=".eml,message/rfc822" required /></label>
      <button className="orbit-button orbit-button--quiet" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send to my Orbit address'}</button>
    </form>
    {result ? <p role="status">{result}</p> : null}
  </div>;
}

function ConfirmationNotice({ confirmation }: { confirmation: Confirmation }) {
  return <div className="capture-confirmation" role="status">
    <h3>Gmail asked to confirm forwarding{confirmation.account ? ` from ${confirmation.account}` : ''}</h3>
    {confirmation.code ? <p>Confirmation code: <strong className="capture-confirmation__code">{confirmation.code}</strong></p> : null}
    <p>Enter the code in Gmail’s forwarding settings{confirmation.link ? <>, or <a href={confirmation.link} target="_blank" rel="noopener noreferrer">open Google’s confirmation link</a></> : null}. Received {formatDate(confirmation.receivedAt)}.</p>
  </div>;
}

function Address({ status, onChanged }: { status: ForwardStatus & { address: string }; onChanged: () => void }) {
  return <>
    <div className="capture-panel capture-panel--primary">
      <h2>Your Orbit address</h2>
      <CopyField label="Your Orbit address" value={status.address} />
      <p className="capture-panel__aside">{keeps}</p>
      {status.local ? <TryLocally onCaptured={onChanged} /> : null}
    </div>
    {status.confirmations.map((confirmation) => <ConfirmationNotice key={confirmation.receivedAt} confirmation={confirmation} />)}
    <h2 className="capture-section-title">Three ways to use it</h2>
    <div className="capture-ways">
      <section className="capture-way" aria-labelledby="way-bcc">
        <span className="capture-way__number" aria-hidden="true">1</span>
        <h3 id="way-bcc">Bcc it when you write</h3>
        <p>When you email a customer, add your Orbit address in <strong>Bcc</strong> <span className="capture-term">(a hidden copy the customer doesn’t see)</span>. Orbit files what you sent.</p>
      </section>
      <section className="capture-way" aria-labelledby="way-forward">
        <span className="capture-way__number" aria-hidden="true">2</span>
        <h3 id="way-forward">Forward a conversation</h3>
        <p>Forward any customer email to your Orbit address. Orbit reads who originally wrote it, so a customer’s reply counts as their reply.</p>
      </section>
      <section className="capture-way" aria-labelledby="way-auto">
        <span className="capture-way__number" aria-hidden="true">3</span>
        <h3 id="way-auto">Forward customer mail automatically</h3>
        <details className="capture-how">
          <summary>In Gmail or Google Workspace</summary>
          <ol>
            <li><ConsoleLink href="https://mail.google.com/mail/u/0/#settings/fwdandpop">Open Gmail’s forwarding settings</ConsoleLink> and choose <strong>Add a forwarding address</strong>. Paste your Orbit address.</li>
            <li>Gmail sends a confirmation code to Orbit. It appears on this page within a minute; refresh if needed. Enter it in Gmail and choose <strong>Verify</strong>.</li>
            <li>Leave forwarding off there. Instead, search Gmail for a customer (for example <code>from:@customer.example</code>), open the search options, choose <strong>Create filter</strong>, tick <strong>Forward it to</strong> and pick your Orbit address.</li>
          </ol>
        </details>
        <details className="capture-how">
          <summary>In Outlook or Microsoft 365</summary>
          <ol>
            <li>Open rules in <ConsoleLink href="https://outlook.office.com/mail/options/mail/rules">Outlook for work</ConsoleLink> or <ConsoleLink href="https://outlook.live.com/mail/0/options/mail/rules">Outlook.com</ConsoleLink> and choose <strong>Add new rule</strong>.</li>
            <li>Condition: <strong>From</strong> your customer, or <strong>Sender address includes</strong> their domain. Action: <strong>Forward to</strong> your Orbit address. Save.</li>
            <li>If Microsoft 365 says forwarding outside your organisation is blocked, your administrator can allow it for your mailbox.</li>
          </ol>
        </details>
      </section>
    </div>
    <details className="capture-how capture-replace">
      <summary>Make a new address</summary>
      <p>If your address was shared by mistake, replace it. The old one stops reaching Orbit at once; mail already captured stays.</p>
      <form method="post" action="/api/v1/capture/forward"><button className="orbit-button orbit-button--quiet" type="submit">Replace my Orbit address</button></form>
    </details>
  </>;
}

export function CaptureAddressSetup({ error }: { error?: string }) {
  const load = useCallback(async () => {
    const response = await fetch('/api/v1/capture/forward', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Your Orbit address could not load.');
    return await response.json() as ForwardStatus;
  }, []);
  const status = useOperatorResource('capture-forward', load);
  return <>
    {error ? <OperatorState kind="error">{error}</OperatorState> : null}
    {status.loading ? <OperatorState>Loading your Orbit address…</OperatorState> : null}
    {status.error ? <OperatorState kind="error">{status.error.message}</OperatorState> : null}
    {status.data ? !status.data.available ? <OperatorState kind="error">This installation is missing ORBIT_ENCRYPTION_KEY, so it cannot keep a private address.</OperatorState>
      : !status.data.configured ? <NotConfigured />
      : status.data.address ? <Address status={status.data as ForwardStatus & { address: string }} onChanged={status.reload} />
      : <Create /> : null}
  </>;
}
