import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {migrateVendorExport} from '../support/crm-vendor-journey';

test('RECORD-008 migrate Pipedrive exports through review, suppression, replay and guarded undo while preserving independent and alias stops',async t=>{
 const f=await launchFixture();try{
  await migrateVendorExport(f,'pipedrive',message=>t.diagnostic(message));
 }finally{await f.dispose();}
});
