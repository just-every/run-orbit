import { execFile } from 'node:child_process';
import { chmod, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

/**
 * Runs the shipped remote transfer, `rer export|import --target remote`, against
 * an HTTPS Orbit. The session stays private inside the checkout; archives use
 * its unserved exports/ directory and the finished export is copied back out.
 */
export async function rerTransfer(operation: 'export' | 'import', origin: string, cookieFile: string, file: string, certificatePath: string, maxBuffer = 8 * 1024 * 1024) {
  await mkdir('.rer', { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join('.rer', 'remote-transfer-'));
  let archiveDirectory: string | undefined;
  try {
    await mkdir('exports', { recursive: true, mode: 0o700 });
    archiveDirectory = await mkdtemp(join('exports', 'remote-transfer-'));
    const session = join(directory, 'session'), archive = join(archiveDirectory, 'archive.rer');
    await copyFile(cookieFile, session);
    await chmod(session, 0o600);
    if (operation === 'import') { await copyFile(file, archive); await chmod(archive, 0o600); }
    const args = ['scripts/rer.mjs', operation, '--target', 'remote', '--origin', origin, '--session-file', session, ...(operation === 'export' ? ['--output', archive] : ['--input', archive, '--yes'])];
    try {
      const result = await promisify(execFile)(process.execPath, args, { env: { ...process.env, NODE_EXTRA_CA_CERTS: certificatePath }, timeout: 300000, maxBuffer });
      if (operation === 'export') { await copyFile(archive, file); await chmod(file, 0o600); }
      return { ok: true, stdout: result.stdout + result.stderr, stderr: result.stderr };
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string };
      return { ok: false, stdout: String(failure.stdout ?? '') + String(failure.stderr ?? ''), stderr: String(failure.stderr ?? '') };
    }
  } finally {
    await Promise.all([
      rm(directory, { recursive: true, force: true }),
      ...(archiveDirectory ? [rm(archiveDirectory, { recursive: true, force: true })] : []),
    ]);
  }
}
