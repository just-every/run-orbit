import assert from 'node:assert/strict';
import type {SlackFixture} from './slack-notices-proof';
export async function eraseSlackSales(f:SlackFixture,{contact,secret,token,deletes,posts,call}:any){
 const request=async(path:string,method='GET',body?:unknown)=>{const r=await f.request(path,method,body);assert.ok(r.ok,`${path}: ${r.status} ${await r.clone().text()}`);return r.json() as Promise<any>;};
 const postCount=posts.length;await call('connect','POST',{token,signingSecret:secret});await call('process','POST',{});assert.equal(posts.length,postCount,'reconnect never replays notices or old actions');assert.ok((await call('')).channels.every((c:any)=>!c.enabled));assert.ok((await call('')).mappings.every((m:any)=>m.revoked_at));
 const beforeDelete=deletes.length;await request(`records/contact/${contact}`,'DELETE',{confirmed:true});const state=await call('');assert.ok(state.notices.filter((n:any)=>n.event_kind!=='dashboard').every((n:any)=>n.state==='redacted'&&n.content_json===null&&n.record_id===null));assert.ok(state.notices.filter((n:any)=>n.event_kind==='dashboard').every((n:any)=>!String(n.content_json).includes(contact)),'generic dashboard history stores no contact identity');assert.ok(deletes.length>beforeDelete,'erasure calls chat.delete through the shipped adapter');assert.ok(state.deletions.length>0&&state.deletions.every((d:any)=>d.state==='deleted'));
}
