import assert from 'node:assert/strict';

/** Independent person admission through Orbit's ordinary invite and email proof. */
export default async function initializeReviewer({request,origin,email,owner,returnTo,mail}) {
 const post=(path,body,cookie)=>request(new URL(path,origin).href,{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 const invited=await post('/api/v1/settings/operators',{email,displayName:'Jamie Rivera'},owner.cookie);
 assert.equal(invited.status,201,'the owner invites the native reviewer');
 await invited.body?.cancel();
 const requested=await post('/auth/magic-link',{email,returnTo});
 assert.equal(requested.status,202);
 await requested.body?.cancel();
 const link=mail.read().flatMap(message=>message.text.match(/https:\/\/[^\s]+/g)??[]).map(value=>new URL(value)).find(url=>url.pathname==='/auth/confirm');
 assert.ok(link,'the native mail edge admitted the reviewer sign-in message');
 assert.equal(link.origin,origin);
 const preview=await request(link.href,{redirect:'manual'});
 assert.equal(preview.status,200,'opening the confirmation page is inert');
 await preview.body?.cancel();
 const confirmed=await post('/auth/confirm',{token:link.searchParams.get('token')});
 assert.equal(confirmed.status,303);
 const cookie=confirmed.headers.getSetCookie().map(value=>value.split(';',1)[0]).join('; ');
 assert.ok(cookie);assert.notEqual(cookie,owner.cookie);
 const page=await request(new URL('/agents',origin).href,{headers:{Cookie:cookie}});
 assert.equal(page.status,200,'the independently signed-in native reviewer can read Agents');
 await page.body?.cancel();
 return confirmed;
}
