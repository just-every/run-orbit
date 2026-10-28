import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,collaborator,nativeRecord} from './fixture';
import {createApp} from '../../tests/support/app';
import {archiveHttp} from './archive-http-proof';
import {recoverExport} from './archive-export-step';
import {recoverImport} from './archive-import-step';
import {ownerSchema,rollbackRestore} from './archive-rollback-step';
import {terminalRecovery} from './archive-terminal-step';

test('DATA-001 native archive recovery keeps the frozen export, rolls back destination drift and resumes the same interrupted restore',async()=>{
 const source=await fixture(),target=await fixture();
 try{
  for(const [f,id] of [[source,'source'],[target,'target']] as const){
   await ownerSchema(f.db);
   await f.db.prepare('INSERT INTO owner_recovery_data VALUES(?,?,?,?,?)').bind(id,Uint8Array.of(0,1,127,128,255).buffer,Number.MAX_SAFE_INTEGER,2.75,'typed '+id).run();
   await f.db.prepare('INSERT INTO owner_recovery_detail VALUES(?,?)').bind('detail-'+id,id).run();
  }
  const contact=await nativeRecord(source,'contact',{name:'Original frozen export'}),restricted=await collaborator(source,'seller');
  const archive=await recoverExport(source,contact);
  const request=archiveHttp(createApp({database:source.db,assets:{fetch:async()=>{throw Error('HTTP archive journey');}}}),()=>source.cookie);
  assert.equal(archive.parts.flatMap(part=>part.records).find(row=>row.table==='contacts')!.row.name,'New live export');
  await rollbackRestore(source,target,archive);
  await recoverImport(source,target,archive);
  assert.equal(await target.db.prepare('SELECT name FROM contacts').first('name'),'New live export');
  assert.deepEqual((await target.db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  await terminalRecovery(archive,source,restricted.operator.email);
  await request(`/exports/${archive.id}/abort`,'POST',{});
 }finally{await source.close();await target.close();}
});
