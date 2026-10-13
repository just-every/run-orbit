// Records the access answers each prior-data person and the Slate delegation get.
// Usage: node answers.mjs ORIGIN CAPTURE_JSON OUT_JSON
import { readFile, writeFile } from 'node:fs/promises';
import { probes } from './probes.mjs';
const [origin, capturePath, out] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
const answers = {};
for (const probe of probes(capture)) {
  const headers = { Origin: origin, ...(probe.cookie ? { Cookie: `__Host-orbit_session=${probe.cookie}` } : {}), ...(probe.bearer ? { Authorization: `Bearer ${probe.bearer}` } : {}) };
  const response = await fetch(origin + probe.path, { headers, redirect: 'manual' });
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = null; }
  answers[probe.name] = { status: response.status, body };
}
await writeFile(out, JSON.stringify(answers, null, 1));
console.log(Object.keys(answers).length, 'answers');
