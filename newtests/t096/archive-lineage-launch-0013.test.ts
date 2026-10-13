import {test} from 'node:test';
import {proveArchiveLineage} from './archive-lineage-proof';
test('authenticated immutable native launch-0013 archive preserves its complete 100-table baseline across fold restore, restart and re-export',()=>proveArchiveLineage('f28dcf594434babed876c936e73009c42f0f67d3'));
