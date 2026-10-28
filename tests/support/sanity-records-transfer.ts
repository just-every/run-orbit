import assert from 'node:assert/strict';
import {createApp} from './app';
import {testAuth} from './test-auth';

/** The same complete archive HTTP protocol used by Records. Authority is renewed locally after a restore. */
export async function recordsTransfer(db:D1Database,actor:string){
 let token=(await testAuth(db).createSession(actor)).token;
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}});
 const request=(path:string,method='GET',body?:unknown)=>app.request(`https://orbit.test/api/v1/${path}`,{method,headers:{Cookie:`__Host-orbit_session=${token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const call=async(path:string,method='GET',body?:unknown)=>{const response=await request(path,method,body);assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
 async function exportArchive(){let job=await call('records/archive/exports','POST',{});for(let n=0;n<700&&job.state!=='ready';n++)job=await call(`records/archive/exports/${job.id}/advance`,'POST',{});assert.equal(job.state,'ready');const archive=await call(`records/archive/exports/${job.id}/download`);await call(`records/archive/exports/${job.id}/abort`,'POST',{});return archive;}
 async function restore(archive:any){let job=await call('records/archive/imports','POST',{confirmed:true,manifest:archive.manifest});for(const part of archive.parts)await call(`records/archive/imports/${job.id}/parts/${part.index}`,'PUT',part);for(let n=0;n<1000&&job.state!=='complete';n++)job=await call(`records/archive/imports/${job.id}/finalize`,'POST',{});assert.equal(job.state,'complete');token=(await testAuth(db).createSession(actor)).token;}
 return {app,request,call,exportArchive,restore};
}
