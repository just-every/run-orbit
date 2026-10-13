import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture,nativeRecord} from './fixture';
import {emittedWorker} from './emitted-fixture';
import {emittedRequest} from './emitted-request';

test('emitted current CRM reads authenticated by a genuine native fixture session survive ordinary Worker restarts',async()=>{const f=await fixture();let worker:Awaited<ReturnType<typeof emittedWorker>>|undefined;try{const record=await nativeRecord(f,'contact',{name:'Restart native contact',email:'restart@fixture.test'});for(let run=0;run<2;run++){worker=await emittedWorker(f.target);const response=await emittedRequest(worker,f.cookie,`/api/v2/workspaces/workspace/records/contact/${record.ref.id}`);assert.equal(response.status,200);const current=await response.json() as any;assert.equal(current.fields.name,'Restart native contact');assert.equal(current.ref.id,record.ref.id);await worker.dispose();worker=undefined;await f.target.reopen();assert.equal(await f.db.prepare('SELECT name FROM contacts WHERE id=?').bind(record.ref.id).first('name'),'Restart native contact');}}finally{await worker?.dispose();await f.close();}});
