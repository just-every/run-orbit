import assert from 'node:assert/strict';
import type {FormService} from '../../src/core/features/forms/service';
import type {FormIntake} from '../../src/core/features/forms/definition';
import {createPublicFormRoutes} from '../../src/core/features/forms/public-routes';
import {TEST_SESSION_SECRET} from '../../tests/support/app';
/** Exercise the real anonymous HTTP admission before native capture assertions. */
export async function submitForm(forms:FormService,slug:string,intake:FormIntake){
 const app=createPublicFormRoutes(forms.db,{secret:TEST_SESSION_SECRET}),origin='https://orbit.test',headers={'Content-Type':'application/json',Origin:origin};
 const challenge=await app.request(`${origin}/${slug}/challenge`,{method:'POST',headers,body:JSON.stringify({idempotencyKey:intake.idempotencyKey})});
 if(!challenge.ok)throw Error(`Form challenge refused (${challenge.status}).`);
 const token=(await challenge.json() as {token:string}).token;assert.equal(typeof token,'string');
 await new Promise(resolve=>setTimeout(resolve,2100));
 const response=await app.request(`${origin}/${slug}`,{method:'POST',headers,body:JSON.stringify({...intake,fillToken:token,honeypot:''})});
 if(!response.ok)throw Error(`Form admission refused (${response.status}).`);
 const receipt=await response.json() as {submissionId:string;reviewRequired:boolean;replayed:boolean};assert.equal(typeof receipt.submissionId,'string');return receipt;
}
