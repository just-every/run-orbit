import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {manageSalesRecords,mergeSalesRecords} from '../support/sales-sanity-records';
import {salesFieldMeaning} from '../support/sales-sanity-fields';
test('RECORD-002 RECORD-004 RECORD-006 RECORD-009 RECORD-011 RECORD-014 RECORD-015 RECORD-016 OPP-009 TEAM-003 a seller finds and relates accounts, reviews ownership and duplicate merges, then evolves typed fields without rewriting history',async()=>{const f=await launchFixture();try{await manageSalesRecords(f);await mergeSalesRecords(f);await salesFieldMeaning(f.db);}finally{await f.dispose();}});
