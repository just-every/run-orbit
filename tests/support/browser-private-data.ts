import {todayApp} from './today-workspace';
import {emailLinkSignIn} from './email-link';
export async function browserPrivateData(db:D1Database,operatorId:string){
 const t=await todayApp(db,{operatorId}),email='synthetic-orbit-collaborator@example.test',base='/api/v2/access/workspaces/workspace';
 const invitation=await t.json<any>(base+'/invitations',{body:{email,role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()}},200),viewer=await emailLinkSignIn(db,email);
 const accepted=await t.app.request('https://orbit.test/api/v2/access/invitations/accept',{method:'POST',headers:{Cookie:viewer.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({token:invitation.token})});if(accepted.status!==200)throw new Error('Browser collaborator invitation failed.');
 const deal=await t.opportunity('Synthetic shared private entries','Synthetic Shared Co','Synthetic shared contact','synthetic-orbit-shared@example.test');
 await t.json(base+'/grants',{body:{subjectKind:'operator',subjectId:viewer.operator.operatorId,resourceType:'opportunity',resourceId:deal,actions:['graph.read','entries.read'],fields:[],purpose:'Review notes, calls and meetings',expiresAt:null}},200);
 const entries=[];for(const kind of ['note','call','meeting'])entries.push((await t.json<any>(`/api/v1/records/opportunity/${deal}/entries`,{body:{kind,text:`Synthetic ${kind} entry @${email}`,occurredAt:new Date(Date.now()-1000).toISOString(),...(kind==='note'?{}:{durationMinutes:10})}},200)).id);
 return {deal,entries,cookie:viewer.cookie};
}
