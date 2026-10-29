import { verificationBatches } from './verification-plan.mjs';

// Preserve the slim public journeys under Base's current CI admission policy.
// Nightly selects the slow installation and archive journeys; release selects all.
export function ciBatches(tier = 'push') {
  if (tier === 'push') return verificationBatches({ journeys: false, nightly: false });
  if (tier === 'nightly') return verificationBatches({ journeys: true, nightly: true });
  if (tier === 'all') return verificationBatches({ journeys: true, nightly: false });
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
