import test from 'node:test';
import {VERSION} from '../../scripts/edition-authoring/manifest.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';

test('external acceptance is bound to the authoritative edition commit, not inherited family pins',()=>{
 const dir=mkdtempSync(join(tmpdir(),'orbit-receipts-'));
 try {
  const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
  git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
  writeFileSync(join(dir,'CONTRACT.md'),'**AI-001 — External result**\n');writeFileSync(join(dir,'BASELINE.md'),'');
  copyFileSync(resolve('scripts/report-contract-results.mjs'),join(dir,'report.mjs'));
  copyFileSync(resolve('scripts/report-source-identity.mjs'),join(dir,'report-source-identity.mjs'));
  git('add','.');git('commit','-qm','Fixture');const commit=git('rev-parse','HEAD');
  mkdirSync(join(dir,'verification'));
  const receipt={name:'AI-001 actual provider journey',status:'passed',familyCommit:'a'.repeat(40),baseCommit:'b'.repeat(40)};
  const run=(value)=>{writeFileSync(join(dir,'verification/external-results.jsonl'),JSON.stringify(value)+'\n');return spawnSync(process.execPath,['report.mjs'],{cwd:dir,encoding:'utf8'}).status;};
  assert.equal(run(receipt),1);
  assert.equal(run({...receipt,editionCommit:'c'.repeat(40)}),1);
  assert.equal(run({...receipt,editionCommit:commit}),0);
  writeFileSync(join(dir,'untracked-source.ts'),'export const changed=true;');
  assert.equal(run({...receipt,editionCommit:commit}),1);
  rmSync(join(dir,'untracked-source.ts'));
  writeFileSync(join(dir,'CONTRACT.md'),'**AI-001 — Changed requirement**\n');
  assert.equal(run({...receipt,editionCommit:commit}),1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('hosted source preflight rejects dirty source and committed lock drift before external work',async()=>{
 const {verifiedEditionCommit}=await import('../acceptance/edition-source.mjs');
 const {cpSync}=await import('node:fs');
 const dir=mkdtempSync(join(tmpdir(),'orbit-source-preflight-'));
 try {
  const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
  const cli=(command)=>execFileSync(process.execPath,['scripts/edition-authoring/cli.mjs',command],{cwd:dir,stdio:'pipe'});
  git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
  cpSync(resolve('scripts/edition-authoring'),join(dir,'scripts/edition-authoring'),{recursive:true});
  writeFileSync(join(dir,'source.txt'),'original\n');
  writeFileSync(join(dir,'edition.json'),JSON.stringify({schemaVersion:1,id:'fixture/product',toolchain:{id:'runeditrun/edition-authoring',version:VERSION},components:[{id:'fixture/product',role:'edition',source:{kind:'local',paths:['source.txt']}}]}));
  git('add','.');cli('lock');git('add','.');git('commit','-qm','Fixture');
  assert.equal(verifiedEditionCommit(dir),git('rev-parse','HEAD'));
  writeFileSync(join(dir,'source.txt'),'changed\n');
  assert.throws(()=>verifiedEditionCommit(dir),/clean committed/);
  git('add','.');git('commit','-qm','Intentional edit without relock');
  assert.throws(()=>verifiedEditionCommit(dir));
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test('local coverage reports in gitless materializations and never borrows an enclosing repository identity',async()=>{
 const {cpSync,readFileSync}=await import('node:fs');
 const root=mkdtempSync(join(tmpdir(),'orbit-materialized-report-'));
 const dir=join(root,'author'),artifact=join(root,'artifact');mkdirSync(dir);
 try {
  const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
  git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
  cpSync(resolve('scripts/edition-authoring'),join(dir,'scripts/edition-authoring'),{recursive:true});
  for(const file of ['report-contract-results.mjs','report-source-identity.mjs'])copyFileSync(resolve('scripts',file),join(dir,'scripts',file));
  writeFileSync(join(dir,'CONTRACT.md'),'**AI-001 — Local result**\n');writeFileSync(join(dir,'BASELINE.md'),'');
  writeFileSync(join(dir,'edition.json'),JSON.stringify({schemaVersion:1,id:'fixture/product',toolchain:{id:'runeditrun/edition-authoring',version:VERSION},components:[{id:'fixture/product',role:'edition',source:{kind:'local',paths:['CONTRACT.md']}}]}));
  mkdirSync(join(dir,'verification'));writeFileSync(join(dir,'verification/core-results.jsonl'),JSON.stringify({name:'AI-001 local test',status:'passed'})+'\n');
  git('add','.');git('commit','-qm','Authoritative fixture');
  execFileSync(process.execPath,['scripts/edition-authoring/cli.mjs','materialize',artifact],{cwd:dir,stdio:'pipe'});
  const run=()=>spawnSync(process.execPath,['scripts/report-contract-results.mjs'],{cwd:artifact,encoding:'utf8'}).status;
  assert.equal(run(),0);
  assert.deepEqual(JSON.parse(readFileSync(join(artifact,'verification/contract-results.json'),'utf8')).counts,{pending:0,satisfied:1,broken:0});
  // Without a local assertion, even a plausible external receipt has no trusted identity.
  writeFileSync(join(artifact,'verification/core-results.jsonl'),'');
  writeFileSync(join(artifact,'verification/external-results.jsonl'),JSON.stringify({name:'AI-001 external test',status:'passed',editionCommit:git('rev-parse','HEAD')})+'\n');
  assert.equal(run(),1);
  execFileSync('git',['init','-q',root]);execFileSync('git',['-C',root,'config','user.name','Fixture']);execFileSync('git',['-C',root,'config','user.email','fixture@example.invalid']);execFileSync('git',['-C',root,'commit','--allow-empty','-qm','Enclosing workspace']);
  const parent=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  writeFileSync(join(artifact,'verification/external-results.jsonl'),JSON.stringify({name:'AI-001 external test',status:'passed',editionCommit:parent})+'\n');
  assert.equal(run(),1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
