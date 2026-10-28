import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {getPlatformProxy} from 'wrangler';
import {createTestDependencies} from '../support/test-dependencies';

test('BASE-OPS-002 previous schema sample and four outbound states survive migration and SQL backup recovery',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'orbit-migration-test-')),migrations=join(directory,'migrations'),config=join(directory,'wrangler.toml'),state=join(directory,'.wrangler/state'),recovery=join(directory,'recovery'),snapshot=join(directory,'before.json'),backup=join(directory,'before.sql');
 const run=(args:string[],env:Record<string,string>={})=>execFileSync(process.execPath,args,{env:{...process.env,CI:'1',...env},encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000});
 const wrangler=(args:string[],persist=state)=>run(['node_modules/wrangler/bin/wrangler.js','d1',...args,'--local','--config',config,...(args[0]==='export'?[]:['--persist-to',persist])]);
 const inspect=(mode:string,persist=state)=>run(['node_modules/tsx/dist/cli.mjs','tests/acceptance/migration-state.ts',mode,snapshot],{MIGRATION_CONFIG:config,MIGRATION_STATE:join(persist,'v3')});
 try{
  await mkdir(migrations);await writeFile(config,`name = "orbit-migration-test"\ncompatibility_date = "2026-09-08"\ncompatibility_flags = ["nodejs_compat"]\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "orbit-migration-test"\ndatabase_id = "00000000-0000-0000-0000-000000000000"\nmigrations_dir = "${migrations}"\n`);
  const files=(await readdir('migrations/core')).filter(file=>file.endsWith('.sql')).sort();
  for(const file of files.slice(0,4))await copyFile(join('migrations/core',file),join(migrations,file));
  wrangler(['migrations','apply','DB']);
  const platform=await getPlatformProxy<{DB:D1Database}>({configPath:config,persist:{path:join(state,'v3')},remoteBindings:false});
  try{
   await createTestDependencies(platform.env.DB).sampleData.seed();
   await platform.env.DB.prepare("UPDATE workspace_settings SET working_hours_json=json_object('start','08:00','end','18:00','weekdays',json('[1,2,3,4,5]'))").run();
   for(const [index,status]of ['queued','accepted','failed','delivery-unknown'].entries())await platform.env.DB.prepare("INSERT INTO outbound_messages(id,draft_id,revision,opportunity_id,operator_id,recipient_email,subject,body,state,provider_message_id,failure,settlement_id,created_at,updated_at) SELECT ?,id,?,opportunity_id,author_id,recipient_email,?,?,?,?,'Recorded prior failure',?,created_at,updated_at FROM drafts ORDER BY id LIMIT 1").bind(`migration-${index}`,index+1,`Old ${status} subject`,`Old approved ${status} body`,status,`provider-${index}`,`settlement-${index}`).run();
  }finally{await platform.dispose();}
  inspect('capture');wrangler(['export','DB','--output',backup]);
  wrangler(['execute','DB','--file',backup],recovery);const restored=JSON.parse(inspect('recovered',recovery));assert.equal(restored.allOriginalValuesPreserved,true);
  for(const file of files.slice(4))await copyFile(join('migrations/core',file),join(migrations,file));
  const outboundMigration=files.find(file=>file.startsWith('0006_'))!,outboundSql=await readFile(join(migrations,outboundMigration),'utf8');await writeFile(join(migrations,outboundMigration),outboundSql.replace('DROP TABLE outbound_messages_previous;',"SELECT migration_forced_failure();\nDROP TABLE outbound_messages_previous;"));
  assert.throws(()=>wrangler(['migrations','apply','DB']),/migration_forced_failure/);
  const failed=JSON.parse(wrangler(['execute','DB','--json','--command',"SELECT count(*) AS retained FROM outbound_messages; SELECT count(*) AS partial FROM sqlite_master WHERE name='outbound_messages_previous'"]));assert.equal(failed[0].results[0].retained,4);assert.equal(failed[1].results[0].partial,0);
  await writeFile(join(migrations,outboundMigration),outboundSql);
  wrangler(['migrations','apply','DB']);const migrated=JSON.parse(inspect('migrated'));assert.equal(migrated.allOriginalValuesPreserved,true);assert.equal(migrated.foreignKeysValid,true);assert.equal(migrated.outboundStates.length,4);
 }finally{await rm(directory,{recursive:true,force:true});}
});
