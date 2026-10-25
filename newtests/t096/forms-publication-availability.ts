import assert from 'node:assert/strict';
import {createApp} from '../../tests/support/app';
import {publication} from './publication-fixture';
import type {fixture} from './fixture';

/** The owner sees the same availability as a visitor after editing a published form. */
export async function publicationAvailabilityJourney(f:Awaited<ReturnType<typeof fixture>>){
 const p=await publication(f,'availability-check'),app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})}}),headers={Cookie:f.cookie,'Content-Type':'application/json',Origin:'https://orbit.test'},base='https://orbit.test/api/v2/workspaces/workspace/forms',review=`${base}/publications/${p.compiled.operationId}`;
 assert.equal((await app.request(`https://orbit.test/p/${p.slug}`)).status,200);
 const current=await app.request(review,{headers});assert.equal(current.status,200);assert.equal((await current.json() as {unavailableReason:string|null}).unavailableReason,null);
 const saved=await p.forms.entity(p.saved.id,'form'),body=JSON.parse(saved.body_json);
 const update=await app.request(base,{method:'POST',headers,body:JSON.stringify({id:p.saved.id,revision:p.saved.revision,form:body.form,landing:{...body.landing,heading:'Request a revised walkthrough'}})});assert.equal(update.status,200,await update.clone().text());
 assert.equal((await app.request(`https://orbit.test/p/${p.slug}`)).status,404);
 const stale=await app.request(review,{headers});assert.equal(stale.status,200);assert.ok((await stale.json() as {unavailableReason:string|null}).unavailableReason);
 assert.equal((await app.request(`${review}/publish`,{method:'POST',headers,body:'{}'})).status,403);
 assert.equal((await app.request(`https://orbit.test/p/${p.slug}`)).status,404);
 assert.equal((await app.request(`${review}/withdraw`,{method:'POST',headers,body:'{}'})).status,200);
}
