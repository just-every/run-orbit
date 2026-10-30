import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

/** Local CLI carry v1 (rer cli/business/carry.mjs). It carries a name, not owner/timezone. */
export async function localBusinessName(root) {
  const path = join(root, '.rer/local/business.json');
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size > 64 * 1024) return undefined;
    const carry = JSON.parse(await readFile(path, 'utf8'));
    if (carry?.version === 1 && typeof carry.name === 'string' && carry.name.trim()
      && carry.name.length <= 200 && !/[\x00-\x1f\x7f]/.test(carry.name)) return carry.name.trim();
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw new Error('Local Business carry could not be read.');
  }
  return undefined;
}
