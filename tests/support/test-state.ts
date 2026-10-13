/** Tests use their own D1 state directory, never the owner's .wrangler/state. */
export function testState(): string {
  const state = process.env.ORBIT_TEST_STATE;
  if (!state) throw new Error('Set ORBIT_TEST_STATE to an isolated directory prepared by tests/support/prepare-state.ts.');
  return state;
}
