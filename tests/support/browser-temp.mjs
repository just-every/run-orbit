import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

let directory;

// The verification wrapper's TMPDIR includes its checkout and shard names.
// AF_UNIX paths on macOS are limited to 104 bytes, so browser/broker sockets
// need a short private directory independent of that inherited nesting.
export function isolateBrowserTemp() {
  if (!directory) {
    const root = process.platform === 'win32' ? tmpdir() : '/tmp';
    directory = mkdtempSync(join(root, 'ob-'));
    const ownedDirectory = directory;
    process.once('exit', () => rmSync(ownedDirectory, {recursive: true, force: true}));
  }
  process.env.TMPDIR = directory;
}
