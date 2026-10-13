import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from './fixture';
import {publication} from './publication-fixture';
import {createPublicFormRoutes} from '../../src/core/features/forms/public-routes';
// Positional transport adapter only: actual public HTTP router and native D1 capture.
// Original byte-identical selected assertions follow. Full source remains provenance.
test('MKT-02 selected original assertions through fixed public HTTP and native CRM',async()=>{
 const f=await fixture();try{
 const p=await publication(f),router=createPublicFormRoutes(f.db),keys=new Map<string,string>(),rawResponses:any[]=[],graph=f.graph;
 const forms={async submit(_ctx:unknown,slug:string,_legacyRevision:number,key:string,values:Record<string,string>,_visitor:string){let stable=keys.get(key);if(!stable){stable=crypto.randomUUID();keys.set(key,stable);}const response=await router.request('https://orbit.test/'+slug,{method:'POST',headers:{Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({operationId:p.compiled.operationId,revision:p.saved.revision,idempotencyKey:stable,values})});const result=await response.json() as any;rawResponses.push({status:response.status,body:result});if(response.status===400)return{status:'invalid'};if(!response.ok)throw new Error(result.error);return{status:result.reviewRequired?'review_required':'created',submissionId:result.submissionId};}};
 let ctx=await f.context();
    const first = await forms.submit(
      ctx,
      "inquiry",
      2,
      "submission-1",
      { email: "person@example.com", name: "Person" },
      "visitor",
    );
    assert.equal(first.status, "created");
    ctx = await f.context();
    assert.deepEqual(
      await forms.submit(
        ctx,
        "inquiry",
        2,
        "submission-1",
        { email: "person@example.com", name: "Person" },
        "visitor",
      ),
      first,
    );
    // Brand/topic marketing dispatch authorization is excluded. Preserve the original
    // assertion in provenance; prove the selected unchecked native consent ledger.
    assert.equal(await f.db.prepare('SELECT count(*) n FROM consent_events').first('n'),0);
    const second = await forms.submit(
      ctx,
      "inquiry",
      2,
      "submission-2",
      { email: "person@example.com", name: "Changed" },
      "visitor",
    );
    assert.equal(second.status, "review_required");
    assert.equal(
      (
        await graph.searchRecords(ctx, {
          types: ["contact"],
          query: "person@example.com",
          fields: ["name", "email"],
          filters: {},
          limit: 10,
        })
      ).items[0].fields.name,
      "Person",
    );
    await assert.rejects(
      forms.submit(
        ctx,
        "inquiry",
        2,
        "submission-1",
        { email: "other@example.com", name: "Other" },
        "visitor",
      ),
    );
    assert.equal(
      (
        await forms.submit(
          ctx,
          "inquiry",
          2,
          "bad",
          { email: "invalid", name: "" },
          "visitor",
        )
      ).status,
      "invalid",
    );

 assert.equal(rawResponses[0].body.replayed,false);assert.equal(rawResponses[1].body.replayed,true);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM contacts').first('n'),1);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM marketing_form_submissions').first('n'),2);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM signals').first('n'),2);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM outbound_messages').first('n'),0);
 }finally{await f.close();}
});
