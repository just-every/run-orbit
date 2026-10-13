import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readSessionCookie} from '../../scripts/data-transfer/session.mjs';
import {remoteTransfer} from '../../scripts/installer/remote-transfer.mjs';
test('remote transfer needs an HTTPS origin and a session file before any request',async()=>{
 const context={root:'/checkout',path:'/checkout/exports/archive',store:{report(){}}};
 await assert.rejects(remoteTransfer({...context,origin:'https://orbit.example'},'export'),/--session-file/);
 await assert.rejects(remoteTransfer({...context,origin:'http://orbit.example',sessionFile:'/checkout/session'},'export'),/HTTPS/);
});
test('session file accepts only the native cookie and never reflects its contents in errors',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'orbit-transfer-'));
 try{
  const path=join(directory,'cookie');await writeFile(path,'__Host-orbit_session=test-only-value',{mode:0o600});
  assert.equal(await readSessionCookie(path),'__Host-orbit_session=test-only-value');
  await writeFile(path,'private-value; another=secret');await assert.rejects(readSessionCookie(path),error=>!error.message.includes('private-value'));
  await writeFile(path,'x'.repeat(5000));await assert.rejects(readSessionCookie(path),/small regular file/);
 }finally{await rm(directory,{recursive:true,force:true});}
});

import {transferClient} from '../../scripts/data-transfer/http.mjs';
test('archive HTTP refuses redirects and never repeats or reveals a rejected write',async()=>{
 let calls=0;
 const request=transferClient('https://orbit.example','__Host-orbit_session=private',async(_url,init)=>{calls++;assert.equal(init.redirect,'error');assert.equal(init.headers.Origin,'https://orbit.example');return new Response('secret provider failure',{status:503});});
 await assert.rejects(request('/api/v1/records/transfers',{method:'POST',body:{}}),error=>error.message.includes('503')&&!error.message.includes('secret provider'));
 assert.equal(calls,1);
 await assert.rejects(request('https://unrelated.example'),/Invalid archive endpoint/);
 assert.equal(calls,1);
});
test('status JSON is bounded independently of advertised content length',async()=>{
 const request=transferClient('https://orbit.example','cookie',async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(1_048_577));controller.close();}})));
 await assert.rejects(request('/api/v1/records/transfers/id'),/bounded size/);
});

import {archiveLines} from '../../src/core/shared/archive-lines.ts';
function byteStream(chunks){return new ReadableStream({start(controller){for(const chunk of chunks)controller.enqueue(chunk);controller.close();}});}
test('archive lines preserve split UTF-8 and CRLF boundaries without assembling the file',async()=>{
 const bytes=new TextEncoder().encode('{"name":"français"}\r\n{"id":2}\n');
 const lines=[];for await(const line of archiveLines(byteStream([...bytes].map(value=>new Uint8Array([value]))),100))lines.push(line);
 assert.deepEqual(lines,['{"name":"français"}','{"id":2}']);
});
test('oversized or invalid UTF-8 archive lines abort before another record is consumed',async()=>{
 await assert.rejects(async()=>{for await(const _line of archiveLines(byteStream([new Uint8Array(11)]),10)){}},/supported size/);
 await assert.rejects(async()=>{for await(const _line of archiveLines(byteStream([new Uint8Array([255,10])]),10)){}},/encoded data/);
});

import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {readArchiveFile} from '../../src/core/shared/archive-file.ts';
import {runTransfer} from '../../scripts/data-transfer/run.mjs';
function archiveFixture(){
 const parts=Array.from({length:3},(_,index)=>{const records=[{table:'contacts',index,row:{id:String(index),name:`Contact ${index}`}}];return {index,records,sha256:createHash('sha256').update(JSON.stringify(records)).digest('hex')};});
 const manifest={format:'orbit-export',version:2,exportedAt:'2026-09-13T00:00:00.000Z',tables:[{name:'contacts',columns:['id','name'],rows:3}],parts:3,rows:3};
 const source=JSON.stringify({format:'orbit-export',version:2,manifest}).slice(0,-1)+',"parts":[\n'+parts.map((part,index)=>(index?',':'')+JSON.stringify(part)).join('\n')+'\n]}\n';
 return {manifest,parts,source};
}
test('v2 stream detects truncated archives and altered records before finalize',async()=>{
 const {source}=archiveFixture();
 const parse=async value=>{const result=[];for await(const entry of readArchiveFile(byteStream([new TextEncoder().encode(value)])))result.push(entry);return result;};
 assert.equal((await parse(source)).length,4);
 await assert.rejects(parse(source.replace(/\n]}\n$/,'')),/incomplete/);
 await assert.rejects(parse(source.replace('Contact 1','Changed 1')),/checksum/);
 await assert.rejects(parse(source+'{}'),/after its closing/);
});
test('CLI export streams and validates before publishing a private file without replacing owner files',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'orbit-export-'));
 try{
  const {source,manifest}=archiveFixture(),file=join(directory,'archive.json'),options={operation:'export',origin:'https://orbit.example',file};let creates=0;
  const request=async(path,init={})=>{
   if(path.endsWith('/exports')){creates++;return {id:'export-one',state:'preparing',completedTables:0,totalTables:1};}
   if(path.endsWith('/advance'))return {id:'export-one',state:'ready',manifest};
   assert.ok(path.endsWith('/download'));assert.equal(init.raw,true);
   const bytes=new TextEncoder().encode(source);let offset=0;
   return new Response(new ReadableStream({pull(controller){if(offset===bytes.length){controller.close();return;}controller.enqueue(bytes.slice(offset,offset+7));offset=Math.min(bytes.length,offset+7);}}));
  };
  await runTransfer(options,request,()=>{});assert.equal(await readFile(file,'utf8'),source);assert.equal((await stat(file)).mode&0o777,0o600);
  await assert.rejects(runTransfer(options,request,()=>{}),/Refusing to replace/);assert.equal(creates,1);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('CLI restore resumes by replaying checksummed parts and never finalizes a truncated upload',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'orbit-import-'));
 try{
  const {source,manifest}=archiveFixture(),file=join(directory,'archive.json');await writeFile(file,source);
  const stored=new Map();let failed=false,finalized=0,creates=0;
  const status=()=>({id:'import-one',state:'uploading',manifest,nextPart:stored.size});
  const request=async(path,init={})=>{
   if(path.endsWith('/imports')){creates++;assert.equal(init.body.confirmed,true);return status();}
   if(path.includes('/parts/')){const part=JSON.parse(init.body);if(part.index===1&&!failed){failed=true;throw new Error('Interrupted upload');}if(stored.has(part.index))assert.equal(stored.get(part.index),part.sha256);stored.set(part.index,part.sha256);return status();}
   if(path.endsWith('/finalize')){finalized++;return {id:'import-one',state:'complete'};}
   return status();
  };
  const options={operation:'import',origin:'https://orbit.example',file};
  await assert.rejects(runTransfer(options,request,()=>{}),/Interrupted/);assert.equal(finalized,0);
  await runTransfer({...options,resume:'import-one'},request,()=>{});assert.equal(creates,1);assert.equal(finalized,1);assert.equal(stored.size,3);
  await writeFile(file,source.replace(/\n]}\n$/,''));await assert.rejects(runTransfer({...options,resume:'import-one'},request,()=>{}),/incomplete/);assert.equal(finalized,1);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('manifest row totals and per-table indices detect omissions despite valid part hashes',async()=>{
 const {source}=archiveFixture();
 const altered=source.replace('"rows":3','"rows":4').replace('"parts":3,"rows":3','"parts":3,"rows":4');
 await assert.rejects(async()=>{for await(const _entry of readArchiveFile(byteStream([new TextEncoder().encode(altered)]))){}},/incomplete/);
});
test('valid large text records stream through the documented 16 MiB part boundary',async()=>{
 const records=[{table:'contacts',index:0,row:{id:'large',name:'a'.repeat(1_100_000)}}];
 const part={index:0,records,sha256:createHash('sha256').update(JSON.stringify(records)).digest('hex')};
 const manifest={format:'orbit-export',version:2,exportedAt:'2026-09-13T00:00:00.000Z',tables:[{name:'contacts',columns:['id','name'],rows:1}],parts:1,rows:1};
 const source=JSON.stringify({format:'orbit-export',version:2,manifest}).slice(0,-1)+',"parts":[\n'+JSON.stringify(part)+'\n]}';
 let count=0;for await(const entry of readArchiveFile(byteStream([new TextEncoder().encode(source)])))if(entry.kind==='part'){count++;assert.equal(entry.part.records[0].row.name.length,1_100_000);}assert.equal(count,1);
});
