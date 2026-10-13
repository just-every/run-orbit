import {lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {credentials} from './input.mjs';
import {orbitClient} from './http.mjs';
import {count,evidenceDirectory,limitations,readBaseline,saveReceipt,snapshot,summary} from './evidence.mjs';

export async function runProof(options) {
 const auth = await credentials(options);
 await evidenceDirectory(options.evidenceDir);
 let baseline;
 if(options.phase === 'incremental')baseline = await readBaseline(options);
 if(options.phase === 'initial') {
  try {await lstat(join(options.evidenceDir,'initial.json')); throw new Error('Initial evidence already exists; use incremental or a new evidence directory for a new proof.');}
  catch(error) {if(error.code !== 'ENOENT')throw error;}
 }
 const request = orbitClient(options.origin,auth), sourcePath = `/api/v1/capture/sources/${options.source}`;
 const receipt = {version:1,phase:options.phase,origin:options.origin,source:options.source,started_at:new Date().toISOString(),outcome:'incomplete',limitations,command:`node scripts/capture-live-proof.mjs --origin ${options.origin} --session-file PRIVATE_COOKIE_FILE --source ${options.source} --phase ${options.phase} --evidence-dir PRIVATE_EVIDENCE_DIR${options.devKeyFile ? ' --dev-key-file PRIVATE_DEV_KEY_FILE':''}`,passes:[]};
 const observe = async () => {
  const {value} = await request('/api/v1/capture/sources');
  if(!Array.isArray(value?.sources))throw new Error('Orbit returned no capture source list.');
  const matches = value.sources.filter(source=>source.id === options.source);
  if(matches.length !== 1)throw new Error('Selected capture source was not found uniquely.');
  return snapshot(matches[0],options.source,{requireSelection:options.phase !== 'disconnect'});
 };
 const drain = async () => {
  const pass = {requests:0,summary:{captured:0,unlinked:0,replayed:0,conflicts:0,attached:0,stopped:0,bounces:0,proposals:0,skipped:0},complete:false};
  receipt.passes.push(pass);
  for(let round=0;round<options.maxRounds;round++) {
   const {value} = await request(`${sourcePath}/sync`,{body:{}});
   pass.requests++;
   const observed = summary(value?.summary);
   for(const key of Object.keys(pass.summary))pass.summary[key] = count(pass.summary[key]+observed[key]);
   if(typeof value.more !== 'boolean')throw new Error('Orbit did not report whether bounded sync completed.');
   if(!value.more) {pass.complete = true; return pass;}
  }
  throw new Error('Sync still has more work after the bounded request budget; inspect Capture and resume explicitly.');
 };
 try {
  receipt.before = await observe();
  if(options.phase === 'disconnect') {
   const {value} = await request(`${sourcePath}/disconnect`,{body:{confirmed:true}});
   if(value?.disconnected !== true)throw new Error('Orbit did not confirm disconnect.');
   receipt.after = await observe();
   if(receipt.after.has_credential !== 0 || receipt.after.state !== 'disconnected')throw new Error('Disconnected source still reports a credential or active state.');
   const refused = await request(`${sourcePath}/sync`,{body:{},statuses:[409]});
   receipt.sync_refused_status = refused.status;
   receipt.replay = await observe();
   if(receipt.replay.has_credential !== 0 || receipt.replay.state !== 'disconnected' || receipt.replay.captured_count !== receipt.after.captured_count || receipt.replay.proposals_waiting !== receipt.after.proposals_waiting)throw new Error('Source state changed after refused disconnected sync.');
  } else {
   if(receipt.before.has_credential !== 1 || !['connected','syncing'].includes(receipt.before.state))throw new Error('Connect this provider source before running the capture proof.');
   if(baseline && receipt.before.selection_fingerprint !== baseline.selection_fingerprint)throw new Error('Selection changed since the initial proof; use a new evidence directory and initial phase.');
   await drain();
   receipt.after = await observe();
   assertHealthy(receipt.after);
   if(receipt.after.selection_fingerprint !== receipt.before.selection_fingerprint)throw new Error('Selection changed during sync.');
   if(receipt.after.captured_count === 0)throw new Error('No captured known-contact evidence was observed; prepare real controlled fixtures first.');
   if(baseline && receipt.after.captured_count <= baseline.captured_count)throw new Error('No added captured evidence since initial; receive a real known-contact message or add a new meeting revision first.');
   const replay = await drain();
   receipt.replay = await observe();
   assertHealthy(receipt.replay);
   if(receipt.after.captured_count !== receipt.replay.captured_count || receipt.after.proposals_waiting !== receipt.replay.proposals_waiting || receipt.after.selection_fingerprint !== receipt.replay.selection_fingerprint || replay.summary.captured || replay.summary.proposals || replay.summary.attached || replay.summary.stopped || replay.summary.bounces)throw new Error('Replay changed evidence or proposed effects; inspect the source and keep controlled provider fixtures quiet before repeating.');
   receipt.replay_counts_stable = true;
   if(baseline)receipt.added_since_initial = receipt.after.captured_count-baseline.captured_count;
  }
  receipt.outcome = 'observed';
 } catch(error) {
  // Every error reaching this boundary is authored locally. Never save an
  // arbitrary exception, response JSON or provider diagnostic in receipts.
  receipt.completed_at = new Date().toISOString();
  const path = await saveReceipt(options,receipt);
  throw new Error(`Proof incomplete; sanitized receipt: ${JSON.stringify(path)}. ${error.message}`);
 }
 receipt.completed_at = new Date().toISOString();
 return {path:await saveReceipt(options,receipt),phase:options.phase,outcome:receipt.outcome};
}

function assertHealthy(source) {
 if(source.state !== 'connected' || source.has_credential !== 1 || source.has_error || !source.last_success_at)throw new Error('Source did not report a healthy completed sync; inspect Capture.');
}
