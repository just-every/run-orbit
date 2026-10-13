import { AsyncLocalStorage } from 'node:async_hooks';

// Test-only: copied beside the emitted entry, never imported by application code.
const context = new AsyncLocalStorage();
const databases = new WeakMap(), statements = new WeakMap(), originals = new WeakMap();
const prefix = 'ORBIT_CAPACITY_D1 ';
let processNonce, requestSequence = 0, callSequence = 0;
let clockWitness;
export function configureD1Clock(configuration) { clockWitness = configuration; }
async function clock(phase, call) {
  let stage = 'fetch';
  try {
    const response = await fetch(clockWitness.origin, { method: 'POST', headers: { 'content-type': 'application/json', 'x-capacity-observer': clockWitness.authorization }, body: JSON.stringify({ phase, process: processNonce, call }) });
    stage = 'body';
    if (!response.ok) {
      await response.body?.cancel();
      return { failure: { phase, stage, category: 'http-status', status: response.status } };
    }
    const result = await response.json();
    if (phase === 'start' ? result?.started === true : Number.isFinite(result?.upperBoundMs)) return result;
    return { failure: { phase, stage, category: 'invalid-ack' } };
  } catch (error) {
    // Only fixed categories cross the diagnostic boundary, never messages,
    // stacks, URLs, headers or arbitrary error properties.
    const names = ['Error', 'TypeError', 'SyntaxError', 'AbortError', 'TimeoutError', 'DOMException'];
    const codes = ['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'];
    return { failure: { phase, stage, category: 'exception', name: names.includes(error?.name) ? error.name : 'unknown', code: codes.includes(error?.code) ? error.code : null, causeCode: codes.includes(error?.cause?.code) ? error.cause.code : null } };
  }
}
const emit = record => {
  // Observation failure must not become a database/application failure. Missing
  // paired records fail the external capacity verdict after the Workers close.
  try { console.log(prefix + JSON.stringify({ process: processNonce, ...record })); } catch { }
};

async function invoke(target, method, args, scope, details = {}) {
  // workerd can invoke stream pulls without the fetch's AsyncLocalStorage
  // context. Keep that attribution explicitly unknown; still time every call.
  const request = context.getStore() ?? scope ?? null;
  const call = ++callSequence;
  const record = { request, call, method, ...details };
  emit({ event: 'call-start', ...record });
  let success = false;
  const start = await clock('start', call);
  try {
    const result = await Reflect.apply(target[method], target, args);
    success = true;
    return result;
  } finally {
    const end = await clock('end', call);
    const upperBoundMs = start?.started === true ? end?.upperBoundMs : undefined;
    const failures = [start?.failure, end?.failure].filter(Boolean);
    const clockFailure = failures.length ? { startAcknowledged: start?.started === true, endAcknowledged: Number.isFinite(end?.upperBoundMs), failures } : undefined;
    emit({ event: 'call-end', ...record, upperBoundMs: upperBoundMs ?? null, success, ...(clockFailure ? { clockFailure } : {}) });
  }
}

function statement(native, scope, snapshot) {
  let wrapped = statements.get(native);
  if (wrapped) return wrapped;
  wrapped = new Proxy(native, {
    get(target, name) {
      const value = Reflect.get(target, name, target);
      if (typeof value !== 'function') return value;
      if (name === 'bind') return (...values) => statement(Reflect.apply(target.bind, target, values), context.getStore() ?? scope, snapshot);
      if (['first', 'all', 'run', 'raw'].includes(name)) return (...args) => invoke(target, name, args, scope);
      return value.bind(target);
    },
  });
  statements.set(native, wrapped);
  originals.set(wrapped, { native, snapshot });
  return wrapped;
}

function database(native) {
  let wrapped = databases.get(native);
  if (wrapped) return wrapped;
  wrapped = new Proxy(native, {
    get(target, name) {
      const value = Reflect.get(target, name, target);
      if (typeof value !== 'function') return value;
      if (name === 'prepare') return (...args) => statement(Reflect.apply(target.prepare, target, args), context.getStore(), /^CREATE TABLE archive_snapshot_/i.test(args[0]));
      if (name === 'batch') return (batch, ...args) => {
        const prepared = batch.map(item => originals.get(item)?.native ?? item);
        return invoke(target, name, [prepared, ...args], context.getStore(), { statements: prepared.length, snapshot: batch.some(item => originals.get(item)?.snapshot === true) });
      };
      if (name === 'exec') return (...args) => invoke(target, name, args, context.getStore());
      if (name === 'withSession') return (...args) => database(Reflect.apply(target.withSession, target, args));
      return value.bind(target);
    },
  });
  databases.set(native, wrapped);
  return wrapped;
}

export function observeFetch(worker, request, env, executionContext) {
  processNonce ??= crypto.randomUUID();
  const scope = ++requestSequence;
  emit({ event: 'request-start', request: scope, method: request.method });
  // Preserve all other bindings, descriptors and the original Request/context.
  const bindings = new Proxy(env, { get: (target, name) => name === 'DB' ? database(target.DB) : Reflect.get(target, name, target) });
  return context.run(scope, async () => {
    try {
      return await Reflect.apply(worker.fetch, worker, [request, bindings, executionContext]);
    } finally {
      // The original Response is returned untouched. Stream pulls can follow.
      emit({ event: 'fetch-return', request: scope });
    }
  });
}
