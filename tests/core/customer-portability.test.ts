import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captureFixture} from '../support/capture-fixture';
import {launchFixture} from '../support/launch-fixture';
import {currentSalesData} from '../support/current-sales-data';
import {proveCurrentArchive} from '../support/current-sales-archive';
import {exported,captured} from '../support/capture-data-archive';

test('DATA-003 current sales capabilities round-trip without authority and erase across public reads',async()=>{
 const f=await captureFixture(),target=await launchFixture();try{
    await captured(f);
    const current=await currentSalesData(f);
    await f.refreshSignIn();
    const archive = await exported(f), names = archive.manifest.tables.map((table: { name: string }) => table.name), text = JSON.stringify(archive);
    for (const table of ['capture_sources', 'capture_items', 'capture_proposals']) assert.ok(names.includes(table), `${table} is exported`);
    assert.ok(!names.includes('capture_credentials'));

    assert.ok(text.includes('Can we talk on Tuesday?'), 'the captured original travels');

    let imported = (await (await target.request('records/archive/imports', 'POST', { confirmed: true, manifest: archive.manifest })).json()) as any;
    for (const part of archive.parts) assert.ok((await target.request(`records/archive/imports/${imported.id}/parts/${part.index}`, 'PUT', part)).ok);
    for (let n = 0; n < 700 && imported.state !== 'complete'; n++) imported = await (await target.request(`records/archive/imports/${imported.id}/finalize`, 'POST', {})).json();
    assert.equal(imported.state, 'complete');
    for (const table of ['capture_sources', 'capture_items', 'capture_proposals', 'signals', 'signal_links', 'unlinked_signals'])
      assert.deepEqual((await target.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results, (await f.db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()).results, `${table} restores equivalently`);
    assert.equal(await target.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'), 0, 'a restored provider source has no credential and must be reconnected');
    await proveCurrentArchive(f,target,current,archive);

 }finally{await f.dispose();await target.dispose();}
});
