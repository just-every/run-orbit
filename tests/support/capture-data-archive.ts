import assert from 'node:assert/strict';
import {fixtureMailbox,type CaptureFixture} from './capture-fixture';

export const json = { 'content-type': 'application/json' };
export async function exported(f: CaptureFixture, discard = false) {
  const call = async (path: string, init?: RequestInit) => { const response = await f.request(path, init); assert.ok(response.ok, `${path}: ${response.status} ${await response.clone().text()}`); return response.json() as Promise<any>; };
  let job = await call('/api/v1/records/archive/exports', { method: 'POST', headers: json, body: '{}' });
  for (let n = 0; n < 300 && job.state !== 'ready'; n++) job = await call(`/api/v1/records/archive/exports/${job.id}/advance`, { method: 'POST', headers: json, body: '{}' });
  assert.equal(job.state, 'ready');
  const archive = await call(`/api/v1/records/archive/exports/${job.id}/download`);
  if (discard) await call(`/api/v1/records/archive/exports/${job.id}/abort`, { method: 'POST', headers: json, body: '{}' });
  return archive;
}
export async function captured(f: CaptureFixture) {
  await f.upload([{ name: 'export.mbox', text: fixtureMailbox(f).mbox }, { name: 'invite.ics', text: fixtureMailbox(f).invite }]);
  const proposals = (await f.db.prepare("SELECT id,kind FROM capture_proposals WHERE status='pending' ORDER BY id").all<{ id: string; kind: string }>()).results;
  assert.equal((await f.request(`/api/v1/capture/proposals/${proposals.find(p => p.kind === 'link_signal')!.id}/accept`, { method: 'POST', headers: json, body: '{}' })).status, 200);
  assert.equal((await f.request(`/api/v1/capture/proposals/${proposals.find(p => p.kind === 'create_contact')!.id}/decline`, { method: 'POST', headers: json, body: '{}' })).status, 200);
}
