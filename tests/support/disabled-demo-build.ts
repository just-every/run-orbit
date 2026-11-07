import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';

/** Build the buyer's disabled configuration without editing the candidate checkout. */
export async function disabledDemoBuild() {
 const root=await mkdtemp(join(tmpdir(),'orbit-disabled-demo-'));
 try {
  const files=execFileSync('git',['ls-files','-co','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
  for(const file of files){await mkdir(dirname(join(root,file)),{recursive:true});await copyFile(file,join(root,file));}
  await symlink(resolve('node_modules'),join(root,'node_modules'),'dir');
  const config=join(root,'src/ext/config.ts'),before=await readFile(config,'utf8');
  const disabled=before.replace(/(demo\s*:\s*\{\s*enabled\s*:\s*)true/,'$1false');
  assert.notEqual(disabled,before,'The isolated buyer configuration disables the demo');
  await writeFile(config,disabled);
  try {
   execFileSync(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'build','--logLevel','error'],{cwd:root,env:{...process.env,CI:'1'},timeout:1200000,stdio:'pipe',maxBuffer:16*1024*1024});
  } catch {throw Error('Disabled demo build failed; no private build output retained');}
  return {config:join(root,'dist/server/wrangler.json'),dispose:()=>rm(root,{recursive:true,force:true})};
 } catch(error){await rm(root,{recursive:true,force:true});throw error;}
}
