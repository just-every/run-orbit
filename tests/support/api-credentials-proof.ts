import assert from 'node:assert/strict';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {createId} from '../../src/core/shared/ids';
import {hash} from '../../src/core/features/delegation/protocol';

export async function proveApiCredentials(db:D1Database,actor:string,cookie:string,stage:string){
 const deps=createDependencies(db),principalId=createId(),record=createId(),now='2026-10-27T00:00:00.000Z';let clockNow=new Date(now);
 await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(actor).run();
 await deps.auth.ensureOperator({id:principalId,email:'synthetic-orbit-1@example.test',displayName:'synthetic-orbit-1'});
 await db.prepare("INSERT INTO opportunities(id,title,lifecycle,stage_id,value_cents,score,band,queue_state,created_at,updated_at) VALUES(?,'synthetic-orbit-1','open',?,0,0,'low','none',?,?)").bind(record,stage,now,now).run();
 const headers={Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},app=(database=db)=>createApp({database,clock:{now:()=>clockNow},assets:{fetch:async()=>new Response(null,{status:404})}});
 const request=(path='',method='GET',body?:unknown,override:Record<string,string>={},database=db)=>app(database).request('https://orbit.test/api/v1/settings/api-credentials'+path,{method,headers:{...headers,...override},body:body===undefined?undefined:JSON.stringify(body)});
 const definition={name:'synthetic-orbit-1',principalId,operations:['deal.read','deal.update'],recordIds:[record],fields:['title'],expiresAt:'2026-11-26T00:00:00.000Z'};
 assert.equal((await request('','POST',definition,{Cookie:''})).status,401);
 assert.equal((await request('','POST',definition,{Origin:'https://foreign.example.test'})).status,403);
 const peer=await deps.auth.createSession(principalId);
 assert.equal((await request('','POST',definition,{Cookie:'__Host-orbit_session='+peer.token})).status,403);
 for(const change of [{expiresAt:now},{expiresAt:'2027-10-27T00:00:00.000Z'},{operations:['message.approve']},{fields:['recipient_email']},{recordIds:[]},{recordIds:[createId()]},{principalId:createId()}])assert.ok((await request('','POST',{...definition,...change})).status>=400);
 const response=await request('','POST',definition);assert.equal(response.status,201,await response.clone().text());
 assert.equal(response.headers.get('cache-control'),'no-store');
 const issued=await response.json() as {credential:{id:string;revision:number;expiresAt:string};secret:string},id=issued.credential.id;
 const row=await db.prepare('SELECT * FROM api_credentials WHERE id=?').bind(id).first<Record<string,unknown>>();
 assert.equal(row!.verifier,await hash(issued.secret));assert.ok(!JSON.stringify(row).includes(issued.secret));
 assert.equal(row!.installation_id,await db.prepare('SELECT id FROM delegation_installation').first('id'));
 assert.deepEqual(JSON.parse(row!.records_json as string),[record]);assert.deepEqual(JSON.parse(row!.fields_json as string),['title']);
 const listed=await request(),diagnostics=await listed.text();assert.ok(!diagnostics.includes(issued.secret)&&!diagnostics.includes(String(row!.verifier)));
 const rotatedResponse=await request('/'+id+'/rotate','POST',{revision:1});assert.equal(rotatedResponse.status,200,await rotatedResponse.clone().text());
 const rotated=await rotatedResponse.json() as typeof issued;
 assert.notEqual(rotated.secret,issued.secret);assert.equal(rotated.credential.expiresAt,issued.credential.expiresAt);
 assert.equal(await db.prepare('SELECT verifier FROM api_credentials WHERE id=?').bind(id).first('verifier'),await hash(rotated.secret));
 assert.equal((await request('/'+id+'/rotate','POST',{revision:1})).status,409);
 assert.equal((await request('/'+id+'/revoke','POST',{revision:2})).status,200);
 assert.notEqual(await db.prepare('SELECT verifier FROM api_credentials WHERE id=?').bind(id).first('verifier'),await hash(rotated.secret));
 assert.equal((await request('/'+id+'/rotate','POST',{revision:3})).status,409);
 const expired=await(await request('','POST',{...definition,expiresAt:'2026-10-28T00:00:00.000Z'})).json() as typeof issued;
 clockNow=new Date('2026-10-28T00:00:00.000Z');
 assert.equal((await request('/'+expired.credential.id+'/rotate','POST',{revision:1})).status,409);
 clockNow=new Date(now);
 const raced=await(await request('','POST',definition)).json() as typeof issued;
 let intercepted=false;
 const wrapped=new Proxy(db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(!intercepted){intercepted=true;await target.prepare('UPDATE api_credentials SET revoked_at=? WHERE id=?').bind(now,raced.credential.id).run();}return target.batch(statements);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
 assert.equal((await request('/'+raced.credential.id+'/rotate','POST',{revision:1},{},wrapped)).status,409);assert.ok(intercepted);
 assert.equal(await db.prepare('SELECT verifier FROM api_credentials WHERE id=?').bind(raced.credential.id).first('verifier'),await hash(raced.secret));
 let removed=false;
 const principalRace=new Proxy(db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(!removed){removed=true;await target.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(principalId).run();}return target.batch(statements);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
 const before=await db.prepare('SELECT count(*) n FROM api_credentials').first('n');
 assert.equal((await request('','POST',definition,{},principalRace)).status,409);assert.ok(removed);
 assert.equal(await db.prepare('SELECT count(*) n FROM api_credentials').first('n'),before);
 await db.prepare("UPDATE operators SET status='active' WHERE id=?").bind(principalId).run();
 // A credential's secret is never an operator session or a delegation grant.
 for(const secret of [issued.secret,rotated.secret,raced.secret]){
  assert.equal((await request('', 'GET',undefined,{Cookie:'',Authorization:'Bearer '+secret})).status,401);
  assert.equal((await app().request('https://orbit.test/api/delegation/v1/identity',{headers:{Authorization:'Bearer '+secret}})).status,401);
 }
 const nativeSession=await deps.auth.createSession(actor);let revokedSession=false;
 const sessionRace=new Proxy(db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(!revokedSession){revokedSession=true;await target.prepare('UPDATE sessions SET revoked_at=? WHERE id=?').bind(new Date().toISOString(),nativeSession.id).run();}return target.batch(statements);};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
 const beforeSessionRace=await db.prepare('SELECT count(*) FROM api_credentials').first('count(*)');
 assert.equal((await request('','POST',definition,{Cookie:'__Host-orbit_session='+nativeSession.token},sessionRace)).status,409);assert.ok(revokedSession);
 assert.equal(await db.prepare('SELECT count(*) FROM api_credentials').first('count(*)'),beforeSessionRace,'A revoked native session cannot issue durable authority');
 const audits=JSON.stringify((await db.prepare("SELECT * FROM audit_entries WHERE action LIKE 'api.%'").all()).results);
 for(const secret of [issued.secret,rotated.secret,raced.secret])assert.ok(!audits.includes(secret));
 assert.equal(await db.prepare('SELECT count(*) n FROM outbound_messages').first('n'),0);
 await db.prepare('DELETE FROM api_credentials').run();await db.prepare('DELETE FROM opportunities WHERE id=?').bind(record).run();
}

export async function issueNativeCredential(db:D1Database,actor:string,recordId:string,principalId=actor,name='synthetic-orbit-1'){
 const session=await createDependencies(db).auth.createSession(actor),app=createApp({database:db,clock:{now:()=>new Date('2026-10-27T00:00:00.000Z')},assets:{fetch:async()=>new Response(null,{status:404})}});
 const response=await app.request('https://orbit.test/api/v1/settings/api-credentials',{method:'POST',headers:{Cookie:'__Host-orbit_session='+session.token,Origin:'https://orbit.test','Content-Type':'application/json'},body:JSON.stringify({name,principalId,operations:['deal.read'],recordIds:[recordId],fields:['title'],expiresAt:'2026-11-26T00:00:00.000Z'})});
 assert.equal(response.status,201,await response.clone().text());return response.json() as Promise<{credential:{id:string;revision:number};secret:string}>;
}
