import { useId } from 'react';
import type { CaptureProviderInfo } from './capture-types';

const names = { google: { key: 'Google', mailbox: 'Gmail' }, microsoft: { key: 'Microsoft', mailbox: 'Outlook' } } as const;

/**
 * Step 5 of a guided connection, and reconnecting a source: paste the Client ID
 * and secret, then Orbit sends the owner to the provider to approve read-only
 * access. The secret is sealed on this installation and never kept in the browser.
 */
export function ProviderKeyForm({ provider, sourceId, sourceName }: { provider: CaptureProviderInfo; sourceId?: string; sourceName?: string }) {
  const prefix = useId(), label = names[provider.id];
  return <form className="capture-key-form" aria-label={`${sourceId ? 'Reconnect' : 'Connect'} ${label.key}`} method="post" action={`/api/v1/capture/oauth/${provider.id}/start`}>
    {sourceId ? <input type="hidden" name="sourceId" value={sourceId} /> : null}
    <label htmlFor={`${prefix}-client-id`}>Client ID
      <input id={`${prefix}-client-id`} name="clientId" type="text" required maxLength={1000} autoComplete="off" spellCheck={false} />
    </label>
    <label htmlFor={`${prefix}-client-secret`}>Client secret
      <input id={`${prefix}-client-secret`} name="clientSecret" type="password" required maxLength={4000} autoComplete="new-password" />
    </label>
    <label htmlFor={`${prefix}-name`}>Name this connection
      <input id={`${prefix}-name`} name="name" required maxLength={120} defaultValue={sourceName ?? `Work ${label.mailbox}`} autoComplete="off" />
      <small>Shown on Capture, so you can tell accounts apart.</small>
    </label>
    {provider.id === 'microsoft' ? <details className="capture-advanced">
      <summary>Only people from one organisation?</summary>
      <label htmlFor={`${prefix}-tenant`}>Directory (tenant)
        <input id={`${prefix}-tenant`} name="tenant" defaultValue="common" autoComplete="off" />
      </label>
      <p>Leave “common” so any work, school or personal Microsoft account can connect. To allow only your organisation, paste the Directory (tenant) ID from the app’s Overview page.</p>
    </details> : null}
    <button className="orbit-button orbit-button--primary" type="submit">{sourceId ? `Reconnect ${label.key}` : `Connect ${label.key}`}</button>
    <p className="capture-key-form__note">{label.key} opens next. Choose your account and allow read-only access; you come straight back here to pick what Orbit reads.</p>
  </form>;
}
