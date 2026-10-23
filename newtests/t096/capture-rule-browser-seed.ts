import assert from 'node:assert/strict';
import {fixture} from './fixture';
import {createApp} from '../../tests/support/app';
import {captureProviderNetwork} from '../../tests/support/capture-provider-network';
import {createSourceSecurity} from '../../src/core/platform/source-security';
export async function captureRuleBrowserSeed(f:Awaited<ReturnType<typeof fixture>>){
 const network=captureProviderNetwork('google'),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'72'.repeat(32)})!,app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,captureOrigin:'https://orbit.test',captureFetch:network.fetcher});
 const call=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await app.request('https://orbit.test/api/v1'+path,{method,headers:{Cookie:f.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(response.status,status,await response.clone().text());return response;};
 const company=await(await call('/records/company','POST',{name:'Harborline Distribution',primary_domain:'harborline.example'},201)).json() as any,contact=await(await call('/records/contact','POST',{name:'Avery Kim',email:'synthetic-orbit-avery@harborline.example',company_id:company.id},201)).json() as any;
 const deals=[] as {id:string;title:string}[];for(const title of ['Regional distribution rollout','Warehouse expansion'])deals.push(await(await call('/records/opportunity','POST',{title,stage_id:f.stage,value_cents:250000,company_id:company.id,contact_ids:[contact.id],primary_contact_id:contact.id},201)).json() as any);
 await call(`/records/opportunity/${deals[0]!.id}/entries`,'POST',{kind:'note',text:'Avery confirmed the regional rollout scope.',occurredAt:new Date().toISOString(),contactIds:[contact.id]});await call('/capture/mail-rule','PUT',{rule:'recent'});
 network.state.total=1;network.state.mailHeaders['0']={From:'Avery Kim <synthetic-orbit-avery@harborline.example>',To:'owner@fold.test',Subject:'Harborline distribution planning'};
 const start=await(await call('/capture/oauth/google/start','POST',{name:'Sales account',clientId:'synthetic-orbit-57',clientSecret:'synthetic-orbit-58'})).json() as any,url=new URL(start.authorizationUrl);network.state.challenge=url.searchParams.get('code_challenge')!;
 const callback=await call(`/capture/oauth/google/callback?state=${encodeURIComponent(url.searchParams.get('state')!)}&code=synthetic-orbit-59`,'GET',undefined,303),source=new URL(callback.headers.get('location')!,'https://orbit.test').searchParams.get('connected');assert.ok(source);await call(`/capture/sources/${source}/scope`,'POST',{mail:{folders:['INBOX']},calendars:[]});
 for(let round=0;round<100;round++){const pulled=await(await call(`/capture/sources/${source}/sync`,'POST',{})).json() as any;assert.ok(!pulled.summary.halted);if(!pulled.more)break;assert.ok(round<99);}
 const signal=await f.db.prepare("SELECT id FROM signals WHERE source_id=? AND subject='Harborline distribution planning'").bind(source).first<{id:string}>();assert.ok(signal);await call(`/capture/sources/${source}/disconnect`,'POST',{confirmed:true});return{contactId:contact.id,signalId:signal.id,firstDeal:deals[0]!,secondDeal:deals[1]!};
}
