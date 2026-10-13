import {constants} from 'node:fs';
import {open} from 'node:fs/promises';
import {resolve} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';

export const help = `Run only after the owner connects a real provider in Capture.
node scripts/capture-live-proof.mjs --origin ORIGIN --session-file PRIVATE_COOKIE_FILE --source SOURCE_ID --phase initial|incremental|disconnect

--evidence-dir DIR  Private receipt directory; default ~/.orbit-capture-proof/<origin hash>/<source>.
--dev-key-file FILE Optional loopback gate key: raw value or rer's RER_DEV_KEY=value file.
--max-rounds N      Maximum sync requests per pass (default 20, range 1..100).

The session file must contain only __Host-orbit_session=VALUE copied from a
native owner/full-operator browser session. Both credential files must be
owner-owned regular files, mode 0600, with no symlinks or hard links. Never
put a cookie, OAuth credential or dev key in an argument. The dev key alone
is not a session. Origin must be HTTPS or loopback HTTP, without path/query.

Initial and incremental each drain bounded sync work and perform a second
pass requiring stable captured/proposal counts. Initial needs captured evidence
and mail plus calendar selections. Incremental requires growth from the saved
initial snapshot; repeating it is permitted and still checks stable replay.
Create a real new known-contact message or a new meeting revision first.
Disconnect removes this source's saved credential, then verifies sync refusal.

Receipts contain source ID, counts, state, timestamps and safe command templates.
They never contain mail, provider cursors or credentials. Counts cannot prove
message/calendar kinds, excluded-item privacy, attribution, timing, or absence
of outreach effects: inspect those manually in Capture and the affected record.
Keep the controlled sources quiet during each two-pass replay check. A bounded
or failed request is not a completed provider proof. No direct provider calls.
`;

export function loopback(host) {
 return host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(host);
}

export function parse(argv) {
 const allowed = new Set(['origin','session-file','source','phase','evidence-dir','dev-key-file','max-rounds']), options = {};
 for (let i = 0; i < argv.length; i += 2) {
  const key = argv[i]?.slice(2);
  if (!argv[i]?.startsWith('--') || !allowed.has(key) || Object.hasOwn(options,key) || !argv[i+1] || argv[i+1].startsWith('--')) throw new Error('Invalid arguments; run with --help.');
  options[key] = argv[i+1];
 }
 let origin;
 try { origin = new URL(options.origin); } catch { throw new Error('Supply a valid --origin.'); }
 if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || !(origin.protocol === 'https:' || (origin.protocol === 'http:' && loopback(origin.hostname)))) throw new Error('Origin must be HTTPS or loopback HTTP without credentials, path, query or fragment.');
 if (!options['session-file'] || !/^capture-[a-z0-9-]{1,60}$/.test(options.source ?? '') || options.source === 'capture-files' || !['initial','incremental','disconnect'].includes(options.phase)) throw new Error('Supply a private session file, provider capture source ID and valid phase.');
 if (options['dev-key-file'] && !loopback(origin.hostname)) throw new Error('The dev key may only be sent to loopback.');
 const rounds = options['max-rounds'] ?? '20';
 if (!/^[1-9]\d*$/.test(rounds) || Number(rounds) > 100) throw new Error('--max-rounds must be 1..100.');
 const originHash = createHash('sha256').update(origin.origin).digest('hex').slice(0,24);
 return {origin:origin.origin, source:options.source, phase:options.phase, sessionFile:resolve(options['session-file']), devKeyFile:options['dev-key-file'] && resolve(options['dev-key-file']), maxRounds:Number(rounds), evidenceDir:resolve(options['evidence-dir'] ?? `${homedir()}/.orbit-capture-proof/${originHash}/${options.source}`)};
}

export async function privateText(path, label, maxBytes = 4096) {
 let file;
 try {
  file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  const info = await file.stat();
  if (!info.isFile() || info.nlink !== 1 || info.size > maxBytes || (info.mode & 0o777) !== 0o600 || (process.getuid && info.uid !== process.getuid())) throw new Error();
  return await file.readFile('utf8');
 } catch { throw new Error(`${label} must be an owner-owned regular mode-0600 file without links.`); }
 finally { await file?.close(); }
}

export async function credentials(options) {
 const cookie = (await privateText(options.sessionFile,'Session file')).trim();
 if (!/^__Host-orbit_session=[A-Za-z0-9_-]{20,2048}$/.test(cookie)) throw new Error('Session file must contain only the native Orbit session cookie.');
 let devKey;
 if (options.devKeyFile) {
  const value = (await privateText(options.devKeyFile,'Dev-key file')).trim();
  devKey = /^(?:RER_DEV_KEY=)?([A-Za-z0-9_-]{43,256})$/.exec(value)?.[1];
  if (!devKey) throw new Error('Dev-key file is malformed.');
 }
 return {cookie,devKey};
}
