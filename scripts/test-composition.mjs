import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const components = [['src/family/sales', 'tests/composition/sales'], ['src/modules/sendgrid-email', 'tests/composition/sendgrid-email']];
for (const [source, tests] of components) {
  const files = readdirSync(tests).filter((file) => file.endsWith('.test.ts')).sort().map((file) => resolve(tests, file));
  const result = spawnSync(process.execPath, ['--test', ...files], {
    stdio: 'inherit',
    env: { ...process.env, RER_COMPONENT_SOURCE: pathToFileURL(`${resolve(source)}/`).href },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
