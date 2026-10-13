import { useId } from 'react';
import type { CaptureProviderDirectory, CaptureProviderInfo, CaptureSource } from './capture-types';

function providerAction(provider: CaptureProviderInfo) {
  return `/api/v1/capture/oauth/${provider.id}/start`;
}

function Callback({ provider }: { provider: CaptureProviderInfo }) {
  return <p className="capture-callback"><strong>{provider.name} callback</strong><code>{provider.redirectUri}</code></p>;
}

export function CaptureProviderForm({
  directory,
  source,
  provider,
}: {
  directory: CaptureProviderDirectory;
  source?: CaptureSource;
  provider?: CaptureProviderInfo;
}) {
  const prefix = useId();
  const providers = source ? (provider ? [provider] : []) : directory.providers;

  if (providers.length === 0) {
    return <p className="capture-provider-unavailable">Provider connection details are unavailable in this installation. Try again when the connection service is available.</p>;
  }

  if (!directory.available) return <div className="capture-provider-unavailable">
    <p>Provider connections are unavailable in this installation. The callback addresses are shown so you can register them when the connection service is ready.</p>
    {providers.map((item) => <Callback key={item.id} provider={item} />)}
  </div>;

  return <div className="capture-provider-forms">
    <p>Enter the credentials for an OAuth client you own. Orbit stores them encrypted on this installation; they are not saved in browser storage.</p>
    {providers.map((item) => {
      const label = item.id === 'google' ? 'Google' : 'Microsoft';
      const nameId = `${prefix}-${item.id}-name`;
      const clientId = `${prefix}-${item.id}-client-id`;
      const clientSecret = `${prefix}-${item.id}-client-secret`;
      const tenantId = `${prefix}-${item.id}-tenant`;
      return <form key={item.id} aria-label={`${source ? 'Reconnect' : 'Connect'} ${label}`} method="post" action={providerAction(item)}>
        {source ? <input type="hidden" name="sourceId" value={source.id} /> : null}
        <div className="capture-provider-fields">
          <label htmlFor={nameId}>Connection name
            <input id={nameId} name="name" required maxLength={120} defaultValue={source?.name ?? ''} autoComplete="off" />
          </label>
          <label htmlFor={clientId}>{label} client ID
            <input id={clientId} name="clientId" type="text" required maxLength={1000} autoComplete="off" />
          </label>
          <label htmlFor={clientSecret}>{label} client secret
            <input id={clientSecret} name="clientSecret" type="password" required maxLength={4000} autoComplete="new-password" />
          </label>
        </div>
        {item.id === 'microsoft' ? <details className="capture-advanced">
          <summary>Microsoft sign-in options</summary>
          <label htmlFor={tenantId}>Tenant
            <input id={tenantId} name="tenant" defaultValue="common" autoComplete="off" />
          </label>
          <p>Use “common” for work, school and personal Microsoft accounts. Enter a directory ID or domain for a single tenant; use “organizations” or “consumers” to limit the account type.</p>
        </details> : null}
        <fieldset className="capture-provider-choice">
          <legend>{source ? 'Reconnect this source' : 'Choose a provider'}</legend>
          <button className="orbit-button orbit-button--primary" type="submit" formAction={providerAction(item)}>
            {source ? `Reconnect ${label}` : `Connect ${label}`}
          </button>
        </fieldset>
        <Callback provider={item} />
      </form>;
    })}
    <p className="capture-provider-help">In the provider console, register the exact callback shown below as a Web redirect URI. After consent, choose the labels, folders or calendars Orbit may read. Leaving calendars unchecked is valid when you only want mail.</p>
  </div>;
}

export function CaptureProviderSetup({
  directory,
  loading,
  error,
  onRetry,
}: {
  directory: CaptureProviderDirectory | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  return <section className="operator-surface operator-detail__section capture-provider-section" aria-labelledby="capture-provider-heading">
    <h2 id="capture-provider-heading">Connect Google or Microsoft</h2>
    <p>Connect your own Google or Microsoft account to choose the mail labels, folders and calendars Orbit reads. Review proposed record changes here; nothing is sent.</p>
    {loading ? <p role="status">Loading provider connection details…</p> : null}
    {error ? <div role="alert" className="capture-provider-load-error"><p>{error}</p><button className="orbit-button orbit-button--quiet" type="button" onClick={onRetry}>Try again</button></div> : null}
    {directory ? <CaptureProviderForm directory={directory} /> : null}
  </section>;
}
