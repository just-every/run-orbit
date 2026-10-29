import {strict as assert} from 'node:assert';
import {createApp} from './app';
import {isolatedDatabase} from './isolated-database';
import {createDependencies} from './dependencies';
import {createId} from '../../src/core/shared/ids';
import {hash} from '../../src/core/features/delegation/protocol';

const jsonType=Response.json(null).headers.get('Content-Type')!;

export async function proveApiCredentials(db:D1Database,actor:string,cookie:string,stage:string){
 const deps=createDependencies(db),principalId=createId(),record=createId(),now='2026-10-27T00:00:00.000Z';let clockNow=new Date(now);
 await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(actor).run();
 await deps.auth.ensureOperator({id:principalId,email:'synthetic-orbit-1@example.test',displayName:'synthetic-orbit-1'});
 await db.prepare("INSERT INTO opportunities(id,title,lifecycle,stage_id,value_cents,score,band,queue_state,created_at,updated_at) VALUES(?,'synthetic-orbit-1','open',?,0,0,'low','none',?,?)").bind(record,stage,now,now).run();
 const headers={Cookie:cookie,Origin:'https://orbit.test','Content-Type':jsonType},app=(database=db)=>createApp({database,clock:{now:()=>clockNow},assets:{fetch:async()=>new Response(null,{status:404})}});
 const request=(path='',method='GET',body?:unknown,override:Record<string,string>={},database=db)=>app(database).request('https://orbit.test/api/v1/settings/api-credentials'+path,{method,headers:{...headers,...override},body:body===undefined?undefined:JSON.stringify(body)});
 const definition={name:'synthetic-orbit-1',principalId,operations:['deal.read','deal.update'],recordIds:[record],fields:['title'],expiresAt:'2026-11-26T00:00:00.000Z'};
 assert.equal((await request('','POST',definition,{Cookie:''})).status,401);
 assert.equal((await request('?unsupported=1')).status,400);
 assert.equal((await request('/invalid/rotate','POST',{revision:1})).status,400);
 assert.equal((await request('','POST',definition,{Origin:'https://foreign.example.test'})).status,403);
 const peer=await deps.auth.createSession(principalId);
 assert.equal((await request('','POST',definition,{Cookie:'__Host-orbit_session='+peer.token})).status,403);
 for(const change of [{expiresAt:now},{expiresAt:new Date(clockNow.getTime()+90*86400000+1).toISOString()},{expiresAt:'2027-10-27T00:00:00.000Z'},{operations:['message.approve']},{fields:['recipient_email']},{recordIds:[]},{recordIds:[createId()]},{principalId:createId()}])assert.ok((await request('','POST',{...definition,...change})).status>=400);
 const response=await request('','POST',definition);assert.equal(response.status,201,await response.clone().text());
 assert.equal(response.headers.get('cache-control'),'no-store');
 const issued=await response.json() as {credential:{id:string;revision:number;expiresAt:string};secret:string},id=issued.credential.id;
 const row=await db.prepare('SELECT * FROM api_credentials WHERE id=?').bind(id).first<Record<string,unknown>>();
 assert.equal(row!.verifier,await hash(issued.secret));assert.ok(!JSON.stringify(row).includes(issued.secret));
 assert.equal(row!.installation_id,await db.prepare('SELECT id FROM delegation_installation').first('id'));
 assert.deepEqual(JSON.parse(row!.records_json as string),[record]);assert.deepEqual(JSON.parse(row!.fields_json as string),['title']);
 const listed=await request(),diagnostics=await listed.text();assert.ok(!diagnostics.includes(issued.secret)&&!diagnostics.includes(String(row!.verifier)));
 const publicRequest=(path='/deals',method='GET',body?:unknown,secret:string|null=issued.secret,extra:Record<string,string>={},database=db)=>app(database).request('https://orbit.test/api/rest/v1'+path,{method,headers:{'Content-Type':jsonType,...(secret?{Authorization:'Bearer '+secret}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
 const apiStage=createId(),outsideRecord=createId();
 await db.prepare('INSERT INTO pipeline_stages(id,name,position,created_at,updated_at) VALUES(?,?,?,?,?)').bind(apiStage,'synthetic-orbit-2',2,now,now).run();
 await db.prepare('UPDATE opportunities SET stage_id=? WHERE id=?').bind(apiStage,record).run();
 await db.prepare("INSERT INTO opportunities(id,title,lifecycle,stage_id,value_cents,score,band,queue_state,created_at,updated_at) VALUES(?,'synthetic-orbit-6','open',?,0,0,'low','none',?,?)").bind(outsideRecord,apiStage,now,now).run();
 assert.equal((await publicRequest()).status,200,'Standalone API credential authenticates without a native session');
 assert.equal((await publicRequest('/deals','GET',undefined,null)).status,401,'Missing credential is refused');
 assert.equal((await publicRequest('/deals','GET',undefined,null,{Cookie:cookie})).status,401,'An owner cookie never authenticates the public API');
 assert.equal((await publicRequest('/deals','GET',undefined,'synthetic-orbit-2')).status,401,'Other credential namespaces are refused');
 const read=await publicRequest('/deals/'+record);assert.equal(read.status,200,await read.clone().text());
 const etag=read.headers.get('ETag')!;assert.ok(etag);
 assert.deepEqual((await read.json() as any).deal,{id:record,title:'synthetic-orbit-1'},'Only permitted fields are returned');
 assert.equal((await publicRequest('/deals/'+record,'PATCH',{title:'synthetic-orbit-2'},issued.secret,{'If-Match':etag})).status,200,'Scoped update succeeds without a native session or Origin');
 const updated=await publicRequest('/deals/'+record),updatedEtag=updated.headers.get('ETag')!;
 assert.equal((await updated.json() as any).deal.title,'synthetic-orbit-2','The standalone write is visible at the HTTP edge');
 assert.equal((await publicRequest('/deals/'+record,'PATCH',{title:'synthetic-orbit-3'},issued.secret,{'If-Match':etag})).status,409,'A stale write is refused');
 assert.equal((await publicRequest('/deals/'+record+'?fields=value_cents')).status,403,'Denied read fields stay private');
 assert.equal((await publicRequest('/deals/'+record,'PATCH',{value_cents:100},issued.secret,{'If-Match':updatedEtag})).status,403,'Denied write fields cannot change');
 assert.equal((await publicRequest('/deals/'+outsideRecord)).status,403,'An existing record outside scope is refused');
 assert.equal((await publicRequest('/deals/'+record,'PATCH',{title:42},issued.secret,{'If-Match':updatedEtag})).status,400,'Schema errors are real HTTP refusals');
 assert.equal((await publicRequest('/deals?unsupported=1')).status,400);
 assert.equal((await publicRequest('/deals?limit=1&limit=2')).status,400);
 for(const path of ['/messages/approve','/messages/send','/approvals/restore'])assert.equal((await publicRequest(path,'POST',{})).status,404,'API credentials have no message or approval operation');
 const createResponse=await request('','POST',{...definition,operations:['deal.read','deal.create','deal.update'],fields:['title','stage_id','value_cents']});assert.equal(createResponse.status,201);
 const creator=await createResponse.json() as typeof issued;
 const creation={title:'synthetic-orbit-3',stage_id:apiStage,value_cents:500},createHeaders={'Idempotency-Key':'synthetic-orbit-1'};
 const createdResponse=await publicRequest('/deals','POST',creation,creator.secret,createHeaders);assert.equal(createdResponse.status,201,await createdResponse.clone().text());
 const created=await createdResponse.json() as {id:string;replayed:boolean};assert.equal(created.replayed,false);
 const replay=await publicRequest('/deals','POST',creation,creator.secret,createHeaders);assert.equal(replay.status,200,await replay.clone().text());assert.deepEqual(await replay.json(),{...created,replayed:true},'The same idempotency key returns the one original deal');
 assert.equal((await publicRequest('/deals','POST',{...creation,title:'synthetic-orbit-4'},creator.secret,createHeaders)).status,409,'Changed idempotent content is refused');
 const firstPage=await publicRequest('/deals?limit=1', 'GET',undefined,creator.secret);assert.equal(firstPage.status,200);
 const remaining=firstPage.headers.get('RateLimit-Remaining');assert.ok(remaining!==null&&Number(remaining)>=0&&Number(remaining)<Number(firstPage.headers.get('RateLimit-Limit')),'Rate-limit headers expose the remaining allowance');assert.ok(Number(firstPage.headers.get('RateLimit-Reset'))>0);
 const page=await firstPage.json() as any;assert.equal(page.deals.length,1);assert.ok(page.nextCursor);
 const secondPage=await(await publicRequest('/deals?limit=1&cursor='+page.nextCursor,'GET',undefined,creator.secret)).json() as any;
 assert.equal(secondPage.deals.length,1);assert.notEqual(secondPage.deals[0].id,page.deals[0].id);assert.equal(secondPage.nextCursor,null,'Cursor pagination ends after the two scoped deals');
 const filtered=await(await publicRequest('/deals?title=synthetic-orbit-3','GET',undefined,creator.secret)).json() as any;assert.deepEqual(filtered.deals.map((deal:any)=>deal.id),[created.id],'An exact filter returns only the matching scoped deal');
 const limit=Number(firstPage.headers.get('RateLimit-Limit'));
 await db.prepare('UPDATE public_rate_limits SET count=? WHERE bucket=?').bind(limit,`api:${creator.credential.id}:${Math.floor(clockNow.getTime()/60000)}`).run();
 const limited=await publicRequest('/deals','GET',undefined,creator.secret);assert.equal(limited.status,429,'The advertised rate limit is enforced at the HTTP edge');assert.ok(Number(limited.headers.get('Retry-After'))>0);
 await db.prepare('DELETE FROM public_rate_limits WHERE bucket=?').bind(`api:${creator.credential.id}:${Math.floor(clockNow.getTime()/60000)}`).run();
 const noCreateResponse=await request('','POST',{...definition,fields:['title','stage_id','value_cents']});assert.equal(noCreateResponse.status,201);
 const noCreate=await noCreateResponse.json() as typeof issued;
 assert.equal((await publicRequest('/deals','POST',creation,noCreate.secret,createHeaders)).status,403,'An update credential cannot create');
 const readOnly=await(await request('','POST',{...definition,operations:['deal.read']})).json() as typeof issued;
 assert.equal((await publicRequest('/deals/'+record,'PATCH',{title:'synthetic-orbit-4'},readOnly.secret,{'If-Match':updatedEtag})).status,403,'A read-only credential cannot write');
 const rotatedResponse=await request('/'+id+'/rotate','POST',{revision:1});assert.equal(rotatedResponse.status,200,await rotatedResponse.clone().text());
 const rotated=await rotatedResponse.json() as typeof issued;
 assert.equal((await publicRequest('/deals','GET',undefined,issued.secret)).status,401,'Rotation refuses the old secret on its next request');
 assert.equal((await publicRequest('/deals','GET',undefined,rotated.secret)).status,200,'Rotation admits the new secret on its next request');
 assert.equal((await publicRequest('/deals/'+record,'PATCH',{title:'synthetic-orbit-4'},issued.secret,{'If-Match':updatedEtag})).status,401,'Rotation also refuses old-secret writes');
 assert.notEqual(rotated.secret,issued.secret);assert.equal(rotated.credential.expiresAt,issued.credential.expiresAt);
 assert.equal(await db.prepare('SELECT verifier FROM api_credentials WHERE id=?').bind(id).first('verifier'),await hash(rotated.secret));
 assert.equal((await request('/'+id+'/rotate','POST',{revision:1})).status,409);
 assert.equal((await request('/'+id+'/revoke','POST',{revision:2})).status,200);
 assert.equal((await publicRequest('/deals','GET',undefined,rotated.secret)).status,401,'Revocation refuses the next read');
 assert.equal((await publicRequest('/deals/'+record,'PATCH',{title:'synthetic-orbit-4'},rotated.secret,{'If-Match':updatedEtag})).status,401,'Revocation refuses the next write');
 assert.notEqual(await db.prepare('SELECT verifier FROM api_credentials WHERE id=?').bind(id).first('verifier'),await hash(rotated.secret));
 assert.equal((await request('/'+id+'/rotate','POST',{revision:3})).status,409);
 const expired=await(await request('','POST',{...definition,expiresAt:'2026-10-28T00:00:00.000Z'})).json() as typeof issued;
 clockNow=new Date('2026-10-28T00:00:00.000Z');
 assert.equal((await publicRequest('/deals','GET',undefined,expired.secret)).status,401,'Expiry refuses authentication at its exact boundary');
 assert.equal((await request('/'+expired.credential.id+'/rotate','POST',{revision:1})).status,409);
 clockNow=new Date(now);
 const raceCredential=await(await request('','POST',definition)).json() as typeof issued;
 const effects=async()=>Promise.all(['opportunities','timeline_entries','audit_entries'].map(table=>db.prepare(`SELECT count(*) FROM ${table}`).first('count(*)')));
 for(const change of ['revoke','rotate','principal','installation','restore','record','expiry']){
  let changed=false;const beforeEffects=await effects();
  const database=new Proxy(db,{get(target,key){if(key==='batch')return async(statements:D1PreparedStatement[])=>{
   // The public limiter's first batch precedes the native write planner.
   if(!changed&&statements.length>3){changed=true;
    if(change==='revoke')await target.prepare('UPDATE api_credentials SET revoked_at=? WHERE id=?').bind(now,raceCredential.credential.id).run();
    if(change==='rotate')await target.prepare('UPDATE api_credentials SET verifier=? WHERE id=?').bind(await hash('synthetic-orbit-5'),raceCredential.credential.id).run();
    if(change==='principal')await target.prepare("UPDATE operators SET status='removed' WHERE id=?").bind(principalId).run();
    if(change==='installation')await target.prepare("UPDATE api_credentials SET installation_id='synthetic-orbit-5' WHERE id=?").bind(raceCredential.credential.id).run();
    if(change==='restore')await target.prepare("INSERT INTO runtime_controls(name,value) VALUES('archive_import','synthetic-orbit-5')").run();
    if(change==='record')await target.prepare('UPDATE api_credentials SET records_json=\'[]\' WHERE id=?').bind(raceCredential.credential.id).run();
    if(change==='expiry')await target.prepare('UPDATE api_credentials SET expires_at=? WHERE id=?').bind(now,raceCredential.credential.id).run();
   }return target.batch(statements);
  };const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
  assert.equal((await publicRequest('/deals/'+record,'PATCH',{title:'synthetic-orbit-5'},raceCredential.secret,{'If-Match':updatedEtag},database)).status,401,change+' during write is refused');assert.ok(changed);assert.deepEqual(await effects(),beforeEffects,'No durable effects survive '+change);
  clockNow=new Date(now);await db.prepare("DELETE FROM runtime_controls WHERE name='archive_import'").run();await db.prepare("UPDATE operators SET status='active' WHERE id=?").bind(principalId).run();
  await db.prepare('UPDATE api_credentials SET revoked_at=NULL,verifier=?,installation_id=(SELECT id FROM delegation_installation),records_json=?,expires_at=? WHERE id=?').bind(await hash(raceCredential.secret),JSON.stringify([record]),definition.expiresAt,raceCredential.credential.id).run();
 }
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
 await db.prepare('DELETE FROM api_credentials').run();for(const deal of [record,created.id,outsideRecord])await db.prepare('DELETE FROM opportunities WHERE id=?').bind(deal).run();
 await db.prepare('DELETE FROM pipeline_stage_rules WHERE stage_id=?').bind(apiStage).run();await db.prepare('DELETE FROM pipeline_stages WHERE id=?').bind(apiStage).run();
 await proveScopedDealFields();
}

export async function issueNativeCredential(db:D1Database,actor:string,recordId:string,principalId=actor,name='synthetic-orbit-1'){
 const session=await createDependencies(db).auth.createSession(actor),app=createApp({database:db,clock:{now:()=>new Date('2026-10-27T00:00:00.000Z')},assets:{fetch:async()=>new Response(null,{status:404})}});
 const response=await app.request('https://orbit.test/api/v1/settings/api-credentials',{method:'POST',headers:{Cookie:'__Host-orbit_session='+session.token,Origin:'https://orbit.test','Content-Type':jsonType},body:JSON.stringify({name,principalId,operations:['deal.read'],recordIds:[recordId],fields:['title'],expiresAt:'2026-11-26T00:00:00.000Z'})});
 assert.equal(response.status,201,await response.clone().text());return response.json() as Promise<{credential:{id:string;revision:number};secret:string}>;
}

/** One integration connects two real installations, then follows live edits and withdrawn authority. */
async function proveScopedDealFields(){
 const fixtures:Awaited<ReturnType<typeof isolatedDatabase>>[]=[],now='2026-10-27T00:00:00.000Z';let clockNow=new Date(now);
 const fields=['title','stage_id','value_cents','company_id','expected_close_at','owner_id','products'];
 const payload=async(response:Response,status=200)=>{assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
 try{
  async function installation(index:number){
   const fixture=await isolatedDatabase();fixtures.push(fixture);
   const db=fixture.db,deps=createDependencies(db),owner=createId(),stage=createId();
   await deps.workspace.ensureWorkspace({name:`synthetic-orbit-${index}`,timezone:'UTC',currency:'USD',workingHours:{},staleIntervalDays:14,awaitingResponseWorkingDays:5,freeMailDomains:[]});
   await deps.auth.ensureOperator({id:owner,email:`synthetic-orbit-${index}@dev.localhost`,displayName:`synthetic-orbit-${index}`});
   await db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(owner).run();
   await db.prepare('INSERT INTO pipeline_stages(id,name,position,created_at,updated_at) VALUES(?,?,0,?,?)').bind(stage,`synthetic-orbit-${index}`,now,now).run();
   const session=await deps.auth.createSession(owner),cookie='__Host-orbit_session='+session.token;
   const app=()=>createApp({database:fixture.db,clock:{now:()=>clockNow},assets:{fetch:async()=>new Response(null,{status:404})}});
   const native=(path:string,method='GET',body?:unknown)=>app().request('https://orbit.test/api/v1'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':jsonType},body:body===undefined?undefined:JSON.stringify(body)});
   const principal=await payload(await native('/settings/operators','POST',{email:`synthetic-orbit-${index+10}@dev.localhost`,displayName:`synthetic-orbit-${index+10}`}),201);
   const contactName=`synthetic-orbit-${index+20}`,contactEmail=`synthetic-orbit-${index+20}@dev.localhost`;
   const contact=await payload(await native('/records/contact','POST',{name:contactName,email:contactEmail}),201);
   const close=index===1?'2026-11-12T15:00:00.000Z':'2026-12-18T18:30:00.000Z',products=[`synthetic-orbit-${index} family`,`synthetic-orbit-${index} service`];
   const input={title:`synthetic-orbit-${index} deal`,stage_id:stage,value_cents:index*10000,owner_id:principal.id,expected_close_at:close,contact_ids:[contact.id],primary_contact_id:contact.id};
   const record=(await payload(await native('/records/opportunity','POST',input),201)).id as string;
   const outside=(await payload(await native('/records/opportunity','POST',{title:`synthetic-orbit-${index} outside`,stage_id:stage,value_cents:0,owner_id:owner}),201)).id as string;
   const context=async(id:string,values:string[])=>{
    const current=await payload(await native('/relationships/opportunity/'+id));
    await payload(await native('/relationships/opportunity/'+id,'PUT',{revision:current.revision,companyId:current.company?.id??null,primaryContactId:current.stakeholders.find((person:any)=>person.isPrimary)?.contactId??null,stakeholders:current.stakeholders.map((person:any)=>({contactId:person.contactId,roles:person.roles,verified:person.verified})),products:values,nextStep:current.nextStep,mutualCommitments:current.mutualCommitments}));
   };
   await context(record,products);
   const definition={name:`synthetic-orbit-${index}`,principalId:principal.id,operations:['deal.read'],recordIds:[record],fields,expiresAt:'2026-11-26T00:00:00.000Z'};
   const issue=async(change:Record<string,unknown>={})=>payload(await native('/settings/api-credentials','POST',{...definition,...change}),201) as Promise<{credential:{id:string;revision:number};secret:string}>;
   const credential=await issue();
   const api=(path:string,secret=credential.secret,method='GET',body?:unknown)=>app().request('https://orbit.test/api/rest/v1'+path,{method,headers:{Authorization:'Bearer '+secret,'Content-Type':jsonType},body:body===undefined?undefined:JSON.stringify(body)});
   return {fixture,owner,principal:principal.id,record,outside,input,products,close,contact:contact.id,contactName,contactEmail,credential,native,context,issue,api,expected:{id:record,title:input.title,stage_id:stage,value_cents:input.value_cents,company_id:null,expected_close_at:close,owner_id:principal.id,products}};
  }
  const first=await installation(1),second=await installation(2),workspaces=[first,second];
  assert.notEqual(first.fixture.directory,second.fixture.directory,'The workspaces use separate persistent D1 databases');
  assert.notEqual(await first.fixture.db.prepare('SELECT id FROM delegation_installation').first('id'),await second.fixture.db.prepare('SELECT id FROM delegation_installation').first('id'));
  const effects=async()=>Promise.all(fixtures.map(async fixture=>Promise.all(['opportunities','opportunity_buying_context','api_credentials','access_memberships','access_grants','audit_entries','timeline_entries'].map(table=>fixture.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all().then(result=>result.results)))));
  const denied=async(call:()=>Promise<Response>,status:number,message:string)=>{
   const before=await effects(),response=await call(),body=await payload(response,status);
   assert.deepEqual(Object.keys(body),['error'],message);assert.ok(typeof body.error==='string'&&body.error.length>0,message);
   assert.deepEqual(await effects(),before,message+' leaves deals, credentials, record scopes and domain effects unchanged');
  };
  for(const workspace of workspaces){
   assert.deepEqual((await payload(await workspace.api('/deals'))).deals,[workspace.expected],'Each installation lists only its own populated, permitted deal');
   assert.deepEqual((await payload(await workspace.api('/deals/'+workspace.record+'?fields='+fields.join(',')))).deal,workspace.expected,'All seven selected fields are available together');
   assert.deepEqual((await payload(await workspace.api('/deals/'+workspace.record+'?fields=expected_close_at,owner_id,products'))).deal,{id:workspace.record,expected_close_at:workspace.close,owner_id:workspace.principal,products:workspace.products},'Selection exposes an owner id and saved product names without owner email or stakeholder data');
   await denied(()=>workspace.api('/deals/'+workspace.outside),403,'A deal outside the credential record scope is absent from read');
   const noDeals=await workspace.issue({operations:['deal.update']});
   await denied(()=>workspace.api('/deals',noDeals.secret),403,'A credential without deal read scope cannot list fields');
   await denied(()=>workspace.api('/deals/'+workspace.record,noDeals.secret),403,'A credential without deal read scope cannot read fields');
   const narrow=await workspace.issue({fields:['title']});
   for(const field of ['expected_close_at','owner_id','products'])await denied(()=>workspace.api('/deals/'+workspace.record+'?fields='+field,narrow.secret),403,'An unscoped field remains private');
   await denied(()=>workspace.api('/deals/'+workspace.record+'?fields=email'),403,'An undeclared field cannot disclose an email');
   await denied(()=>workspace.api('/deals/'+workspace.record,workspace.credential.secret,'PATCH',{expected_close_at:'2026-11-01T00:00:00.000Z'}),400,'The new read fields grant no API write surface');
  }
  for(const [own,other] of [[first,second],[second,first]]){
   await denied(()=>own.api('/deals',other.credential.secret),401,'The other installation credential cannot list this workspace');
   await denied(()=>own.api('/deals/'+own.record,other.credential.secret),401,'The other installation credential cannot read this workspace');
   await denied(()=>own.api('/deals/'+other.record),403,'A local credential cannot read the other workspace record');
  }
  // A persisted verifier with the wrong installation binding must also be refused.
  const mismatched=await first.issue(),otherInstallation=await second.fixture.db.prepare('SELECT id FROM delegation_installation').first('id');
  await first.fixture.db.prepare('UPDATE api_credentials SET installation_id=? WHERE id=?').bind(otherInstallation,mismatched.credential.id).run();
  await denied(()=>first.api('/deals',mismatched.secret),401,'Installation binding is checked even when the verifier exists locally');
  const changedClose='2026-12-22T16:45:00.000Z';
  await payload(await first.native('/records/opportunity/'+first.record,'PUT',{...first.input,expected_close_at:changedClose}));
  assert.equal((await payload(await first.api('/deals/'+first.record))).deal.expected_close_at,changedClose,'The very next integration read sees the native deal edit');
  assert.equal((await payload(await second.api('/deals/'+second.record))).deal.expected_close_at,second.close,'A native edit in one workspace does not change the other');
  const changedProducts=['synthetic-orbit-30 family'];await first.context(first.record,changedProducts);
  assert.deepEqual((await payload(await first.api('/deals'))).deals,[{...first.expected,expected_close_at:changedClose,products:changedProducts}],'Product reads also use current buying context');
  await first.fixture.close();await first.fixture.reopen();
  assert.deepEqual((await payload(await first.api('/deals/'+first.record))).deal,{...first.expected,expected_close_at:changedClose,products:changedProducts},'The scoped read survives reopening its real D1 database');
  const expiring=await first.issue({expiresAt:'2026-10-28T00:00:00.000Z'});clockNow=new Date('2026-10-28T00:00:00.000Z');
  await denied(()=>first.api('/deals/'+first.record,expiring.secret),401,'Expiry refuses the next integration read at the injected boundary');clockNow=new Date(now);
  const revoked=await first.issue();await payload(await first.native('/settings/api-credentials/'+revoked.credential.id+'/revoke','POST',{revision:1}));
  await denied(()=>first.api('/deals',revoked.secret),401,'Credential revocation refuses the very next integration read');
  await denied(()=>first.api('/deals/'+first.record,revoked.secret),401,'A revoked credential cannot read a known deal');
  const review=await payload(await second.native('/settings/operators/'+second.principal+'/removal-review'));
  await payload(await second.native('/settings/operators/'+second.principal,'DELETE',{confirmed:true,handover:{review:review.review,opportunities:second.owner,tasks:null,handoffs:null}}));
  await denied(()=>second.api('/deals'),401,'Removing the principal withdraws all current record authority from the next list');
  await denied(()=>second.api('/deals/'+second.record),401,'A principal without current authority cannot read a known deal');
  await payload(await second.native('/settings/operators/'+second.principal+'/erase','POST',{confirmed:true}));
  await denied(()=>second.api('/deals/'+second.record),401,'An erased principal never regains authority');
  // Context copied to an unrelated deal follows native erasure even when that credential remains valid.
  await first.context(first.outside,[first.contactName+' '+first.contactEmail]);
  const unrelated=await first.issue({recordIds:[first.outside],principalId:first.owner});
  assert.deepEqual((await payload(await first.api('/deals/'+first.outside,unrelated.secret))).deal.products,[first.contactName+' '+first.contactEmail]);
  await payload(await first.native('/records/contact/'+first.contact,'DELETE',{confirmed:true}));
  await denied(()=>first.api('/deals/'+first.record),401,'Contact erasure withdraws credentials on the affected deal');
  const erasedRead=(await payload(await first.api('/deals/'+first.outside,unrelated.secret))).deal;
  assert.deepEqual(erasedRead.products,[],'Erasure removes copied personal product context from a still-readable deal');
  assert.equal(erasedRead.owner_id,first.owner);assert.ok(!JSON.stringify(erasedRead).includes(first.contactName)&&!JSON.stringify(erasedRead).includes(first.contactEmail),'An erased contact name and email never return through the new fields');
  const empty=await first.issue({recordIds:[first.outside],principalId:first.owner,fields:['expected_close_at','owner_id','products']});
  await payload(await first.native('/records/opportunity/'+first.outside,'PUT',{title:'synthetic-orbit-1 outside',stage_id:first.input.stage_id,value_cents:0,owner_id:null,expected_close_at:null}));
  assert.deepEqual((await payload(await first.api('/deals/'+first.outside,empty.secret))).deal,{id:first.outside,expected_close_at:null,owner_id:null,products:[]},'Unassigned and empty fields are represented without invented data');
 }finally{for(const fixture of fixtures)await fixture.dispose();}
}
