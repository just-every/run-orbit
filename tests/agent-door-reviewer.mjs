import assert from 'node:assert/strict';

/** The verifier captures only the paid mail edge; Orbit owns invitation and sign-in. */
export default async function initialize({request,origin,email,owner,returnTo,mail}) {
 const post=(path,body,cookie)=>request(origin+path,{method:'POST',redirect:'manual',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.20','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 const invitation=await post('/api/v1/settings/operators',{email,displayName:'Morgan Sales Reviewer'},owner.cookie);
 assert.equal(invitation.status,201);
 const invited=await invitation.json();assert.equal(typeof invited.id,'string');
 const since=Date.now();
 const requested=await post('/auth/magic-link',{email,returnTo});assert.ok(requested.ok);await requested.body?.cancel();
 const messages=mail.read({after:since,limit:1});assert.equal(messages.length,1);
 const match=messages[0].text.match(/https:\/\/[^\s]+\/auth\/confirm\?token=[^\s]+/);assert.ok(match);
 const link=new URL(match[0]);assert.equal(link.origin,origin);
 const confirmed=await post('/auth/confirm',{token:link.searchParams.get('token')});assert.equal(confirmed.status,303);
 const replay=await post('/auth/confirm',{token:link.searchParams.get('token')});assert.equal(replay.status,400);await replay.body?.cancel();
 return confirmed;
}
