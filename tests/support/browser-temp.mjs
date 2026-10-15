import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

let directory;

// Workers inherit the original OS temporary root, not a parent's browser
// directory. Keep each process's directory short enough for Chromium sockets.
export function isolateBrowserTemp() {
  if (!directory) {
    const root = process.env.ORBIT_BROWSER_TEMP_ROOT ?? tmpdir();
    process.env.ORBIT_BROWSER_TEMP_ROOT = root;
    directory = mkdtempSync(join(root, 'ob-'));
    const ownedDirectory = directory;
    process.once('exit', () => rmSync(ownedDirectory, {recursive: true, force: true}));
  }
  process.env.TMPDIR = directory;
}
