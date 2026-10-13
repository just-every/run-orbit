import { Hono } from 'hono';
import { CaptureProviderError, type CaptureItem, type CaptureSourceAdapter } from '../../src/core/features/capture/contracts';

/**
 * A fake mailbox provider behind a real HTTP boundary, and the reference adapter
 * that reads it. Pages are addressed by an opaque cursor, as Gmail's history ID
 * or Microsoft Graph's delta link are; the adapter never interprets one.
 */
export function fakeMailProvider(pages: { cursor: string; items: CaptureItem[] }[]) {
  const state = { token: 'grant-1', outage: false, pulls: 0, beforeAnswer: async (_page: number) => {} };
  const provider = new Hono();
  provider.get('/v1/changes', async c => {
    state.pulls++;
    if (c.req.header('authorization') !== `Bearer ${state.token}`) return c.json({ error: 'invalid_grant' }, 401);
    if (state.outage) return c.json({ error: 'temporarily unavailable' }, 503);
    const after = c.req.query('after') ?? '', index = after ? pages.findIndex(page => page.cursor === after) + 1 : 0;
    await state.beforeAnswer(index);
    const page = pages[index];
    return c.json(page ? { items: page.items, cursor: page.cursor, more: index < pages.length - 1 } : { items: [], cursor: after || null, more: false });
  });
  const adapter: CaptureSourceAdapter = {
    adapter: 'fake-mail', scope: { mail: { folders: ['INBOX', 'Sent'] }, calendars: ['Primary'] },
    async pull(cursor, credential) {
      const response = await provider.request(`https://provider.test/v1/changes?after=${encodeURIComponent(cursor ?? '')}`, { headers: { authorization: `Bearer ${credential}` } });
      if (response.status === 401 || response.status === 403) throw new CaptureProviderError('revoked', 'The provider refused the stored grant.');
      if (!response.ok) throw new CaptureProviderError('unavailable', `The provider answered ${response.status}.`);
      return await response.json() as { items: CaptureItem[]; cursor: string | null; more: boolean };
    },
  };
  return { state, adapter };
}
