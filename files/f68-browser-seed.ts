import {writeFile} from 'node:fs/promises';
import {getPlatformProxy} from 'wrangler';
import {todayApp} from '../tests/support/today-workspace';
import {snapshot} from '../src/core/features/delegation/evidence';
import {createId} from '../src/core/shared/ids';
import {createApp} from '../tests/support/app';
const state=process.env.ORBIT_TEST_STATE!;
const platform=await getPlatformProxy<{DB:D1Database}>({configPath:'wrangler.jsonc',envFiles:['tests/support/no-local-settings.env'],persist:{path:state+'/v3'},remoteBindings:false});
try{
 const db=platform.env.DB,t=await todayApp(db),receiver=await t.json<any>('/api/v1/settings/operators',{body:{displayName:'Receiving operator',email:['synthetic-orbit-receiver','example.test'].join('@')}},201);
 const invite=await t.json<any>('/api/v1/settings/operators',{body:{displayName:'Departing operator',email:['synthetic-orbit-departing','example.test'].join('@')}},201);
 const leaving=await todayApp(db,{operatorId:invite.id});
 await db.prepare('UPDATE operators SET display_name=? WHERE id=?').bind('Departing operator',leaving.actor).run();
 const deal=await leaving.opportunity('Removal review deal','Removal review account','Removal buyer',['synthetic-orbit-review','example.test'].join('@'));
 const detail=await t.json<any>(`/api/v1/records/opportunity/${deal}`);
 await t.json(`/api/v1/records/opportunity/${deal}`,{method:'PUT',body:{...detail.record,owner_id:leaving.actor,contact_ids:detail.contacts.map((r:any)=>r.id),primary_contact_id:detail.contacts[0].id,custom_fields:{}}},200);
 const task=await leaving.json<any>('/api/v1/tasks',{body:{title:'Review the customer follow-up',recordType:'opportunity',recordId:deal,ownerId:leaving.actor,dueAt:new Date(Date.now()+86400000).toISOString(),priority:'normal',type:'follow_up',notes:'',recurrence:'none',timezone:'UTC',reminderMinutes:null}},201);
 const handoff=createId(),target=`opportunities/${deal}/handoffs/${handoff}`,s=await snapshot(db,target,true);
 await leaving.json('/delegation/handoffs',{body:{operationKey:createId(),operation:'orbit.handoff.upsert',target,expectedRevision:s.revision,expectedAudienceRevision:s.audience.audienceRevision,content:{title:'Send the reviewed proposal',description:'Customer requested the proposal.',assigneeId:leaving.actor,dueAt:null,status:'open'}}},200);
 const mail=createApp({database:db,assets:{fetch:async()=>new Response('test')},outboundMail:{provider:'rer',optOutOrigin:'https://orbit.test',messageIdDomain:'orbit.test',send:async()=>{throw Error('Browser proof must never submit mail');}}});
 const call=async(path:string,body?:unknown,status=200)=>{const r=await mail.request('https://orbit.test'+path,{method:body?'POST':'GET',headers:{cookie:`__Host-orbit_session=${leaving.session.token}`,origin:'https://orbit.test','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(r.status!==status)throw Error(await r.text());return r.json() as Promise<any>;};
 const draft=await call(`/api/v1/workbench/opportunities/${deal}/drafts`,{contactId:detail.contacts[0].id,subject:'Reviewed customer follow-up',body:'Retain this exact reviewed content.'},201),render=await call(`/api/v1/library/drafts/${draft.id}/render`);
 await call(`/api/v1/library/drafts/${draft.id}/render`,{revision:1,reviewHash:render.reviewHash});
 const scheduledAt=new Date(Date.now()+3*86400000).toISOString(),preview=await call(`/api/v1/workbench/drafts/${draft.id}/approval-preview?scheduledAt=${encodeURIComponent(scheduledAt)}`);
 await call(`/api/v1/workbench/drafts/${draft.id}/approve`,{revision:1,scheduledAt,scheduledAtConfirmation:preview.scheduledAt});
 await writeFile('/tmp/f68-browser-session.json',JSON.stringify({cookie:`__Host-orbit_session=${t.session.token}`,receiver:receiver.id,leaving:leaving.actor,deal,task:task.id,handoff}),{mode:0o600});
}finally{await platform.dispose();}
