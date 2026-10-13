import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localState } from '../../scripts/local-state.mjs';
function fixture(fn) { const root = mkdtempSync(join(tmpdir(), 'orbit-custody-')); try { fn(root); } finally { rmSync(root, { recursive: true, force: true }); } }
test('default state survives disposable output replacement', () => fixture(root => {
 const state = localState(root); mkdirSync(join(state, 'v3/d1'), { recursive: true }); mkdirSync(join(state, 'v3/r2'), { recursive: true });
 const bytes = Buffer.from([0, 255, 12, 37]); for (const name of ['d1/fixture.sqlite', 'r2/attachment']) writeFileSync(join(state, 'v3', name), bytes);
 mkdirSync(join(root, 'dist/server'), { recursive: true }); writeFileSync(join(root, 'dist/server/index.js'), 'old build');
 assert.equal(localState(root), state); rmSync(join(root, 'dist'), { recursive: true }); mkdirSync(join(root, 'dist/server'), { recursive: true });
 for (const name of ['d1/fixture.sqlite', 'r2/attachment']) assert.deepEqual(readFileSync(join(state, 'v3', name)), bytes);
}));
test('legacy populated store refuses before cleanup without modifying bytes', () => fixture(root => {
 const legacy = join(root, 'dist/server/.wrangler/state/v3/d1'); mkdirSync(legacy, { recursive: true }); const file = join(legacy, 'fixture.sqlite'); writeFileSync(file, 'retained');
 assert.throws(() => localState(root), /Legacy preview state/); assert.equal(readFileSync(file, 'utf8'), 'retained');
}));
test('lexical overlap, physical aliases and dangling links fail closed', () => fixture(root => {
 mkdirSync(join(root, 'dist')); mkdirSync(join(root, 'retained'));
 assert.throws(() => localState(root, 'dist/state'), /overlap/); assert.throws(() => localState(root, '.'), /overlap/);
 symlinkSync(join(root, 'dist'), join(root, 'state-alias')); assert.throws(() => localState(root, 'state-alias/new'), /overlap/);
 symlinkSync(join(root, 'missing'), join(root, 'dangling')); assert.throws(() => localState(root, 'dangling/new'), /Unresolved/);
 rmSync(join(root, 'dist'), { recursive: true }); symlinkSync(join(root, 'retained'), join(root, 'dist')); assert.throws(() => localState(root, 'retained/state'), /overlap/);
}));

