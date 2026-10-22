import assert from 'node:assert/strict';
import type {SlackFixture} from './slack-notices-proof';
/** Real authenticated routes and the existing Slack network-edge stand-in; no real provider call or consent was used. */
export async function proveDashboardSlack(f:SlackFixture,edge:{posts:any[];call:(path:string,method?:string,body?:unknown)=>Promise<any>;outcome:(mode:'sent'|'failed'|'timeout')=>void;safety:(value:Record<string,unknown>)=>void}){
 const cookie=`__Host-orbit_session=${f.token}`,base='/api/v2/workspaces/workspace/dashboards/synthetic-orbit-slack',call=async(path:string,method='GET',body?:unknown)=>{const response=await f.app.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
 const settings=(await(await f.request('settings')).json() as any).workspace,updateTimezone=async(timezone:string)=>{const response=await f.request('settings','PUT',{name:settings.name,timezone,currency:settings.currency,workingHours:{days:[1,2,3,4,5],start:'09:00',end:'17:00'},staleIntervalDays:settings.stale_interval_days,awaitingResponseWorkingDays:settings.awaiting_response_working_days,freeMailDomains:JSON.parse(settings.free_mail_domains_json)});assert.equal(response.status,200,await response.clone().text());return response;};
 const confirm=()=>edge.call('channels','PUT',{id:'CINTERNAL',events:['stage','due','won','handoff'],enabled:true});
 const schedule={version:0,frequency:'weekly',hour:8,minute:0,weekday:1,day:1,recipientIds:[f.actor],channelId:'CINTERNAL',pdf:false,csv:false};
 try{
  f.setClock(new Date('2026-10-25T14:00:00Z'));await updateTimezone('America/New_York');
  await call(base,'PUT',{version:0,definition:{name:'Private dashboard with $999,999 and customer names',filters:{ownerIds:[],pipelineIds:[],from:'2026-10',through:'2026-12',field:null},tiles:[]}});
  const result=await call(base+'/schedule','PUT',schedule);assert.equal(result.nextAt,'2026-10-26T12:00:00.000Z');assert.equal(result.state,'paused');const before=edge.posts.length;
  f.setClock(new Date('2026-10-26T12:00:00Z'));await edge.call('process','POST',{});assert.equal(edge.posts.length,before,'ct requires every dashboard destination paused until the system sender exists');
  const anonymous=await f.app.request('https://orbit.test'+base);assert.equal(anonymous.status,401,'the linked dashboard’s data requires native sign-in');
  f.setClock(new Date('2026-11-01T14:00:00Z'));assert.equal((await call(base+'/schedule')).nextAt,'2026-11-02T13:00:00.000Z');f.setClock(new Date('2026-11-02T13:00:00Z'));await edge.call('process','POST',{});assert.equal(edge.posts.length,before);
  assert.equal((await edge.call('')).notices.filter((n:any)=>n.event_kind==='dashboard').length,0);
  assert.deepEqual((await call(base+'/schedule')).definition.recipientIds,[f.actor]);

 }finally{edge.outcome('sent');edge.safety({});f.setClock(undefined);await updateTimezone(settings.timezone);await confirm();}
}
