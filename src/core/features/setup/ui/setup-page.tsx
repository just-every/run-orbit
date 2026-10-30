import { useEffect, useRef, useState } from 'react';
import { workspaceDefaults } from '../../identity/bootstrap';
import { AuthFrame } from '../../public/ui/auth/AuthFrame';

export interface SetupView {
  owner: boolean;
  displayName: string;
  workspace: { name: string; timezone: string; currency: string } | null;
  stages: string[];
  business?: { name?: string; ownerName?: string; timezone?: string };
  error?: string;
}

/**
 * First-run setup uses server-provided Business defaults without replacing owner edits.
 * The plain form posts before hydration; finishing it opens the app.
 */
export function SetupPage({ view }: { view: SetupView }) {
  const timezone = useRef<HTMLInputElement>(null);
  const [nameError, setNameError] = useState(false);
  const storedZone = view.workspace?.timezone && view.workspace.timezone !== workspaceDefaults.timezone
    ? view.workspace.timezone : view.business?.timezone ?? view.workspace?.timezone ?? workspaceDefaults.timezone;
  useEffect(() => {
    const field = timezone.current;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (field && detected && !view.business?.timezone && storedZone === workspaceDefaults.timezone && field.value === storedZone) field.value = detected;
  }, [storedZone, view.business?.timezone]);
  const ownerName = view.business?.ownerName ?? (view.displayName === 'Owner' ? '' : view.displayName);
  const name = view.workspace?.name && view.workspace.name !== workspaceDefaults.name ? view.workspace.name : view.business?.name ?? '';
  const signOut = <form method="post" action="/auth/signout"><button className="ob-auth-signout">Sign out</button></form>;
  return <AuthFrame layout="bar" action={signOut}>
    <p className="ob-auth-eyebrow">First-run setup</p>
    <h1>Set up your workspace.</h1>
    {view.owner ? <>
      <p className="ob-auth-lead">Welcome{ownerName ? `, ${ownerName}` : ''}. Tell Orbit who you are and how to present your business. You can change these later in Settings.</p>
      <form method="post" action="/api/v1/setup" className="ob-auth-form" noValidate onSubmit={event => {
        const form = event.currentTarget;
        const field = form.elements.namedItem('name') as HTMLInputElement;
        if (!field.value.trim()) { event.preventDefault(); setNameError(true); field.focus(); return; }
        if (!form.reportValidity()) event.preventDefault();
      }}>
        <label htmlFor="setup-owner-name">Your name</label>
        <input id="setup-owner-name" name="ownerName" required maxLength={200} autoComplete="name" defaultValue={ownerName} aria-describedby="setup-owner-name-help" />
        <p id="setup-owner-name-help" className="ob-auth-help">Shown to your team as the owner of deals and actions.</p>
        <label htmlFor="setup-name">Business name</label>
        <input id="setup-name" name="name" required maxLength={200} autoComplete="organization" defaultValue={name} aria-invalid={nameError || undefined} aria-describedby={nameError ? 'setup-name-error setup-name-help' : 'setup-name-help'} onChange={() => setNameError(false)} />
        {nameError && <p id="setup-name-error" className="ob-auth-status" role="alert">Enter your business name</p>}
        <p id="setup-name-help" className="ob-auth-help">Customers see it as the sender name on the mail you approve.</p>
        <label htmlFor="setup-timezone">Time zone</label>
        <input id="setup-timezone" ref={timezone} name="timezone" required maxLength={100} defaultValue={storedZone} aria-describedby="setup-timezone-help" />
        <p id="setup-timezone-help" className="ob-auth-help">An IANA time zone, for example Australia/Brisbane.</p>
        <label htmlFor="setup-currency">Currency</label>
        <input id="setup-currency" name="currency" required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" defaultValue={view.workspace?.currency ?? workspaceDefaults.currency} />
        <label htmlFor="setup-stages">Pipeline stages</label>
        <textarea id="setup-stages" name="stages" required rows={4} defaultValue={view.stages.join('\n')} aria-describedby="setup-stages-help" />
        <p id="setup-stages-help" className="ob-auth-help">One stage per line, in pipeline order.</p>
        <button className="ob-pill">Finish setup</button>
      </form>
    </> : <p className="ob-auth-lead">The workspace owner is finishing first-run setup. Try again once they have finished.</p>}
    {view.error && <p className="ob-auth-status" role="alert">{view.error}</p>}
  </AuthFrame>;
}
