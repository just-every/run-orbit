import { verificationBatches } from './verification-plan.mjs';

// Keep every existing push batch. Nightly runs only the slow installer journey;
// a release runs both sets, without silently rebalancing the proof job names.
export function ciBatches(tier = 'push') {
  const push = verificationBatches({ journeys: false });
  const nightly = [{ batch: 'journeys', shards: ['journeys'], browsers: true, disk: true }];
  if (tier === 'push') return push;
  if (tier === 'nightly') return nightly;
  if (tier === 'all') return [...push, ...nightly];
  throw Error(`Unknown CI tier: ${tier}`);
}
export const lifecyclePlan = () => Object.fromEntries(['push', 'nightly'].map(tier =>
  [tier, ciBatches(tier).map(({ batch, browsers }) => ({ name: batch, browser: browsers }))]));

// Reviewed metadata consumers: product tests read source and fixtures, not these
// documents. Contract generation and the built run site consume contract prose;
// edition lock validation and rer check run for every light candidate.
const documents = new Set(['CONTRACT.md', 'ACCEPTANCE.md', 'CLAIMS.md', 'docs/CLAIMS.md', 'HANDOVER.md', 'STATUS.md']);
export async function orbitLightReaders(files) {
  if (!files.length || !files.every(path => documents.has(path) || path === 'sources.lock.json'
    || /^(?:evidence|\.artifacts)\/.+\.(?:md|txt|png|jpe?g|pdf)$/.test(path))) return;
  return files.some(path => documents.has(path)) ? ['node src/base/contract-docs.mjs check'] : [];
}
