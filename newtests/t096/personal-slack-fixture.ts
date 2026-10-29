import assert from 'node:assert/strict';
import {createDependencies} from '../../tests/support/dependencies';
import {createId} from '../../src/core/shared/ids';
import type {fixture} from './fixture';
import type {createApp} from '../../tests/support/app';
import type {slackNetwork} from '../../tests/support/slack-network';
export async function personalSlackFixture(f:Awaited<ReturnType<typeof fixture>>,app:ReturnType<typeof createApp>,origin:string,edge:ReturnType<typeof slackNetwork>){
 const deps=createDependencies(f.db),author=createId();await deps.auth.ensureOperator({id:author,email:`${author}@orbit.test`,displayName:'Mention Author'});const session=await deps.auth.createSession(author);
 const call=async(path:string,method='GET',body?:unknown,cookie=f.cookie)=>{const r=await app.request(origin+'/api/v1/'+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.ok(r.ok,`${path} ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
 edge.setOutcome('sent');
 await call('settings/slack/mappings','PUT',{slackUserId:'UPERSONAL',operatorId:f.operator.operatorId,revoked:false});
 await call('notifications/slack','PUT',{enabled:true,slackUserId:'UPERSONAL'});
 const record=await call('records/company','POST',{name:'Mention review account'});
 for(const outcome of ['sent','denied','timeout'] as const){edge.setOutcome(outcome);await call(`records/company/${record.id}/entries`,'POST',{kind:'note',text:'@Owner synthetic-orbit-private',occurredAt:new Date().toISOString()},`__Host-orbit_session=${session.token}`);}
 edge.setOutcome('sent');
 for(const state of ['sent','denied'] as const){
  const entry=await call(`records/company/${record.id}/entries`,'POST',{kind:'note',text:'@Owner synthetic-orbit-retract',occurredAt:new Date().toISOString()},`__Host-orbit_session=${session.token}`);
  edge.setDeletionOutcome(state);await call(`records/company/${record.id}/entries/${entry.id}`,'DELETE',{},`__Host-orbit_session=${session.token}`);
 }
 edge.setDeletionOutcome('sent');
}
