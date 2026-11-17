import assert from 'node:assert/strict';
import {createApp} from '../../tests/support/app';
import {signIn} from './fixture';

/** A restored page stays closed until its owner reviews new capture authority. */
export async function restoredFormPublication(db:D1Database,formId:string){
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}}),{cookie}=await signIn(db,'owner@fold.test'),base='/api/v2/workspaces/workspace/forms';
 const request=async(path:string,body?:unknown)=>{
  const response=await app.request(`https://orbit.test${path}`,{method:body===undefined?'GET':'POST',headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal(response.status,200,await response.clone().text());return response.json() as Promise<any>;
 };
 const list=await request(base),form=list.find((row:any)=>row.id===formId),publications=await request(`${base}/${formId}/publications`),publication=publications.find((row:any)=>row.form_revision===form.revision);
 assert.ok(publication,'the current reviewed revision survives restore');
 assert.equal(publication.state,'withdrawn');
 assert.equal(list.find((form:any)=>form.id===formId).latest_publication_state,'withdrawn','the saved row exposes the withdrawn publication');
 const review=await request(`${base}/publications/${publication.id}`);
 assert.equal(review.requiresAuthorization,true);
 assert.equal((await app.request(`https://orbit.test${review.path}`)).status,404);
 const premature=await app.request(`https://orbit.test${base}/publications/${publication.id}/publish`,{method:'POST',headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:'{}'});
 assert.equal(premature.status,400,'publishing a withdrawn page requires a new approval');
 assert.equal((await app.request(`https://orbit.test${review.path}`)).status,404,'a refused publish leaves the page closed');
 await request(`${base}/publications/${publication.id}/approve`,{artifactHash:review.hash,formRevision:review.formRevision,capture:{maxRecords:50,expiresAt:new Date(Date.now()+86400000).toISOString()}});
 await request(`${base}/publications/${publication.id}/publish`,{});
 assert.equal((await app.request(`https://orbit.test${review.path}`)).status,200);
 assert.equal((await request(base)).find((form:any)=>form.id===formId).latest_publication_state,'published');
}
