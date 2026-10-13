import { test } from 'node:test';
import assert from 'node:assert/strict';
const source = process.env.RER_COMPONENT_SOURCE ?? new URL('../src/', import.meta.url).href;
const { assertCommercialRelationship } = await import(new URL('relationships.ts', source).href);

test('only known people can be attached to known commercial work', () => {
  const known = { contactIds: new Set(['person-1']), opportunityIds: new Set(['deal-1']) };
  assert.doesNotThrow(() => assertCommercialRelationship({ contactId: 'person-1', opportunityId: 'deal-1' }, known));
  assert.throws(() => assertCommercialRelationship({ contactId: 'person-2', opportunityId: 'deal-1' }, known), /contact/);
  assert.throws(() => assertCommercialRelationship({ contactId: 'person-1', opportunityId: 'deal-2' }, known), /opportunity/);
});
