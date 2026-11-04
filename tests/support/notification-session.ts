import assert from 'node:assert/strict';
import {createApp} from './app';
import {emailLinkSignIn,mailedIdentity} from './email-link';
import {identityResponse} from '../../src/core/features/identity/auth';

/** Read state belongs to the recipient, independently of the session that marked it. */
export async function notificationSession(db:D1Database,operatorId:string,oldCookie:string,notificationId:string,otherCookie:string){
 const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}});
 const read=(cookie:string)=>app.request('https://orbit.test/api/v1/notifications',{headers:{Cookie:cookie}});
 const beforeResponse=await read(oldCookie);assert.equal(beforeResponse.status,200);
 const before=await beforeResponse.json() as any,marked=before.notifications.find((item:any)=>item.id===notificationId);
 assert.ok(marked.readAt);
 const mail=mailedIdentity(db),email=await db.prepare('SELECT email FROM operators WHERE id=?').bind(operatorId).first<string>('email');
 assert.ok(email);
 const out=await identityResponse(mail.post('/auth/signout',{cookie:oldCookie,form:{}}),mail.bindings,{ownerClaimed:async()=>true,mailSender:mail.mailSender});
 assert.equal(out!.status,303);assert.equal((await read(oldCookie)).status,401,'The signed-out session cannot read the inbox');
 const fresh=await emailLinkSignIn(db,email);
 assert.equal(fresh.operator.operatorId,operatorId);assert.notEqual(fresh.cookie,oldCookie);
 const afterResponse=await read(fresh.cookie);assert.equal(afterResponse.status,200);
 const after=await afterResponse.json() as any;
 assert.deepEqual(after.notifications.find((item:any)=>item.id===notificationId),marked,'The same notification and read timestamp survive a new requested email-link sign-in');
 assert.equal(after.unread,before.unread);
 const otherResponse=await read(otherCookie);assert.equal(otherResponse.status,200);
 assert.ok(!(await otherResponse.json() as any).notifications.some((item:any)=>item.id===notificationId),'A second recipient never sees the read notification');
 assert.equal((await app.request(`https://orbit.test/api/v1/notifications/${notificationId}/read`,{method:'POST',headers:{Cookie:otherCookie,Origin:'https://orbit.test'}})).status,404);
 assert.equal((await read(oldCookie)).status,401,'Signing in again never revives the signed-out cookie');
}
