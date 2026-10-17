import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {deploymentSpec} from './delivery/base/spec.mjs';
import {packagingConfig} from './delivery/base/package.mjs';
import {loadSetupManifest} from './delivery/base/setup-manifest.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check') || args.length > 1) throw Error('Usage: node scripts/publish-deployment-spec.mjs [--check]');
const check = args.includes('--check'), root = process.cwd();
const policy = JSON.parse(await readFile(resolve(root, 'scripts/delivery/base/packaging.json'), 'utf8'));
const spec = await deploymentSpec(root, policy.artifact.specInputs);
const {project, workflow, setup: selection} = packagingConfig(policy);
const setup = await loadSetupManifest(root, selection, spec.mail);
const descriptor = {...project, setup: {path: setup.path, sha256: setup.sha256}};
for (const [path, bytes] of [
  ['management/integration/deployment-spec.json', JSON.stringify(spec, null, 2) + '\n'],
  ['rer-project.json', JSON.stringify(descriptor, null, 2) + '\n'],
  ['.github/workflows/rer-managed.yml', workflow],
]) {
  if (check) {
    if (await readFile(resolve(root, path), 'utf8') !== bytes) throw Error(`${path} drifted. Run rer build, then pnpm run deployment:spec.`);
  } else await writeFile(resolve(root, path), bytes);
}
console.log(`Deployment spec ${check ? 'matches the build' : 'published from the build'}; setup digest matches rer-setup.json.`);
