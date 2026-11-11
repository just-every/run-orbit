import assert from 'node:assert/strict';

/** A saved automation still notifies its own operator after a native action. */
export async function notificationAutomation(call,{kind,id,title,ownerId}){
 const message=`Automated review of ${title}`,definition={trigger:{kind:'activity_logged',recordType:kind,activityKind:'note'},conditions:[{field:kind==='opportunity'?'title':'name',operator:'equals',value:title}],actions:[{kind:'notify',title:message,operatorIds:[ownerId]}]};
 const {workflow}=await call('/api/workflows',{name:'Notification automation proof',definition});
 const preview=await call(`/api/workflows/${workflow.id}/preview`,{});
 await call(`/api/workflows/${workflow.id}/activate`,{previewId:preview.previewId});
 const initial=await call('/api/v1/notifications');
 await call(`/api/v1/records/${kind}/${id}/entries`,{kind:'note',text:'A person requests an automated review.',occurredAt:new Date().toISOString()});
 await call('/api/workflows/process',{});
 const notices=()=>call('/api/v1/notifications'),before=await notices(),matches=before.notifications.filter(row=>row.kind==='workflow.notice'&&row.message===message);
 assert.equal(matches.length,1,'An automation acting for the person still notifies that person once');
 assert.equal(matches[0].readAt,null);
 assert.equal(before.unread,initial.unread+1,'The automation adds exactly one unread item after the direct action');
 assert.equal(before.unread,before.notifications.filter(row=>!row.readAt).length,'The badge count matches the unread feed');
 await call('/api/workflows/process',{});
 assert.deepEqual(await notices(),before,'Processing the same automation again creates no duplicate notice');
 await call(`/api/workflows/${workflow.id}/pause`,{});
}
