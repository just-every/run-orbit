import assert from 'node:assert/strict';
import {test} from 'node:test';
import {requestOfflineFixture} from '../../scripts/browser-runtime.mjs';
test('ordinary offline fixture execution never requires the browser broker',async()=>{
 const previous=process.env.ORBIT_FIXTURE_BROKER;delete process.env.ORBIT_FIXTURE_BROKER;
 try{assert.equal(await requestOfflineFixture('tests/support/issue-operator-session.ts'),false);}finally{if(previous===undefined)delete process.env.ORBIT_FIXTURE_BROKER;else process.env.ORBIT_FIXTURE_BROKER=previous;}
});
