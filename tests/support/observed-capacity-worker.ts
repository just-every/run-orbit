import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { ChildProcess } from 'node:child_process';
import { closeSync, constants, fchmodSync, fsyncSync, openSync, writeSync } from 'node:fs';
import { chmod, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { d1Observations, emptyD1Summary } from './d1-observations';
import { d1ClockWitness } from './d1-clock-witness';

export async function observedCapacityWorker() {
  const originalConfig = resolve('dist/server/wrangler.json');
  const directory = dirname(originalConfig), config = JSON.parse(await readFile(originalConfig, 'utf8'));
  assert.equal(typeof config.main, 'string', 'Use the actual emitted Worker main');
  const entry = './' + relative(directory, resolve(directory, config.main)).replaceAll('\\', '/');
  const name = `.capacity-observed-${randomUUID()}`;
  const files = ['.mjs', '-d1.mjs', '.json'].map(suffix => resolve(directory, name + suffix));
  const summaries = { source: emptyD1Summary(), restored: emptyD1Summary() };
  const workers = new Map<ChildProcess, { closed: Promise<void>; observation: ReturnType<typeof d1Observations> }>();
  await mkdir('verification', { recursive: true });
  // Like records-capacity.json, this is the current run's result, not an input.
  // Reset it on a repeated capacity/verify invocation in the same checkout.
  const output = openSync('verification/records-capacity-d1.jsonl', 'w', 0o600);
  const clock = await d1ClockWitness().catch(error => { closeSync(output); throw error; });
  try {
    fchmodSync(output, 0o600);
    await copyFile(new URL('./observed-d1.mjs', import.meta.url), files[1], constants.COPYFILE_EXCL);
    await chmod(files[1], 0o600);
    await writeFile(files[0], `import worker from ${JSON.stringify(entry)};\nimport { observeFetch, configureD1Clock } from ${JSON.stringify('./' + name + '-d1.mjs')};\nconfigureD1Clock(${JSON.stringify(clock.configuration)});\nexport * from ${JSON.stringify(entry)};\nexport default new Proxy(worker, { get(target, key) {\n  if (key === 'fetch') return (request, env, ctx) => observeFetch(target, request, env, ctx);\n  const value = Reflect.get(target, key, target);\n  return typeof value === 'function' ? value.bind(target) : value;\n} });\n`, { flag: 'wx', mode: 0o600 });
    await writeFile(files[2], JSON.stringify({ ...config, main: './' + name + '.mjs' }), { flag: 'wx', mode: 0o600 });
  } catch (error) { closeSync(output); await clock.close(); await Promise.all(files.map(file => rm(file, { force: true }))); throw error; }
  function report() { return { ...summaries, clock: clock.state(), workers: [...workers.values()].map(worker => worker.observation.state()) }; }
  async function stop(worker: ChildProcess) {
    const owned = workers.get(worker); assert.ok(owned);
    if (worker.exitCode === null && worker.signalCode === null) worker.kill('SIGTERM');
    await owned.closed;
  }
  return {
    configPath: files[2],
    attach(worker: ChildProcess, side: keyof typeof summaries, diagnostic: (line: string) => void) {
      const observation = d1Observations(event => writeSync(output, JSON.stringify({ side, ...event as object }) + '\n'), diagnostic, summaries[side]);
      for (const pipe of [worker.stdout, worker.stderr]) { assert.ok(pipe); const parser = observation.stream(); pipe.on('data', parser.data); pipe.once('end', parser.end); }
      const closed = new Promise<void>(resolve => worker.once('close', () => { observation.close(); resolve(); }));
      workers.set(worker, { closed, observation });
    },
    stop,
    async verify() {
      await clock.close();
      const result = report();
      assert.deepEqual(result.clock.errors, [], 'Native D1 clock witness must be valid');
      assert.equal(result.clock.pending, 0, 'Every native D1 clock bracket must complete');
      assert.equal(result.clock.completed, result.source.calls + result.restored.calls, 'Every native call must have a clock bracket');
      for (const worker of result.workers) {
        assert.ok(worker.closed && worker.calls > 0 && worker.requests > 0, 'Native D1 observation requires a closed, observed Worker');
        assert.equal(worker.pendingCalls, 0, 'Every native D1 invocation must settle');
        assert.equal(worker.pendingRequests, 0, 'Every observed fetch must return');
        assert.deepEqual(worker.errors, [], 'Native D1 observations must be complete and valid');
      }
      for (const side of [result.source, result.restored]) {
        assert.ok(side.calls > 0 && side.batches > 0 && side.queries > 0 && side.snapshotBatches > 0, 'Source and restored native D1 calls must be observed');
        assert.ok(side.unscopedNativeCalls + side.scopedCallsAfterFetchReturn > 0, 'Native calls beyond the fetch observation scope must be recorded');
        assert.ok(side.maxNativeCallUpperBoundMs < 30000, `Native D1 invocation upper bound exceeded the 30-second query/entire-batch ceiling: ${side.maxNativeCallUpperBoundMs}ms`);
      }
      return result;
    },
    async dispose() {
      try { for (const worker of workers.keys()) await stop(worker); await clock.close(); await writeFile('verification/records-capacity-d1.json', JSON.stringify(report(), null, 2) + '\n', { mode: 0o600 }); fsyncSync(output); }
      finally { closeSync(output); await Promise.all(files.map(file => rm(file, { force: true }))); }
    },
  };
}
