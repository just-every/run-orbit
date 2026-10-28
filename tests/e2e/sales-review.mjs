import {expect} from '@playwright/test';
import {authenticateOperator} from './operator-session.mjs';

export async function reviewSavedDraft({page, browser, opportunityId}) {
  const origin = new URL(page.url()).origin, draftURL = page.url();
  const initial = await (await page.request.get('/api/v1/drafts/' + new URL(draftURL).pathname.split('/').at(-1))).json();
  const draft = initial.draft;
  const secondContext = await browser.newContext({baseURL: origin, viewport: {width: 1440, height: 900}});
  try {
    await authenticateOperator(secondContext);
    const staleEditor = await secondContext.newPage();
    await staleEditor.goto(draftURL, {waitUntil: 'networkidle'});
    await page.getByText('Audit details', {exact: true}).click();
    const metadata = page.getByText('Draft history').locator('..');
    const {operators} = await (await page.request.get('/api/v1/settings')).json();
    await expect(metadata).toContainText(operators.find(operator => operator.id === draft.authorId).display_name);
    await expect(metadata.getByRole('link')).toHaveAttribute('href', `/app/opportunities/${opportunityId}`);
    await expect(metadata).toContainText('Created'); await expect(metadata).toContainText('Last updated');
    const savedBody = `Persisted operator edit ${Date.now()}.`;
    await page.getByTestId('draft-body').fill(savedBody);
    const refreshed = page.waitForResponse(response => response.url().endsWith(`/api/v1/opportunities/${opportunityId}`) && response.request().method() === 'GET');
    await page.getByTestId('save-draft').click(); await (await refreshed).finished();
    await expect(page.getByText(/Saved revision \d+\. Your changes are saved\./)).toBeVisible();
    await page.reload({waitUntil: 'networkidle'}); await expect(page.getByTestId('draft-body')).toHaveValue(savedBody);
    const fresh = await page.context().newPage();
    await fresh.goto(draftURL); await expect(fresh.getByTestId('draft-body')).toHaveValue(savedBody); await fresh.close();
    await staleEditor.getByTestId('draft-body').fill('A conflicting edit from another tab.');
    await staleEditor.getByTestId('save-draft').click();
    await expect(staleEditor.getByText('The draft changed or is stale. Reload it before editing.')).toBeVisible();
    await staleEditor.getByRole('button', {name: 'Reload saved draft'}).click();
    await expect(staleEditor.getByTestId('draft-body')).toHaveValue(savedBody);
    const before = (await (await page.request.get(`/api/v1/drafts/${draft.id}`)).json()).draft;
    const event = await page.request.post(`/api/v1/workbench/opportunities/${opportunityId}/events`, {
      headers: {Origin: origin}, data: {type: 'meeting.booked', subject: 'Customer booked a new meeting', occurredAt: new Date().toISOString(), eventId: crypto.randomUUID()}
    });
    expect(event.status()).toBe(201);
    const approvals = [];
    page.on('request', request => { if (request.url().endsWith('/approve')) approvals.push(request.url()); });
    await page.reload();
    await expect(page.getByTestId('stale-review')).toContainText('Customer booked a new meeting');
    const confirm = page.getByRole('button', {name: 'Confirm reviewed draft'});
    await expect(confirm).toBeDisabled();
    await page.getByLabel('I reviewed the changed evidence, current recipient, subject and body above.').check();
    await confirm.click(); await expect(page.getByTestId('stale-review')).toHaveCount(0);
    const persisted = (await (await page.request.get(`/api/v1/drafts/${draft.id}`)).json()).draft;
    expect(persisted.isStale).toBe(false); expect(persisted.revision).toBe(before.revision + 1);
    expect(persisted.subject).toBe(before.subject); expect(persisted.body).toBe(savedBody); expect(approvals).toEqual([]);
    await page.goto(`/app/opportunities/${opportunityId}`);
    const detail = (await (await page.request.get(`/api/v1/opportunities/${opportunityId}`)).json()).opportunity;
    const fields = page.getByTestId('independent-opportunity-fields');
    await expect(fields).toContainText(detail.stage);
    await expect(fields).toContainText(String(detail.score));
    for(const state of [detail.lifecycle,detail.band,detail.queueState])if(state)await expect(fields).toContainText(new RegExp(state,'i'));
    if(detail.ownerName)await expect(fields).toContainText(detail.ownerName);
    expect((await (await page.request.get(`/api/v1/workbench/opportunities/${opportunityId}/messages`)).json()).messages).toEqual([]);
  } finally { await secondContext.close(); }
}
