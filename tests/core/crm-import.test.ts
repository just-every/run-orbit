import {importOwnerFlow} from '../support/import-owners';
import {verifySuppressionAndUndo,recoverInterruptedImport,refuseStaleContactReview} from '../support/sanity-records-import-safety';
import {eraseImportedCustody,eraseRejectedOriginals,preserveUnrelatedReview} from '../support/sanity-records-import-erasure';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {genericCsvFlow} from '../support/crm-import-flow';
import {migrateVendorExport} from '../support/crm-vendor-journey';
test('RECORD-008 DATA-002 DATA-003 migrate HubSpot exports and spreadsheets through review, suppression, replay, guarded undo and complete source erasure',async t=>{
 const f=await launchFixture();try{
 await migrateVendorExport(f,'hubspot',message=>t.diagnostic(message));
 await genericCsvFlow(f);await importOwnerFlow(f);
 await verifySuppressionAndUndo(f);
 await recoverInterruptedImport(f);
 await refuseStaleContactReview(f);
 await eraseImportedCustody(f);
 await eraseRejectedOriginals(f);
 await preserveUnrelatedReview(f);
 }finally{await f.dispose();}
});
