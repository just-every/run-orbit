import { verificationBatches } from './verification-plan.mjs';
import { resetVerification, runShard } from './verification-shard.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const names = JSON.parse(process.argv[2] ?? 'null');
// Reject partial or invented batches before clearing any previous receipts.
if (process.argv.length !== 3 || !verificationBatches().some(batch => JSON.stringify(batch.shards) === JSON.stringify(names))) throw Error('Expected a complete planned verification batch.');
// Keep the downloaded build receipt while starting a fresh set of shard receipts.
const build = readFileSync('verification/shared-build.json');
resetVerification();
writeFileSync('verification/shared-build.json', build);
for (const name of names) if (!runShard(name)) { process.exitCode = 1; break; }
