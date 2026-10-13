import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from '@playwright/test';
import { tabTo } from '../support/keyboard-focus.mjs';

test('native Tab observation crosses unfocused body and retains bounded unreachable-control failure', { timeout: 15_000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<button id="first">First</button><button id="last">Last</button>');
    await page.locator('#last').focus();
    const observed = [];
    await tabTo(page, async active => {
      observed.push(await active.evaluate(element => element.tagName));
      return await active.getAttribute('id') === 'first';
    });
    assert.ok(observed.includes('BODY'), 'The actual browser body transition must be exercised');
    assert.equal(await page.locator('#first').evaluate(element => element === document.activeElement), true);
    let inspected = 0;
    await assert.rejects(tabTo(page, async () => { inspected++; return false; }), /not reachable with keyboard Tab/);
    assert.equal(inspected, 60, 'An unreachable target retains the original sixty native Tab attempts');
  } finally { await browser.close(); }
});
