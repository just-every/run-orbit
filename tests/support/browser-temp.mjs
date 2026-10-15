import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Chromium also writes profiles and crash files outside the test database.
// Give each browser-owning process its own temporary root, including direct runs
// that do not inherit verification-shard's TMPDIR.
export function browserTempDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'orbit-browser-tmp-'));
  process.once('exit', () => rmSync(directory, {recursive: true, force: true}));
  return directory;
}

export function isolateBrowserTemp() {
  process.env.TMPDIR = browserTempDirectory();
}
