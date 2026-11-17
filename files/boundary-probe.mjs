import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(resolve(process.argv[2], 'package.json'));
const {jsx}=require('hono/jsx/jsx-runtime');
const {ErrorBoundary}=require('hono/jsx');
const {Suspense,renderToReadableStream}=require('hono/jsx/streaming');
const payload='<img src=x onerror="syntheticBoundaryProbe()">';
const rows=[];
async function check(name,node) {
  const html=await new Response(renderToReadableStream(node, error=>{throw error})).text();
  assert.ok(html.includes('&lt;img'),name+' escapes the markup');
  assert.ok(!html.includes('<img'),name+' never emits an injected element');
  rows.push({name,status:'passed'});
}
await check('Suspense plain string child',jsx(Suspense,{fallback:'waiting',children:payload}));
await check('ErrorBoundary plain string child',jsx(ErrorBoundary,{fallback:'fallback',children:payload}));
const Fail=()=>{throw new Error('synthetic boundary failure')};
await check('ErrorBoundary plain string fallback',jsx(ErrorBoundary,{fallback:payload,children:jsx(Fail,{})}));
let ready=false;
let release;
const pending=new Promise(resolve=>{release=resolve});
const Deferred=()=>{if(!ready)throw pending;return jsx('span',{children:'ready'})};
const timer=setTimeout(()=>{ready=true;release()},20);
try {
  await check('Suspense plain string fallback',jsx(Suspense,{fallback:payload,children:jsx(Deferred,{})}));
} finally {clearTimeout(timer)}
console.log(JSON.stringify({probe:'GHSA-hxh3-vqpv-xpqv boundary string escaping',cases:rows.length,results:rows},null,2));
