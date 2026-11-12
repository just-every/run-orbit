import {launchFixture} from '/workspace/run-orbit/tests/support/launch-fixture.ts';
import {genericCsvFlow} from '/workspace/run-orbit/tests/support/crm-import-flow.ts';
const f=await launchFixture();
try{await genericCsvFlow(f);console.log('PASS existing genericCsvFlow: malformed rows remain reviewable rejections, valid rows import, replay and undo preserve records.');}finally{await f.dispose();}
