import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateFoldPart} from '../../src/core/features/records/archive-fold-validation';
import {decodeArchiveCell,encodeArchiveRow} from '../../src/core/features/records/archive-binary';
import type {ArchiveTable} from '../../src/core/features/records/archive-schema';

const columns=[{cid:0,name:'integer',type:'INTEGER',notnull:1,dflt_value:null,pk:0},{cid:1,name:'real',type:'REAL',notnull:1,dflt_value:null,pk:0},{cid:2,name:'text',type:'TEXT',notnull:1,dflt_value:null,pk:0}];
const catalog=[{name:'owner_typed',columns}] as ArchiveTable[];
const manifest={format:'orbit-export' as const,version:3 as const,generation:'orbit-fold-1' as const,schemaHash:'a'.repeat(64),exportedAt:'2026-10-01T00:00:00.000Z',tables:[{name:'owner_typed',columns:columns.map(c=>c.name),rows:1}],rows:1,parts:1};
const part=(row:Record<string,string|number|null>)=>({index:0,sha256:'b'.repeat(64),records:[{table:'owner_typed',index:0,row}]});
test('v3 ordinary scalar cells retain every native v2 affinity rejection',()=>{
 const ordinary={integer:12,real:2.75,text:'value'};assert.deepEqual(validateFoldPart(part(ordinary),catalog,manifest).records[0]!.row,ordinary);
 for(const [column,invalid] of [['integer',12.5],['integer',Number.MAX_SAFE_INTEGER+1],['integer','12'],['integer','orbit-cell-v1:text:12'],['real','2.75'],['text',23],['integer',null],['real',Infinity],['real',NaN],['text','orbit-cell-v1:unknown:x']] as const)assert.throws(()=>validateFoldPart(part({...ordinary,[column]:invalid}),catalog,manifest),/Invalid|Unknown/);
 assert.throws(()=>validateFoldPart(part({integer:1,real:2,other:'missing text'}),catalog,manifest),/Invalid/);
});
test('v3 binary storage has an explicit codec exception while escaped text retains its affinity',()=>{
 const bytes=Uint8Array.of(0,1,127,128,255),encoded=encodeArchiveRow({integer:bytes,real:bytes.buffer,text:bytes});
 const validated=validateFoldPart(part(encoded),catalog,manifest);for(const value of Object.values(validated.records[0]!.row))assert.deepEqual(new Uint8Array(decodeArchiveCell(value) as ArrayBuffer),bytes);
 const text='orbit-cell-v1:blob:AA==',row=encodeArchiveRow({integer:1,real:2,text});assert.equal(decodeArchiveCell(validateFoldPart(part(row),catalog,manifest).records[0]!.row.text!),text);
 assert.throws(()=>validateFoldPart(part({integer:1,real:2,text:'orbit-cell-v1:blob:AB='}),catalog,manifest),/Invalid binary/);
});
