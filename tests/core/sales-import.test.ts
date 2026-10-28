import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {importSales} from '../support/sales-sanity-imports';
test('RECORD-001 RECORD-003 RECORD-005 RECORD-007 RECORD-008 a seller reviews vendor and spreadsheet moves, sends only to permitted customers, replays safely and undoes without losing native work',async t=>{const f=await launchFixture();try{await importSales(f,t);}finally{await f.dispose();}});
