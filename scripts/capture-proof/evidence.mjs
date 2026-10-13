import {createHash,randomUUID} from 'node:crypto';
import {mkdir,lstat,open} from 'node:fs/promises';
import {join} from 'node:path';
import {privateText} from './input.mjs';

export const limitations = [
 'Counters do not prove both message and calendar evidence; inspect the controlled fixtures in Capture.',
 'Excluded items, unknown-body retention, attribution, timestamps, proposals and outreach effects require manual inspection.',
 'Stable counters prove no newly counted capture or pending proposals during this replay, not every internal effect.',
 'This receipt covers only this source and phase; it is not production, provider-policy or release acceptance.',
];
export function count(value) {if(!Number.isSafeInteger(value) || value < 0)throw new Error('Orbit returned an invalid evidence counter.'); return value;}
function timestamp(value) {
 if (value === null) return null;
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Orbit returned an invalid evidence timestamp.');
 return value;
}
function scopeFingerprint(scope) {
 if(!scope || !Array.isArray(scope.mail?.folders) || !scope.mail.folders.length || !Array.isArray(scope.calendars) || !scope.calendars.length) throw new Error('Select both a mail label/folder and calendar for this controlled proof.');
 for(const id of [...scope.mail.folders,...scope.calendars])if(typeof id !== 'string' || id.length > 2048)throw new Error('Orbit returned an invalid capture selection.');
 // JSON shape is installation-owned; this binds the baseline to the exact
 // selections and calendar window without saving provider identifiers.
 return createHash('sha256').update(JSON.stringify(scope)).digest('hex');
}
export function snapshot(source, id, {requireSelection = true} = {}) {
 if (!source || source.id !== id || !['google','microsoft'].includes(source.adapter) || !['connected','syncing','error','disconnected'].includes(source.state)) throw new Error('Orbit returned an invalid provider source.');
 if (![0,1].includes(source.has_credential)) throw new Error('Orbit returned an invalid credential-presence flag.');
 return {id,adapter:source.adapter,state:source.state,has_credential:source.has_credential,captured_count:count(source.captured_count),skipped_count:count(source.skipped_count),proposals_waiting:count(source.proposals_waiting),last_success_at:timestamp(source.last_success_at),last_error_at:timestamp(source.last_error_at),has_error:source.last_error !== null && source.last_error !== undefined, ...(requireSelection ? {selection_fingerprint:scopeFingerprint(source.scope)} : {})};
}
export function summary(value) {
 if (!value || typeof value !== 'object') throw new Error('Orbit returned no sync summary.');
 if (value.halted !== undefined) throw new Error('Provider sync halted; inspect Capture and reconnect or resolve the provider failure.');
 const result = {};
 for (const key of ['captured','unlinked','replayed','conflicts','attached','stopped','bounces','proposals','skipped']) result[key] = count(value[key]);
 return result;
}
export async function evidenceDirectory(directory) {
 await mkdir(directory,{recursive:true,mode:0o700});
 const info = await lstat(directory);
 if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o777) !== 0o700 || (process.getuid && info.uid !== process.getuid())) throw new Error('Evidence directory must be an owner-owned mode-0700 directory without a symlink.');
}
export async function readBaseline(options) {
 let value;
 try {value = JSON.parse(await privateText(join(options.evidenceDir,'initial.json'),'Initial evidence file',64000));}
 catch {throw new Error('A private initial.json receipt is required in this evidence directory; run the initial phase first.');}
 if (value.version !== 1 || value.phase !== 'initial' || value.origin !== options.origin || value.source !== options.source || value.outcome !== 'observed') throw new Error('Initial receipt belongs to a different origin/source or did not complete.');
 if (!/^[a-f0-9]{64}$/.test(value.after?.selection_fingerprint ?? '')) throw new Error('Initial receipt has no valid selection fingerprint.');
 count(value.after.captured_count);
 return {captured_count:value.after.captured_count,selection_fingerprint:value.after.selection_fingerprint};
}
export async function saveReceipt(options, value) {
 const name = `${options.phase}-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID()}.json`;
 const path = join(options.evidenceDir,name);
 await writeNew(path,value);
 if(options.phase === 'initial' && value.outcome === 'observed')await writeNew(join(options.evidenceDir,'initial.json'),value);
 return path;
}
async function writeNew(path, value) {
 const file = await open(path,'wx',0o600);
 try {await file.writeFile(JSON.stringify(value,null,2)+'\n');} finally {await file.close();}
}
