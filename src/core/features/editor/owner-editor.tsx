import { useEffect, useState } from 'react';
import { createOwnerEditor, parseGrant } from '../../../base/modules/editor';

/** Every mount and renewal uses the current native session's short owner grant. */
export function NativeOwnerEditor() {
  const [error, setError] = useState<string>();
  useEffect(() => {
    const editor = createOwnerEditor();
    let owner: string | null = null, disposed = false, signingOut = false;
    let pending: AbortController | undefined;
    let renewal: ReturnType<typeof setTimeout> | undefined;
    const cancelRenewal = () => { clearTimeout(renewal); renewal = undefined; };
    const refresh = async () => {
      if (disposed || signingOut) return;
      cancelRenewal(); pending?.abort(); const request = new AbortController(); pending = request;
      try {
        const response = await fetch('/api/editor/config', {signal: request.signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error'});
        if (disposed || request.signal.aborted) return;
        if ([204, 403].includes(response.status)) { owner = null; editor.setOwner(false); setError(undefined); return; }
        if (!response.ok) throw new Error('Editor authorization is unavailable.');
        const current = response.headers.get('X-Orbit-Owner');
        if (!current) throw new Error('Owner identity is unavailable.');
        const grant = parseGrant(await response.json());
        if (disposed || request.signal.aborted) return;
        if (owner !== current) { editor.setOwner(true); owner = current; }
        await editor.refresh(async () => grant);
        if (disposed || request.signal.aborted) return;
        setError(undefined);
        // Revalidate native authority while an open, focused editor is in use.
        // The previous grant still expires independently if this request stalls.
        renewal = setTimeout(() => { void refresh(); }, Math.max(1000, (grant.expiresAt - Date.now()) / 2));
      } catch {
        if (disposed || request.signal.aborted) return;
        editor.revoke(); setError('Editor is unavailable. Reload to try again.');
      }
    };
    const focus = () => { void refresh(); };
    const signout = (event: Event) => {
      // A control named "action" shadows form.action, so read the attribute itself.
      if (event.target instanceof HTMLFormElement && new URL(event.target.getAttribute('action') ?? '', document.baseURI).pathname === '/auth/signout') { signingOut = true; cancelRenewal(); pending?.abort(); owner = null; editor.setOwner(false); }
    };
    focus(); window.addEventListener('focus', focus); document.addEventListener('submit', signout, true);
    return () => { disposed = true; cancelRenewal(); pending?.abort(); window.removeEventListener('focus', focus); document.removeEventListener('submit', signout, true); editor.dispose(); };
  }, []);
  return error ? <p role="alert">{error}</p> : null;
}
