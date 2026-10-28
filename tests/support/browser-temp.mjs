import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

let directory;

// POSIX sockets have a small pathname limit. Runner-owned TMPDIR paths can
// already fill it before Chromium or the fixture broker adds its socket name.
// Give each process a private, short directory and remove only that directory.
export function isolateBrowserTemp() {
  if (!directory) {
    const root = process.platform === 'win32' ? tmpdir() : '/tmp';
    directory = mkdtempSync(join(root, 'ob-'));
    const ownedDirectory = directory;
    process.once('exit', () => rmSync(ownedDirectory, {recursive: true, force: true}));
  }
  process.env.TMPDIR = directory;
}
