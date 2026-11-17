import { useEffect, useRef } from 'react';
import { workspaceDefaults } from '../../identity/bootstrap';
import { AuthFrame } from '../../public/ui/auth/AuthFrame';

export interface SetupView {
  owner: boolean;
  displayName: string;
  workspace: { name: string; timezone: string; currency: string } | null;
  stages: string[];
  error?: string;
}

/**
 * First-run setup. The plain form posts before hydration; finishing it opens the app. The business name starts empty
 * rather than showing the stored stand-in, and an untouched default time zone becomes the browser's own once scripts run.
 */
export function SetupPage({ view }: { view: SetupView }) {
  const timezone = useRef<HTMLSelectElement>(null);
  const storedZone = view.workspace?.timezone ?? workspaceDefaults.timezone;
  const usZones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'];
  const otherZones = [...new Set(['UTC', storedZone, ...Intl.supportedValuesOf('timeZone')])].filter(zone => !usZones.includes(zone));
  useEffect(() => {
    const field = timezone.current;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (field && detected && storedZone === workspaceDefaults.timezone && field.value === storedZone) field.value = detected;
  }, [storedZone]);
  const ownerName = view.displayName === 'Owner' ? '' : view.displayName;
  const name = view.workspace?.name && view.workspace.name !== workspaceDefaults.name ? view.workspace.name : '';
  const signOut = <form method="post" action="/auth/signout"><button className="ob-auth-signout">Sign out</button></form>;
  return <AuthFrame layout="bar" action={signOut}>
    <p className="ob-auth-eyebrow">First-run setup</p>
    <h1>Set up your workspace.</h1>
    {view.owner ? <>
      <p className="ob-auth-lead">Welcome{ownerName ? `, ${ownerName}` : ''}. Tell Orbit who you are and how to present your business. You can change these later in Settings.</p>
      <form method="post" action="/api/v1/setup" className="ob-auth-form">
        <label htmlFor="setup-owner-name">Your name</label>
        <input id="setup-owner-name" name="ownerName" required maxLength={200} autoComplete="name" defaultValue={ownerName} aria-describedby="setup-owner-name-help" />
        <p id="setup-owner-name-help" className="ob-auth-help">Shown to your team as the owner of deals and actions.</p>
        <label htmlFor="setup-name">Business name</label>
        <input id="setup-name" name="name" required maxLength={200} autoComplete="organization" defaultValue={name} aria-describedby="setup-name-help" />
        <p id="setup-name-help" className="ob-auth-help">Customers see it as the sender name on the mail you approve.</p>
        <label htmlFor="setup-timezone">Time zone</label>
        <select id="setup-timezone" ref={timezone} name="timezone" required defaultValue={storedZone} aria-describedby="setup-timezone-help">
          <optgroup label="United States">{usZones.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</optgroup>
          <optgroup label="Other time zones">{otherZones.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</optgroup>
        </select>
        <p id="setup-timezone-help" className="ob-auth-help">Choose the time zone for your working hours and reports.</p>
        <label htmlFor="setup-currency">Currency</label>
        <input id="setup-currency" name="currency" required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" defaultValue={view.workspace?.currency ?? workspaceDefaults.currency} />
        <label htmlFor="setup-stages">Pipeline stages</label>
        <textarea id="setup-stages" name="stages" required rows={4} defaultValue={view.stages.join('\n')} aria-describedby="setup-stages-help" />
        <p id="setup-stages-help" className="ob-auth-help">One stage per line, in pipeline order. Win chances start at 10% and increase to 90%; adjust them later in Settings.</p>
        <button className="ob-pill">Finish setup</button>
      </form>
    </> : <p className="ob-auth-lead">The workspace owner is finishing first-run setup. Try again once they have finished.</p>}
    {view.error && <p className="ob-auth-status" role="alert">{view.error}</p>}
  </AuthFrame>;
}
