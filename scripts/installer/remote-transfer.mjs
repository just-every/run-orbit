import { relative } from 'node:path';
import { runTransfer } from '../data-transfer/run.mjs';
import { transferClient } from '../data-transfer/http.mjs';
import { readSessionCookie } from '../data-transfer/session.mjs';
import { RerError, invalid, missing } from '../base-cli/cli/errors.mjs';

// A hosted installation moves its data through Orbit's own authenticated
// Records archive API (the same archive the Records page downloads), using an
// operator session cookie the owner saved from an ordinary sign-in.
export async function remoteTransfer({ root, path, origin, sessionFile, store }, operation) {
 if (!origin || !sessionFile) throw missing('Remote transfer requires --origin HTTPS_ORIGIN and --session-file FILE holding the native Orbit session cookie.');
 const url = new URL(origin);
 if (url.protocol !== 'https:') throw invalid('Remote transfer requires the HTTPS deployment origin.');
 const cookie = await readSessionCookie(sessionFile);
 // Transfer messages name only paths, transfer IDs and HTTP statuses, never the cookie or archive content.
 try { await runTransfer({ operation, origin: url.origin, file: path }, transferClient(url.origin, cookie), message => store.report(message)); }
 catch (error) { throw new RerError('transfer_failed', `Remote ${operation} failed: ${error.message}`, 1); }
 return { target: 'remote', origin: url.origin, [operation === 'export' ? 'output' : 'input']: relative(root, path) };
}
