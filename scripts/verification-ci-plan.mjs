import { verificationBatches } from './verification-plan.mjs';

// The README clone journey (shipped rer export, reset, import and export again) is a push shard
// so the local archive round trip is proven on every push; the nightly run repeats it alone.
export function ciBatches(tier = 'push') {
  const push = verificationBatches({ journeys: true });
  const nightly = [{ batch: 'journeys', shards: ['journeys'], browsers: true, disk: true }];
  if (tier === 'push' || tier === 'all') return push;
  if (tier === 'nightly') return nightly;
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
