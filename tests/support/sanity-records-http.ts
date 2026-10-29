import assert from 'node:assert/strict';
import type {launchFixture} from './launch-fixture';
export type RecordsFixture=Awaited<ReturnType<typeof launchFixture>>;
export async function responseJson(response:Response){const text=await response.text();assert.ok(response.ok,`${response.status}: ${text}`);return JSON.parse(text) as any;}
/** Native record doors; fixture-only stores are used solely to seed historical artifacts. */
export function nativeRecords(f:Pick<RecordsFixture,'request'>){return {
 save:async(kind:string,input:unknown,_actor?:string,id?:string)=>responseJson(await f.request(`records/${kind}${id?'/'+id:''}`,id?'PUT':'POST',input)),
 detail:async(kind:string,id:string)=>responseJson(await f.request(`records/${kind}/${id}`)),
 note:async(kind:string,id:string,input:unknown)=>responseJson(await f.request(`records/${kind}/${id}/entries`,'POST',input)),
 remove:async(kind:string,id:string)=>responseJson(await f.request(`records/${kind}/${id}`,'DELETE',{confirmed:true})),
};}
