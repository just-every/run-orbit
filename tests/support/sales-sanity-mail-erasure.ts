import assert from 'node:assert/strict';
import type {Hono} from 'hono';
import type {fixture} from '../../newtests/t096/fixture';
export async function eraseRecordMail(f:Awaited<ReturnType<typeof fixture>>,app:Hono<any>,cookie:string,contactId:string,email:string){
 const response=await app.request(`https://orbit.test/api/v1/records/contact/${contactId}`,{method:'DELETE',headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({confirmed:true})});assert.equal(response.status,200,await response.clone().text());
 for(const [table,column]of [['record_mail_drafts','recipient_contact_id'],['record_mail_obligations','contact_id']] as const)assert.equal(await f.db.prepare(`SELECT count(*) n FROM ${table} WHERE ${column}=?`).bind(contactId).first('n'),0);
 assert.equal(await f.db.prepare('SELECT count(*) n FROM unlinked_replies WHERE lower(sender)=lower(?)').bind(email).first('n'),0);
 const detail=await app.request(`https://orbit.test/api/v1/records/contact/${contactId}`,{headers:{Cookie:cookie}});assert.equal(detail.status,404);
 const notifications=await app.request('https://orbit.test/api/v1/notifications',{headers:{Cookie:cookie}});assert.equal(notifications.status,200);assert.ok(!JSON.stringify(await notifications.json()).includes(email));
}
