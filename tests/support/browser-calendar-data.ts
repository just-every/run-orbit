import {todayApp} from './today-workspace';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {captureProviderNetwork} from './capture-provider-network';
import {writeScopes,type Provider} from '../../src/core/features/capture/providers/config';
import {createId} from '../../src/core/shared/ids';
/** Native fixture setup and the built Worker share only the external provider edge. */
export async function browserCalendarData(db:D1Database,operatorId:string){
 const providers=[];
 for(const provider of ['google','microsoft'] as const){
  const network=captureProviderNetwork(provider);network.state.scope+=' '+writeScopes[provider];network.state.total=0;
  const t=await todayApp(db,{operatorId,calling:{sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'ab'.repeat(32)})!,captureOrigin:'https://orbit.test',captureFetch:network.fetcher}});
  const email=`synthetic-orbit-calendar${provider==='google'?'':'-2'}@example.test`;
  const deal=await t.opportunity(`Synthetic Orbit ${provider} calendar review`,'Synthetic Calendar Co','Synthetic Calendar Contact',email);
  const contact=(await t.json<any>(`/api/v1/opportunities/${deal}`)).opportunity.contacts[0].id;
  const start=await t.json<any>(`/api/v1/capture/oauth/${provider}/start`,{body:{name:`Synthetic ${provider} calendar`,clientId:'synthetic-orbit-client',clientSecret:'synthetic-orbit-secret',writebackConsent:true}},200),authorization=new URL(start.authorizationUrl);network.state.challenge=authorization.searchParams.get('code_challenge')!;
  const callback=await t.call(`/api/v1/capture/oauth/${provider}/callback?`+new URLSearchParams({state:authorization.searchParams.get('state')!,code:'synthetic-orbit-code'}));
  if(callback.status!==303)throw new Error('Browser calendar connection failed.');const source=new URL(callback.headers.get('location')!,'https://orbit.test').searchParams.get('connected');if(!source)throw new Error('Browser calendar connection refused.');
  await t.json(`/api/v1/capture/sources/${source}/scope`,{body:{calendars:['calendar'],calendarWindow:{start:'2026-01-01T00:00:00.000Z',end:'2027-01-01T00:00:00.000Z'}}},200);
  const input={sourceId:source,calendarId:'calendar',recordType:'contact',recordId:contact,contactId:contact,operation:'create',meeting:{title:'Synthetic provider conflict',message:'Review this exact invitation.',start:'2026-11-01T15:00:00.000Z',end:'2026-11-01T15:30:00.000Z',attendees:[email]}};
  async function create(input:any){const preview=await t.json<any>('/api/v1/capture/writeback/preview',{body:input},200);return t.json<any>('/api/v1/capture/writeback/confirm',{body:{input,reviewHash:preview.reviewHash,operationKey:createId(),confirmed:true}},201);}
  const created=await create(input),eventId=(await db.prepare('SELECT provider_event_id FROM calendar_writebacks WHERE id=?').bind(created.id).first<string>('provider_event_id'))!,event=network.state.writeEvents.get(eventId)!;if(provider==='google')event.etag='"provider-edit"';else event['@odata.etag']='"provider-edit"';
  await t.json(`/api/v1/capture/sources/${source}/sync`,{body:{}},200);
  const recurring={...input,meeting:{...input.meeting,title:'Synthetic recurring meeting',start:'2026-10-25T14:00:00.000Z',end:'2026-10-25T14:30:00.000Z',recurrence:{frequency:'weekly',count:3,timeZone:'America/New_York'}}};
  const series=await create(recurring),masterId=(await db.prepare('SELECT provider_event_id FROM calendar_writebacks WHERE id=?').bind(series.id).first<string>('provider_event_id'))!,master=network.state.writeEvents.get(masterId)!;
  const instances=['2026-10-25T14:00:00.000Z','2026-11-01T15:00:00.000Z','2026-11-08T15:00:00.000Z'].map((start,n)=>({...master,id:`synthetic-orbit-${provider}-${n}`,start:{dateTime:start,timeZone:'UTC'},end:{dateTime:new Date(Date.parse(start)+1800000).toISOString(),timeZone:'UTC'},...(provider==='google'?{originalStartTime:{dateTime:start},recurringEventId:masterId,etag:`"occurrence-${n}"`}:{originalStart:start,seriesMasterId:masterId,'@odata.etag':`"occurrence-${n}"`})}));network.state.writeInstances.set(masterId,instances);for(const instance of instances)network.state.writeEvents.set(instance.id,instance);
  network.state.calendarEvent={...event,id:`synthetic-orbit-${provider}-captured`,...(provider==='google'?{iCalUID:`synthetic-orbit-${provider}-capture`,summary:'Synthetic captured meeting',created:'2026-10-01T10:00:00Z',updated:'2026-10-02T10:00:00Z'}:{iCalUId:`synthetic-orbit-${provider}-capture`,subject:'Synthetic captured meeting',createdDateTime:'2026-10-01T10:00:00Z',lastModifiedDateTime:'2026-10-02T10:00:00Z'})};network.state.writeEvents.set(network.state.calendarEvent.id,network.state.calendarEvent);
  await t.json(`/api/v1/capture/sources/${source}/sync`,{body:{}},200);
  const proposals=await t.json<any>('/api/v1/capture/proposals');const proposal=proposals.proposals.find((p:any)=>p.kind==='link_signal'&&p.details.evidence.subject==='Synthetic captured meeting'&&p.record_id===contact);if(!proposal)throw new Error('Captured calendar proposal missing.');await t.json(`/api/v1/capture/proposals/${proposal.id}/accept`,{body:{}},200);
  const rows=await t.json<any>(`/api/v1/capture/writeback/records/contact/${contact}`),captured=rows.meetings.find((m:any)=>m.captured);if(!captured)throw new Error('Captured meeting missing.');
  providers.push({provider,contact,deal,source,conflict:created.id,series:series.id,captured:captured.id,input,network,instances});
 }
 await db.prepare("INSERT INTO oa_identity_providers(preset,status,issuer,client_id,jwks_uri,authorization_endpoint,token_endpoint,algorithms,token_auth_method,response_iss,provider_id,linked_at) VALUES('legacy-rs256','linked','https://issuer.example.invalid','synthetic-orbit-client','https://issuer.example.invalid/jwks','https://issuer.example.invalid/authorize','https://issuer.example.invalid/token','[\"RS256\"]','client_secret_post',0,'auth',?)").bind(Date.now()).run();
 return {...providers[0],providers,async outbound(request:Request){const host=new URL(request.url).hostname,provider:Provider=host.includes('google')?'google':host==='graph.microsoft.com'||host==='login.microsoftonline.com'?'microsoft':(()=>{throw new Error('Unexpected calendar provider edge.');})();const network=providers.find(p=>p.provider===provider)!.network;return network.fetcher(request.url,{method:request.method,headers:request.headers,redirect:'error',...(request.method==='GET'||request.method==='HEAD'?{}:{body:await request.text()})});}};
}
