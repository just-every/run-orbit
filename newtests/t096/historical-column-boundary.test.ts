import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {exactMainDatabase,acceptedMain} from './main-fixture';
import {nativeFile} from './native-history';

test('historical launch contacts already at 100 physical columns honestly refuse the later native 101st-column migration',async()=>{const db=await exactMainDatabase('f28dcf594434babed876c936e73009c42f0f67d3');try{const count=await db.db.prepare("SELECT count(*) n FROM pragma_table_xinfo('contacts') WHERE hidden<>1").first<number>('n');for(let index=count!;index<100;index++)await db.db.prepare(`ALTER TABLE contacts ADD COLUMN owner_boundary_${index} TEXT`).run();assert.equal(await db.db.prepare("SELECT count(*) n FROM pragma_table_xinfo('contacts') WHERE hidden<>1").first('n'),100);const migration=join(db.directory,'original-0014.sql');await writeFile(migration,nativeFile(acceptedMain,'migrations/core/0014_contact_suppression.sql'),{mode:0o600});await db.close();const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config',db.config,'--persist-to',db.state,'--file',migration],{encoding:'utf8',env:{...process.env,CI:'1'},timeout:120000});assert.notEqual(result.status,0);assert.match(result.stderr+result.stdout,/too many columns|SQLITE_TOOBIG|column limit/i);await db.reopen();assert.equal(await db.db.prepare("SELECT count(*) n FROM pragma_table_xinfo('contacts') WHERE hidden<>1").first('n'),100);assert.equal(await db.db.prepare("SELECT count(*) n FROM pragma_table_info('contacts') WHERE name='contactability_revision'").first('n'),0);
 }finally{await db.dispose();}});
