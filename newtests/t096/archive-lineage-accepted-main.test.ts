import {test} from 'node:test';
import {proveArchiveLineage} from './archive-lineage-proof';
import {acceptedMain} from './main-fixture';
import {olderLocalArchiveGenerations} from './portability-sanity-older-archives';
import {legacyImportPreflight} from './portability-sanity-preflight';
import {proveReleasedForecastUpgrade} from './released-forecast-upgrade';
import {dashboardStartingUpgrade} from './dashboard-upgrade';
import {ownershipStartingUpgrades} from './ownership-upgrade';
import {recordMailForwardUpgrade} from '../../tests/support/record-mail-upgrade';

// Release/nightly: actual immutable older installations and the 100-table/100-column
// capacity lineage each require their own prior runtime and full durable transfers.
test('release qualification: populated immutable native lineage and older feature upgrades preserve history without replaying authority',async()=>{
 await proveArchiveLineage(acceptedMain);
 await legacyImportPreflight();
 await olderLocalArchiveGenerations();
 await proveReleasedForecastUpgrade();
 await dashboardStartingUpgrade();
 await ownershipStartingUpgrades();
 await recordMailForwardUpgrade();
});
