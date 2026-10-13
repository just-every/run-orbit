import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { producePackage } from '../../scripts/delivery/base/package.mjs';
const policy = JSON.parse(await readFile(new URL('../../scripts/delivery/base/packaging.json', import.meta.url)));
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'orbit-artifact-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  for (const path of ['dist/server', 'dist/client/assets', 'migrations/core']) await mkdir(join(root, path), {recursive:true});
  await writeFile(join(root, 'rer-setup.json'), await readFile(new URL('../../rer-setup.json', import.meta.url)));
  await writeFile(join(root, 'migrations/core/0001_records.sql'), 'CREATE TABLE records (id TEXT);');
  await writeFile(join(root, 'dist/server/index.js'), 'export default {fetch(){return new Response("hello")}}');
  await writeFile(join(root, 'dist/client/assets/main.css'), 'body { color: black }');
  const config = {main:'index.js', compatibility_date:'2026-09-08', compatibility_flags:['nodejs_compat'], vars:{}, d1_databases:[{binding:'DB',migrations_dir:'../../migrations/core'}], assets:{binding:'ASSETS',directory:'../client'}, triggers:{crons:['* * * * *']}};
  const save = () => writeFile(join(root, 'dist/server/wrangler.json'), JSON.stringify(config)); await save();
  return {root, config, save};
}
test('delivery package transports exact Worker, asset and migration bytes with the installer setup manifest', async t => {
  const {root} = await fixture(t);
  const result = await producePackage({root, config:policy});
  const artifact = JSON.parse(await readFile(result.artifact)), project = JSON.parse(await readFile(result.project));
  const setup = await readFile(result.setup);
  assert.deepEqual(setup, await readFile(join(root, 'rer-setup.json')));
  assert.equal(project.setup.sha256, createHash('sha256').update(setup).digest('hex'));
  assert.equal(artifact.deploymentSpec.migrations[0].sql, await readFile(join(root, 'migrations/core/0001_records.sql'), 'utf8'));
  for (const item of [...artifact.modules,...artifact.assets]) {
    const bytes = await readFile(join(dirname(result.artifact), item.payload));
    assert.equal(bytes.length, item.size);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
  }
  assert.ok(artifact.modules.some(item => item.name === artifact.mainModule));
  assert.ok(artifact.assets.some(item => item.path === '/assets/main.css'));
});
test('packaging refuses embedded secrets and symbolic-link payloads before publishing a package', async t => {
  const {root, config, save} = await fixture(t);
  config.vars.SENDGRID_API_KEY = 'test-only-private-key'; await save();
  await assert.rejects(producePackage({root, config:policy}), /Undeclared public build variable/);
  config.vars = {}; await save();
  await symlink(join(root, 'dist/server/index.js'), join(root, 'dist/server/alias.js'));
  await assert.rejects(producePackage({root, config:policy}), /symlink|regular file/i);
});
