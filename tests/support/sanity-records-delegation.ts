import assert from 'node:assert/strict';
import {nativeDelegation} from './app';
import {testAuth} from './test-auth';
import {delegationRoutes} from '../../src/core/features/delegation/routes';
import {random} from '../../src/core/features/delegation/protocol';
import {challenge} from '../../src/core/features/delegation/token';
import type {RecordsFixture} from './sanity-records-http';

export async function archiveDelegation(f:RecordsFixture,opportunity:string,contact:string,assignee:string,{writeHandoff=true}={}){
 const auth=testAuth(f.db),session=await auth.createSession(f.actor),native=nativeDelegation(f.db),api=delegationRoutes(f.db),client='archive-agent';
 const form=(path:string,body:Record<string,string>)=>native.request('https://orbit.test'+path,{method:'POST',headers:{Cookie:'__Host-orbit_session='+session.token,Origin:'https://orbit.test'},body:new URLSearchParams(body)});
 assert.equal((await form('/clients',{id:client,redirect_uri:'https://archive-agent.test/callback'})).status,303);
 const verifier=random(),input={client_id:client,redirect_uri:'https://archive-agent.test/callback',response_type:'code',state:random(),code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope:'crm.evidence.read crm.handoff.write',targets:JSON.stringify([`opportunities/${opportunity}`])};
 const consent=await form('/authorize',input);assert.equal(consent.status,303);
 const exchange=await api.request('https://orbit.test/token',{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',client_id:client,redirect_uri:input.redirect_uri,code:new URL(consent.headers.get('Location')!).searchParams.get('code')!,code_verifier:verifier})});assert.equal(exchange.status,200);
 const token=(await exchange.json()).access_token as string;
 const request=(path:string,body?:unknown)=>api.request('https://orbit.test'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(writeHandoff){
  const target=`opportunities/${opportunity}/handoffs/archive-task`,check=await(await request('/check?target='+target)).json(),audience=await(await request('/audience?operation=orbit.handoff.upsert&target='+target)).json();
  const written=await request('/effects',{operationKey:'archived',operation:'orbit.handoff.upsert',target,expectedRevision:check.revision,expectedAudienceRevision:audience.audienceRevision,content:{title:'Customer onboarding',description:'Retained internal task',assigneeId:assignee,dueAt:null,status:'open'}});assert.equal(written.status,200,await written.clone().text());
  await f.db.prepare('DELETE FROM opportunity_contacts WHERE opportunity_id=? AND contact_id=?').bind(opportunity,contact).run();
 }
 const rows=Object.fromEntries(await Promise.all(['handoff_tasks','handoff_contacts'].map(async table=>[table,(await f.db.prepare(`SELECT * FROM ${table}`).all()).results])));
 return {token,request,rows};
}
