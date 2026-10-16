import {Hono} from 'hono';
import {getCookie,setCookie,deleteCookie} from 'hono/cookie';
import type {AuthenticatedOperator} from '../identity';
import {escapeHtml as esc,nativePage as page} from './native-page';
import {deny,hash,random,scopes,targetSchema} from './protocol';
import {challenge,exchange} from './token';
import {audience,installation} from './evidence';
import {recordsFor} from './listing';
import {day,ownCallback,recordList,scopeList,scopeWords} from './settings-page';

const kinds={opportunities:{label:'Opportunities',name:'title'},contacts:{label:'Contacts',name:"COALESCE(NULLIF(name,''),email)"},companies:{label:'Companies',name:'name'}} as const;
const cookie='orbit_delegation_connect';
const all=(value:string|string[]|undefined)=>value===undefined?[]:Array.isArray(value)?value:[value];

/** Connecting an application that uses Orbit's own callback, from this browser: choose records by name,
 * consent, and Orbit exchanges the code itself and shows the access key once, with a test of what it reads. */
export function manualConnectionRoutes(db:D1Database){
 const app=new Hono<{Variables:{operator:AuthenticatedOperator}}>();
 const client=async(id:string,origin:string)=>{const row=await db.prepare('SELECT id FROM delegation_clients WHERE id=? AND redirect_uri=? AND enabled=1').bind(id,ownCallback(origin)).first<{id:string}>();if(!row)deny(400,'INVALID_REQUEST');return row!.id;};
 app.get('/connect',async c=>{
  const origin=new URL(c.req.url).origin,id=await client(c.req.query('client')??'',origin),kind=(c.req.query('kind')??'opportunities') as keyof typeof kinds,q=(c.req.query('q')??'').slice(0,200);
  if(!kinds[kind])deny(400,'INVALID_REQUEST');
  const picked=all(c.req.queries('picked')).filter(t=>targetSchema.safeParse(t).success).slice(0,100),chosen=all(c.req.queries('scope')),wanted=chosen.length?chosen:['crm.evidence.read'];
  const named=await recordsFor(db,picked),found=(await db.prepare(`SELECT id,${kinds[kind].name} AS name FROM ${kind} WHERE instr(lower(${kinds[kind].name}),lower(?))>0 ORDER BY ${kinds[kind].name} LIMIT 25`).bind(q).all<{id:string;name:string|null}>()).results.filter(r=>!picked.includes(`${kind}/${r.id}`));
  const box=(target:string,label:string,checked:boolean)=>`<label class="check"><input type="checkbox" name="picked" value="${esc(target)}"${checked?' checked':''}>${esc(label)}</label>`;
  return c.html(page(`Connect ${id}`,`<p class="lead">Choose the records ${esc(id)} may use. Search by name, tick each record, then choose Continue. Ticked records stay ticked when you search again.</p>
<form method="get" action="/delegation/connect"><input type="hidden" name="client" value="${esc(id)}">
<label for="kind">Record type</label><select id="kind" name="kind">${Object.entries(kinds).map(([value,k])=>`<option value="${value}"${value===kind?' selected':''}>${k.label}</option>`).join('')}</select>
<label for="q">Name contains</label><input id="q" name="q" type="search" value="${esc(q)}"><button class="secondary">Search</button>
<fieldset><legend>Chosen records</legend>${named.filter(r=>picked.includes(r.target)).map(r=>box(r.target,r.name,true)).join('')||'<p>None chosen yet.</p>'}</fieldset>
<fieldset><legend>${esc(kinds[kind].label)} matching “${esc(q)}”</legend>${found.map(r=>box(`${kind}/${r.id}`,r.name??r.id,false)).join('')||'<p>No matches.</p>'}</fieldset>
<fieldset><legend>What it may do</legend>${scopes.map(s=>`<label class="check"><input type="checkbox" name="scope" value="${s}"${wanted.includes(s)?' checked':''}>${esc(scopeWords[s])}</label>`).join('')}</fieldset>
<button formmethod="post" formaction="/delegation/connect">Continue to consent</button></form><a href="/delegation/settings">Cancel</a>`));
 });
 app.post('/connect',async c=>{
  const body=await c.req.parseBody({all:true}),origin=new URL(c.req.url).origin,id=await client(String(body.client??''),origin);
  const targets=all(body.picked as string|string[]),chosen=all(body.scope as string|string[]);
  if(!targets.length||targets.length>100||targets.some(t=>!targetSchema.safeParse(t).success)||!chosen.length||chosen.some(s=>!scopes.includes(s as typeof scopes[number])))return c.html(page('Choose records and what it may do',`<p role="alert">Tick at least one record and at least one thing ${esc(id)} may do, then choose Continue again.</p><a href="/delegation/connect?client=${encodeURIComponent(id)}">Back to choosing records</a>`),400);
  const state=random(),verifier=random();
  setCookie(c,cookie,`${id}.${state}.${verifier}`,{httpOnly:true,secure:origin.startsWith('https:'),sameSite:'Lax',path:'/delegation',maxAge:1800});
  const consent=new URLSearchParams({client_id:id,redirect_uri:ownCallback(origin),response_type:'code',state,code_challenge:await challenge(verifier),code_challenge_method:'S256',account_id:'workspace',scope:[...new Set(chosen)].join(' '),targets:JSON.stringify([...new Set(targets)])});
  return c.redirect(`/delegation/authorize?${consent}`,303);
 });
 app.get('/callback',async c=>{
  const origin=new URL(c.req.url).origin,[id,state,verifier]=(getCookie(c,cookie)??'').split('.');
  if(!id||!state||!verifier||c.req.query('state')!==state)return c.html(page('Connection not finished',`<p role="alert">This page opens after you allow an application from this browser. Start again from <a href="/delegation/settings">Connected applications</a>.</p>`),400);
  const minted=await exchange(db,{grant_type:'authorization_code',client_id:id,redirect_uri:ownCallback(origin),code:c.req.query('code')??'',code_verifier:verifier});deleteCookie(c,cookie,{path:'/delegation'});
  const grant=(await db.prepare('SELECT g.*,o.display_name FROM delegation_grants g JOIN operators o ON o.id=g.principal_id WHERE g.token_hash=?').bind(await hash(minted.access_token)).first<{id:string;targets_json:string;scopes_json:string;expires_at:string;display_name:string}>())!;
  const records=await recordsFor(db,JSON.parse(grant.targets_json)),i=await installation(db),readers=await audience(db);
  const section={origin,token:minted.access_token,installationId:i.id,audiencePrincipalIds:readers.principalIds,readCostMicros:0};
  return c.html(page(`${id} is connected`,`<p class="lead" role="status">Test passed: ${esc(id)} can read ${records.length} ${records.length===1?'record':'records'} as ${esc(grant.display_name)}, until ${esc(day(grant.expires_at))}.</p>${recordList(records)}<h2>It may</h2>${scopeList(JSON.parse(grant.scopes_json))}
<h2>Copy this into ${esc(id)} now</h2><p>Orbit shows the access key only once. Anyone holding it can do what you allowed, so paste it only into the application's private settings.</p>
<label for="orbit-origin">Orbit address</label><input id="orbit-origin" readonly value="${esc(origin)}">
<label for="access-key">Access key</label><input id="access-key" readonly value="${esc(minted.access_token)}">
<label for="installation-id">Installation ID</label><input id="installation-id" readonly value="${esc(i.id)}">
<h3>For Penny</h3><p>Put this as the <code>orbit</code> section of Penny's <code>PENNY_LEARNING</code> deployment setting. <code>audiencePrincipalIds</code> lists the people who can see these records in Orbit; Penny shows learnings only to people they cover.</p><label for="penny-section">orbit section</label><textarea id="penny-section" readonly rows="8">${esc(JSON.stringify(section,null,2))}</textarea>
<p><a href="/delegation/settings">Back to Connected applications</a></p>`));
 });
 return app;
}
