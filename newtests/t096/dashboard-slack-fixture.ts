import {personalSlackFixture} from './personal-slack-fixture';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import type {fixture} from './fixture';
import {createApp} from '../../tests/support/app';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {slackNetwork} from '../../tests/support/slack-network';
/** Populate genuine attempts through authenticated public doors before handing this D1 to the emitted Worker. */
export async function dashboardSlackFixture(f:Awaited<ReturnType<typeof fixture>>,origin:string){
 const edge=slackNetwork(),key=randomBytes(32).toString('hex');let now=new Date(),version=0;
 const app=createApp({database:f.db,assets:{fetch:async()=>new Response('')},clock:{now:()=>now},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:key}),captureOrigin:origin});
 const call=async(path:string,method='GET',body?:unknown)=>{const r=await app.request(origin+path,{method,headers:{Cookie:f.cookie,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.ok(r.ok,`${path} ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
 const base='/api/v2/workspaces/workspace/dashboards/synthetic-orbit-notice',slack='/api/v1/settings/slack';
 try{
  await call(slack+'/connect','POST',{token:edge.token,signingSecret:edge.secret});await call(slack+'/channels','PUT',{id:'CINTERNAL',events:['dashboard'],enabled:true});
  await call(base,'PUT',{version:0,definition:{name:'Quarterly pipeline review',filters:{ownerIds:[],pipelineIds:[],from:'2026-10',through:'2026-12',field:null},tiles:[]}});
  for(const [index,mode] of (['sent','denied','timeout','rate','auth-unavailable'] as const).entries()){
   now=new Date(Date.now()-(6-index)*7*86400000);const input={version,frequency:'weekly',hour:8,minute:0,weekday:1,day:1,recipientIds:[f.operator.operatorId],channelId:'CINTERNAL',pdf:false,csv:false};
   const saved=await call(base+'/schedule','PUT',input);version=saved.definition.version;await call(base+'/schedule/slack','POST',{version,enabled:true});now=new Date(saved.nextAt);edge.setOutcome(mode);await call(slack+'/process','POST',{});if(index===0)await personalSlackFixture(f,app,origin,edge);
  }
  // New authority starts from now; historic queued occurrences remain held when explicitly re-enabled.
  now=new Date();edge.setOutcome('auth-unavailable');
  // The final active version retains a genuinely queued occurrence, plus sent, failed and uncertain history.
  assert.ok((await call(base+'/schedule')).history.some((row:any)=>row.state==='queued'));
  return {key,base,id:'synthetic-orbit-notice',edge};
 }catch(error){edge.restore();throw error;}finally{edge.restore();}
}
