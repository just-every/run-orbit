import assert from 'node:assert/strict';
import type {APIRequestContext} from '@playwright/test';

/** Owner review and visitor availability agree before and after the saved form changes. */
export async function publicationAvailabilityJourney(request:APIRequestContext,review:string,publicPath:string,revise:()=>Promise<void>,withdraw:()=>Promise<void>){
 assert.equal((await request.get(publicPath)).status(),200);
 const current=await request.get(review);assert.equal(current.status(),200);assert.equal((await current.json()).unavailableReason,null);
 await revise();
 assert.equal((await request.get(publicPath)).status(),404);
 const stale=await request.get(review);assert.equal(stale.status(),200);assert.ok((await stale.json()).unavailableReason);
 assert.equal((await request.post(`${review}/publish`,{headers:{Origin:new URL(review).origin},data:{}})).status(),403);
 assert.equal((await request.get(publicPath)).status(),404);
 await withdraw();
}
