import assert from 'node:assert/strict';
import type {TestContext} from 'node:test';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {createId} from '../../src/core/shared/ids';
export function salesMailWorkspace(db:D1Database,context:TestContext){
let primaryActor:string|undefined,primaryStage:string|undefined;
async function fixture(newActor=false){
 const deps=createDependencies(db),actor=newActor||!primaryActor?createId():primaryActor,at=new Date().toISOString();
 if(!primaryStage){await deps.workspace.ensureWorkspace({name:'Sales outreach',timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:['gmail.com']});primaryStage=createId();await deps.workspace.ensurePipelineStage({id:primaryStage,name:'Review',position:0});}
 if(newActor||!primaryActor)await deps.auth.ensureOperator({id:actor,email:`${actor}@test.example`,displayName:'Signals operator'});
 if(!primaryActor)primaryActor=actor;
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}}),session=await deps.auth.createSession(actor),email=`${createId()}@customer.example`;
 const response=await app.request('https://orbit.test/api/v1/workbench/opportunities',{method:'POST',headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({title:'Customer outreach',companyName:'Customer',contactName:'Contact',email,stageId:primaryStage,valueCents:100})});assert.equal(response.status,201);const opportunity=await response.json() as {id:string};
 const detail=await app.request(`https://orbit.test/api/v1/opportunities/${opportunity.id}`,{headers:{Cookie:`__Host-orbit_session=${session.token}`}});assert.equal(detail.status,200);const {opportunity:record}=await detail.json() as {opportunity:{contacts:{id:string}[]}};
 return{actor,opportunityId:opportunity.id,contactId:record.contacts[0]!.id,email,at};
}

async function sign(secret:string,body:string,timestamp:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${body}`))),b=>b.toString(16).padStart(2,'0')).join('');}


let currentCustomer:Awaited<ReturnType<typeof fixture>>|undefined;
async function customer(){return currentCustomer??=await fixture();}
async function request(f:Awaited<ReturnType<typeof fixture>>,path:string,method='GET',body?:unknown){const session=await createDependencies(db).auth.createSession(f.actor);return createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}}).request('https://orbit.test/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${session.token}`,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function json(f:Awaited<ReturnType<typeof fixture>>,path:string,method='GET',body?:unknown){const r=await request(f,path,method,body);assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;}
return {db,context,fixture,customer,sign,request,json};
}
export type SalesMailJourney=ReturnType<typeof salesMailWorkspace>;
