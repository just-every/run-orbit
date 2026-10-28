import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {eraseImportedSales} from '../support/sales-sanity-privacy';
import {eraseCustomerHistory} from '../support/sales-sanity-records';
test('DATA-002 RECORD-013 RECORD-008 erasure withdraws customer history and imported originals while preserving unrelated deals and safe undo',async()=>{const f=await launchFixture();try{const erased=await eraseCustomerHistory(f);await eraseImportedSales(f,erased);}finally{await f.dispose();}});
