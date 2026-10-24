import {todayApp} from './today-workspace';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {captureProviderNetwork} from './capture-provider-network';
import {writeScopes} from '../../src/core/features/capture/providers/config';
import {createId} from '../../src/core/shared/ids';
/** Prepare browser state through native HTTP and the provider network edge, with no live provider access. */
export async function browserCalendarData(db:D1Database,operatorId:string){
 const network=captureProviderNetwork('google');network.state.scope+=' '+writeScopes.google;network.state.total=0;
 const t=await todayApp(db,{operatorId,calling:{sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)})!,captureOrigin:'https://orbit.test',captureFetch:network.fetcher}});
 const deal=await t.opportunity('Synthetic Orbit calendar review','Synthetic Calendar Co','Synthetic Calendar Contact','synthetic-orbit-calendar@example.test');
 const contact=(await t.json<any>(`/api/v1/opportunities/${deal}`)).opportunity.contacts[0].id;
 const start=await t.json<any>('/api/v1/capture/oauth/google/start',{body:{name:'Synthetic calendar',clientId:'synthetic-orbit-client',clientSecret:'synthetic-orbit-secret',writebackConsent:true}},200),authorization=new URL(start.authorizationUrl);network.state.challenge=authorization.searchParams.get('code_challenge')!;
 const callback=await t.call('/api/v1/capture/oauth/google/callback?'+new URLSearchParams({state:authorization.searchParams.get('state')!,code:'synthetic-orbit-code'}));
 if(callback.status!==303)throw new Error('Browser calendar connection failed.');const source=new URL(callback.headers.get('location')!,'https://orbit.test').searchParams.get('connected');if(!source)throw new Error('Browser calendar connection refused.');
 await t.json(`/api/v1/capture/sources/${source}/scope`,{body:{calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}}},200);
 const input={sourceId:source,calendarId:'calendar',recordType:'contact',recordId:contact,contactId:contact,operation:'create',meeting:{title:'Synthetic provider conflict',message:'Review this exact invitation.',start:'2026-11-01T15:00:00.000Z',end:'2026-11-01T15:30:00.000Z',attendees:['synthetic-orbit-calendar@example.test']}};
 const preview=await t.json<any>('/api/v1/capture/writeback/preview',{body:input},200),created=await t.json<any>('/api/v1/capture/writeback/confirm',{body:{input,reviewHash:preview.reviewHash,operationKey:createId(),confirmed:true}},201);
 const event=await db.prepare('SELECT provider_event_id FROM calendar_writebacks WHERE id=?').bind(created.id).first<string>('provider_event_id');network.state.writeEvents.get(event!)!.etag='"provider-edit"';
 await t.json(`/api/v1/capture/sources/${source}/sync`,{body:{}},200);
 await db.prepare("INSERT INTO oa_identity_providers(preset,status,issuer,client_id,jwks_uri,authorization_endpoint,token_endpoint,algorithms,token_auth_method,response_iss,provider_id,linked_at) VALUES('legacy-rs256','linked','https://issuer.example.invalid','synthetic-orbit-client','https://issuer.example.invalid/jwks','https://issuer.example.invalid/authorize','https://issuer.example.invalid/token','[\"RS256\"]','client_secret_post',0,'auth',?)").bind(Date.now()).run();
 return {contact,deal,source};
}
