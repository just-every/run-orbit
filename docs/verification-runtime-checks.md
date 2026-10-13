# Prepared verification checks — not yet run

These are one-off acceptance probes, outside the permanent product suite. They
must run on Node 22.20.0 with the installed frozen pnpm dependencies. Preparation,
syntax and inventory checks do not establish any result below. No after timing
has been measured.

Use an isolated clean checkout of the candidate. Stop dev/preview first. On the
shared Mac, obtain the team's heavy-work slot, check `sysctl -n vm.loadavg` (at most
36) and free disk (at least 15 GB; full capacity needs at least 30 GiB), use
`nice -n 15`, and run one workload at a time. Save stdout/stderr to private external
files under an `umask 077` shell; summarize outcomes rather than publishing raw
logs or sign-in URLs. Do not source or print private environment files. Run
`node --version` and `pnpm --version` and inspect their pinned versions before
starting. None of these probes calls a hosted provider.

## Actual pinned Node reporter

Run this snippet using `nice -n 15 node --input-type=module`. It creates disposable
Node test fixtures, uses the same process isolation, focus flag, dual reporters
and concurrency as the plan, and validates the resulting real events. It does not
invent completion events or runner summaries. The passing control includes
multiple completions in one file, suites and nested tests. The omission probe
removes just one real completion while retaining the real terminal summary.

```js
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {checkTestEvents} from './scripts/verification-events.mjs';
const dir=mkdtempSync(join(tmpdir(),'orbit-reporter-probe-'));
const prefix="import test,{describe,it} from 'node:test';\nimport assert from 'node:assert/strict';\n";
const cases={
 passed:"test('first',()=>{}); test('second',()=>{}); describe('suite',()=>{it('member',()=>{});}); test('parent',async t=>{await t.test('child',()=>{});});",
 failed:"test('failure',()=>{assert.fail('expected probe failure');});",
 skipped:"test('skipped',{skip:true},()=>{});",
 todo:"test('todo',{todo:true},()=>{});",
 only:"test.only('focused',()=>{}); test('other',()=>{});",
 onlyOption:"test('focused',{only:true},()=>{}); test('other',()=>{});",
 suiteOnly:"describe.only('focused suite',()=>{it('member',()=>{});});",
 runOnly:"test('parent',async t=>{t.runOnly(true); await t.test('child',{only:true},()=>{});});",
};
try {
 for(const [name,body] of Object.entries(cases)){
  const file=join(dir,`${name}.test.mjs`),result=join(dir,`${name}.jsonl`);
  writeFileSync(file,prefix+body,{mode:0o600});
  const run=spawnSync(process.execPath,['--test','--no-test-only','--test-concurrency=1',
   '--test-reporter=spec','--test-reporter-destination=stdout',
   `--test-reporter=${resolve('scripts/core-results.mjs')}`,`--test-reporter-destination=${result}`,file],{encoding:'utf8'});
  const events=existsSync(result)?readFileSync(result,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
  const executions=events.filter(row=>row.kind==='test'),report=events.filter(row=>row.kind!=='test');
  const gate={result,files:[relative(process.cwd(),file)]};
  let valid=true;try{checkTestEvents(gate,executions,report);}catch{valid=false;}
  assert.equal(run.status===0&&valid,name==='passed',name);
  if(name==='passed'){
   const index=executions.findIndex(row=>row.type==='test');
   assert.ok(index>=0);
   assert.throws(()=>checkTestEvents(gate,executions.filter((_,i)=>i!==index),report));
   assert.throws(()=>checkTestEvents(gate,executions,[]));
  }
  if(['only','onlyOption','suiteOnly','runOnly'].includes(name)){
   assert.notEqual(run.status,0,'focus diagnostic must fail the actual reporter');
   assert.equal(valid,false,'focus cannot be accepted as a complete stage');
  }
  console.log(JSON.stringify({probe:name,outcome:name==='passed'?'accepted':'rejected'}));
 }
} finally {rmSync(dir,{recursive:true,force:true});}
```

An inert `runOnly(true)` without a later subtest is not a focused registration.
The probe deliberately registers a real subtest after the call.

## Same-checkout routine, repeat routine and release

Start with empty `git status --porcelain`. Capture a private log and actual
exit/wall time for each command separately; stop on any failure. Execute in this
order in the same checkout:

```sh
node scripts/edition-authoring/cli.mjs check
nice -n 15 node scripts/rer.mjs verify
git diff --exit-code HEAD -- .
git status --porcelain --untracked-files=no
node scripts/edition-authoring/cli.mjs check
```

Save the generated `verification/` directory to a distinct external evidence
directory, including `ci-shards/`, `contract-results.json` and `ci-summary.json`.
Inspect the actual routine report: all planned stages pass, capacity and its
clauses remain pending, and there is no capacity run or capacity output file.
Record the observed stage/file inventory; do not replace source discovery with a
pinned expected count.

Repeat those same five commands without restoring source or any receipt. Save
the second output separately. Then run:

```sh
nice -n 15 pnpm run verify:release
git diff --exit-code HEAD -- .
git status --porcelain --untracked-files=no
node scripts/edition-authoring/cli.mjs check
```

Save this output separately. Require every routine gate plus the unchanged full
capacity workload, fresh `capacity-run.json`, `records-capacity.json`,
`records-capacity-d1.json` and `records-capacity-d1.jsonl`, and a release summary
with capacity passed. The original scale, lineages, assertions and thresholds
remain in force. No file from `docs/retained-verification/` may be copied into
`verification/` at any point. The clean Git guards inspect **all** tracked source,
including original visual review images and retained receipts.

This exercises the same routine-then-release and clean-source sequence used by
the unchanged Base producer. A full producer-path run remains a separate check:
with its real release metadata and prerequisites supplied, run the documented
untagged Base release command, then inspect its actual receipt for both verification
gates and absence of `verify-changed-tracked-source`. Do not replace the producer,
its source guard, or its commands with fixtures, and do not claim producer success
from the command sequence alone. No push, tag or deployment is part of this probe.

## Aggregate negatives using actual product receipts

After a successful routine run at the exact candidate commit, copy its
`verification/ci-shards/` into an external temporary directory for each case.
Call `aggregate(temporaryDirectory)` by importing
`scripts/verification-aggregate.mjs` from the candidate root, and require a throw
for each independently mutated copy:

- Remove one actual completion from a Node stage with another completion in that
  same file. Remove the identical entry from the receipt's flattened executions
  too, but leave the runner summary unchanged. This must fail runner totals,
  even though whole-file coverage and flattened-stage consistency still match.
- Do the same for a Playwright completion; retain the real collected inventory
  and terminal summary. Require rejection for the missing collected test.
- Remove a real terminal summary, duplicate a completion in both representations,
  remove a shard receipt, change one receipt's commit, and move a real stage into
  another stage position. Each separate copy must fail; do not fabricate a passing
  shard or weaken the inventory to make a control pass.

The successful routine run is the positive control. These mutations must never
overwrite its retained external evidence or be uploaded as product results.

## Capacity negatives using the actual release files

Use the successful release directory saved above. Read its `capacity-run.json`
and the latest routine shard `finishedAt`, and call
`checkCapacityResult(run, latestRoutineFinish)` from
`scripts/verification-capacity.mjs` with that directory as `verification/` in a
temporary working directory. Preserve original file mtimes when copying. The
unaltered actual artifacts must return `passed` before testing each fresh copy:

- Delete each of the three capacity artifacts in turn; empty each in turn.
- Set each artifact's mtime before `run.startedAt` in turn.
- Corrupt each JSON document separately; remove the recorded erasure readback or
  change the native D1 observer summary so the two actual results disagree.
- Use a nonzero capacity exit or a capacity interval preceding routine completion.

Require a throw for every mutated copy. Keep the real exit and interval in the
unaltered control; do not generate sample successful capacity JSON. Capacity must
also stay pending in routine aggregation even if a historical capacity artifact
is present. The full qualification must actually execute before a release pass
is accepted.

## CI and timing

After the primary Orbit work and these acceptance checks, run exact-commit CI
with all matrix shards and required aggregation intact. Inspect uploaded actual
events, inventories, failures and wall times. A separate full release dispatch
must retain the original capacity and both immutable 100-table lineage proofs.
Compare the observed after wall with the saved before evidence only after the
run completes; preparation and parallelism estimates are not a timing result.
