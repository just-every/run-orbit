import {test} from 'node:test';
import {proveArchiveLineage} from './archive-lineage-proof';
import {acceptedMain} from './main-fixture';
test('authenticated immutable native accepted-main archive preserves its complete 100-table baseline across fold restore, restart and re-export',()=>proveArchiveLineage(acceptedMain));
