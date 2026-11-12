import assert from 'node:assert/strict';
import {createApp} from './app';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {captureProviderNetwork} from './capture-provider-network';
import {sendScopes} from '../../src/core/features/capture/providers/config';
/** Seed a send-as review through OAuth and Records; no provider send occurs. */
export async function mailboxBrowserSeed(db:D1Database,cookie:string,contactId:string){
 const edge=captureProviderNetwork('google'),origin='https://orbit.test',app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)})!,captureOrigin:origin,captureFetch:edge.fetcher});
 const call=async(path:string,body?:unknown)=>{const response=await app.request(origin+'/api/v1/'+path,{method:body===undefined?'GET':'POST',headers:{cookie,origin,'content-type':'application/json'},...body===undefined?{}:{body:JSON.stringify(body)}});assert.ok(response.ok,await response.clone().text());return response.json() as Promise<any>;};
 async function connect(sourceId?:string){
  const value=await call('capture/oauth/google/start',{name:'Sales Gmail',clientId:'synthetic-orbit-client',clientSecret:'synthetic-orbit-1',sourceId,sendConsent:Boolean(sourceId)});
  const authorization=new URL(value.authorizationUrl);edge.state.challenge=authorization.searchParams.get('code_challenge')!;
  const response=await app.request(origin+'/api/v1/capture/oauth/google/callback?'+new URLSearchParams({state:authorization.searchParams.get('state')!,code:'synthetic-orbit-code'}),{headers:{cookie}});
  assert.equal(response.status,303);const url=new URL(response.headers.get('location')!,origin);assert.ok(!url.searchParams.has('error'),url.searchParams.get('error')??'');return url.searchParams.get('connected')!;
 }
 const source=await connect();await call('capture/sources/'+source+'/scope',{mail:{folders:['INBOX','SENT']}});edge.state.scope+=' '+sendScopes.google;await connect(source);
 const draft=await call('workbench/records/contact/'+contactId+'/drafts',{contactId,opportunityId:null,subject:'Reviewed Gmail consultation',body:'Exact Gmail review.'});
 const signature=await call('library',{kind:'signature',name:'Sales Gmail signature',body:'Synthetic signature.',visibility:'private'});
 const rendered=await call('library/drafts/'+draft.id+'/apply',{revision:1,signatureId:signature.id});await call('library/drafts/'+draft.id+'/render',{revision:rendered.revision,reviewHash:rendered.reviewHash});
 return {mailboxSource:source,mailboxDraft:draft.id as string,mailboxAddress:edge.state.mailboxAddress};
}
