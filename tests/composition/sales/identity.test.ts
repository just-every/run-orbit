import { test } from 'node:test';
import assert from 'node:assert/strict';
const source = process.env.RER_COMPONENT_SOURCE ?? new URL('../src/', import.meta.url).href;
const { normalizeCommercialEmail, commercialEmailKey } = await import(new URL('identity.ts', source).href);

test('commercial keys normalize case and surrounding whitespace, without conflating mailbox aliases', () => {
  assert.equal(normalizeCommercialEmail('  Jane.Sales+EU@Example.COM '), 'jane.sales+eu@example.com');
  assert.notEqual(normalizeCommercialEmail('jane.sales@example.com'), normalizeCommercialEmail('janesales@example.com'));
  assert.notEqual(normalizeCommercialEmail('jane+sales@example.com'), normalizeCommercialEmail('jane@example.com'));
});
test('missing contact addresses have no key; malformed present identities fail', () => {
  for (const value of [null, undefined, '', '  ']) assert.equal(commercialEmailKey(value), null);
  for (const value of ['name', 'name@@example.com', 'name @example.com']) assert.throws(() => commercialEmailKey(value));
});
