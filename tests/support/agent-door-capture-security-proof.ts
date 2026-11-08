import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createApp} from '../../src/core/app/app';
import {operatorFromRequest,requireStepUp} from '../../src/core/features/identity';
import {orbitAgentDoor} from '../../src/core/features/agent-door';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {autonomousPolicy,heldPolicy} from '../../src/base/modules/agent-door/conformance/crypto.mjs';
import {eml} from './capture-fixture';
import {httpArchive} from '../../newtests/t096/archive-http-proof';
import type {PlatformBindings} from '../../src/core/platform/assets';

export interface CaptureSecurityProofContext {
 bindings:PlatformBindings;door:ReturnType<typeof orbitAgentDoor>;cookie:string;reviewerCookie:string;ownerId:string;
 adopt:(policy:ReturnType<typeof autonomousPolicy>)=>Promise<void>;
 businessCall:(name:string,args:Record<string,unknown>,overrides?:Record<string,unknown>,method?:string,rpcId?:number)=>Promise<{status:number;body:any}>;
}

/** One populated security journey through native Capture, signed intake and the MCP transport. */
export async function agentDoorCaptureSecurityProof({bindings,door,cookie,reviewerCookie,ownerId,adopt,businessCall}:CaptureSecurityProofContext){
 const db=bindings.DB,origin=bindings.AUTH_ORIGIN!,keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const security=createSourceSecurity(bindings)!;
 const app=createApp({database:db,assets:bindings.ASSETS,sourceSecurity:security,captureMailAddress:bindings.CAPTURE_MAIL_ADDRESS,
  mailEventKeys:{parseKey:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')},
  authenticate:request=>operatorFromRequest(request,bindings),stepUp:(request,action,returnTo)=>requireStepUp(request,bindings,action,returnTo)});
 const native=async(path:string,method='GET',body?:object)=>{
  const response=await app.request(origin+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.ok(response.ok,'native Capture lifecycle '+response.status);return response.json() as Promise<any>;
 };
 const state=async()=>Object.fromEntries(await Promise.all(['capture_sources','capture_credentials','signals','capture_items','capture_proposals','timeline_entries','audit_entries'].map(async table=>
  [table,(await db.prepare('SELECT * FROM '+table).all()).results.map(row=>JSON.stringify(row)).sort()])));
 const evidence=async()=>Object.fromEntries(await Promise.all(['signals','capture_items','capture_proposals','timeline_entries'].map(async table=>
  [table,(await db.prepare('SELECT * FROM '+table).all()).results.map(row=>JSON.stringify(row)).sort()])));
 let rpc=300;
 const mcp=(name:string,args:Record<string,unknown>,overrides?:Record<string,unknown>)=>businessCall('orbit.capture.'+name,args,overrides,'tools/call',++rpc);
 const done=(response:Awaited<ReturnType<typeof businessCall>>)=>{
  assert.equal(response.status,200);assert.equal(response.body.error,undefined);assert.equal(response.body.result.isError,false,JSON.stringify(response.body));
  return response.body.result.structuredContent;
 };
 const refused=(response:Awaited<ReturnType<typeof businessCall>>,code:string)=>{
  assert.equal(response.status,200);assert.equal(response.body.result.isError,true);assert.equal(response.body.result._meta['com.runeditrun/error'].code,code);
  assert.equal(response.body.result.structuredContent,undefined);assert.equal(response.body.result._meta['com.runeditrun/receipt'],undefined);
 };
 const revision=async()=>done(await mcp('address_read',{})).revision as string;
 const args=async(key:string)=>({source_revision:await revision(),idempotency_key:key});
 const address=async()=>String((await native('/api/v1/capture/forward')).address);
 const parse=async(to:string,raw:string,valid=true)=>{
  const form=new FormData();form.set('email',raw);form.set('envelope',JSON.stringify({to:[to]}));
  const request=new Request(origin+'/api/v1/mail/capture',{method:'POST',body:form}),body=Buffer.from(await request.arrayBuffer()),timestamp=String(Math.floor(Date.now()/1000));
  const response=await app.request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')!,'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,
   'X-Twilio-Email-Event-Webhook-Signature':valid?sign('sha256',Buffer.concat([Buffer.from(timestamp),body]),keys.privateKey).toString('base64'):'synthetic-orbit-invalid'},body});
  return {status:response.status,body:await response.json() as any};
 };
 await adopt(autonomousPolicy());
 const beforeProvision=await state();
 refused(await mcp('address_read',{}),'resource_unavailable');
 refused(await mcp('address_rotate',{source_revision:'0'.repeat(64),idempotency_key:'synthetic-orbit-no-provision'}),'resource_unavailable');
 assert.deepEqual(await state(),beforeProvision,'the MCP adapter cannot provision a missing address');
 await native('/api/v1/capture/forward','POST',{});
 const old=await address(),oldTag=old.split('+')[1]!.split('@')[0]!;
 const contact=await native('/api/v1/records/contact','POST',{name:'Synthetic Capture buyer',email:['synthetic-orbit-buyer','example.test'].join('@')});
 const message=(id:string)=>eml({From:['Synthetic Capture buyer <synthetic-orbit-buyer','example.test>'].join('@'),To:['Synthetic seller <seller','example.test>'].join('@'),Subject:'Synthetic buyer reply',Date:new Date(Date.now()-60000).toUTCString(),'Message-ID':`<${id}@example.test>`},'Synthetic buyer evidence must survive rotation.');
 assert.deepEqual(await parse(old,message('synthetic-orbit-before')),{status:200,body:{accepted:true}});
 const confirmation='735192468',confirmationLink='https://mail-settings.google.com/mail/vf-synthetic-orbit-private';
 const confirmationMail=eml({From:['Gmail Team <forwarding-noreply','google.com>'].join('@'),To:old,Subject:`(#${confirmation}) Gmail Forwarding Confirmation - Receive Mail from synthetic-orbit-mailbox@example.test`,Date:new Date().toUTCString(),'Message-ID':'<synthetic-orbit-confirmation@example.test>'},`Confirmation code: ${confirmation}\n${confirmationLink}`);
 assert.deepEqual(await parse(old,confirmationMail),{status:200,body:{accepted:true}});
 assert.equal((await native('/api/v1/capture/forward')).confirmations[0].code,confirmation);
 const preserved=await evidence();assert.ok(preserved.signals!.length>0&&preserved.capture_items!.length>0&&preserved.capture_proposals!.length>0);
 const base=await args('synthetic-orbit-rotate-autonomous'),before=await state();
 for(const override of [{person_id:ownerId},{role:'owner'},{scopes:['*']},{destination:['foreign','example.test'].join('@')},{address:old},{provider:'foreign'},{confirmed:true}]){
  refused(await mcp('address_rotate',{...base,...override}),'undeclared_arguments');
  assert.deepEqual(await state(),before,'authority, destination and claimed confirmations cannot alter native state');
 }
 const auto=await mcp('address_rotate',base),rotated=done(auto),newAddress=await address(),newTag=newAddress.split('+')[1]!.split('@')[0]!;
 assert.equal(rotated.rotated,true);assert.equal(rotated.id,'capture-forward');assert.notEqual(newAddress,old);
 const expected=[{class:'security',facts:{measure:1,setting:'private_capture_address',provider:'orbit'}}];
 assert.deepEqual(auto.body.result._meta['com.runeditrun/decision'].classes.map(({class:name,facts}:any)=>({class:name,facts})),expected);
 const after=await state();assert.deepEqual(done(await mcp('address_rotate',base)),rotated);assert.deepEqual(await state(),after,'replay performs exactly one rotation');
 assert.deepEqual(await evidence(),preserved,'rotation preserves populated immutable evidence and proposals');
 assert.deepEqual((await native('/api/v1/capture/forward')).confirmations,[]);
 const count=(await evidence()).signals!.length;
 assert.deepEqual(await parse(old,message('synthetic-orbit-old-tag')),{status:200,body:{accepted:false}});
 assert.equal((await evidence()).signals!.length,count);
 assert.equal((await parse(newAddress,message('synthetic-orbit-new-tag'),false)).status,401);
 assert.equal((await evidence()).signals!.length,count,'the new tag cannot bypass signature validation');
 assert.deepEqual(await parse(newAddress,message('synthetic-orbit-new-tag')),{status:200,body:{accepted:true}});
 assert.equal((await evidence()).signals!.length,count+1);
 assert.deepEqual(await parse(newAddress,message('synthetic-orbit-new-tag')),{status:200,body:{accepted:true}});
 assert.equal((await evidence()).signals!.length,count+1,'signed intake replay retains one new signal');
 refused(await mcp('address_rotate',{...base,idempotency_key:'synthetic-orbit-stale'}),'revision_conflict');
 const block=autonomousPolicy();block.rules.push({id:'synthetic-orbit-security-block',class:'security',do:'blocked'});await adopt(block);
 const beforeBlock=await state();
 const blocked=await mcp('address_rotate',await args('synthetic-orbit-blocked'));refused(blocked,'policy_blocked');
 refused(await mcp('address_rotate',base),'policy_blocked');assert.deepEqual(await state(),beforeBlock);
 const audit=JSON.parse((await db.prepare('SELECT row FROM agent_door_audit WHERE id=?').bind(blocked.body.result._meta['com.runeditrun/decision'].id).first<string>('row'))!);
 assert.deepEqual(audit.classes,expected);assert.equal(audit.authority,'none');
 const held=heldPolicy();held.rules.find((rule:{do:string})=>rule.do==='approval')!.approver=['person:business-owner'];await adopt(held);
 const heldArgs=await args('synthetic-orbit-held-rotation'),heldBefore=await state();
 const pending=await mcp('address_rotate',{...heldArgs,expected_revision:heldArgs.source_revision});
 assert.equal(pending.body.result.resultType,'input_required');assert.equal(pending.body.result.structuredContent,undefined);
 const handle=pending.body.result._meta['com.runeditrun/approval'];assert.ok(handle.id);assert.deepEqual(await state(),heldBefore);
 const approvalRequest=(session:string,action='',body?:object)=>new Request(origin+'/agents/api/approvals/'+handle.id+action,{method:action?'POST':'GET',headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const reviewResponse=await door.handle(approvalRequest(cookie));assert.equal(reviewResponse!.status,200);
 const review=(await reviewResponse!.json() as any).approval;assert.deepEqual(review.approvers,['person:business-owner']);assert.deepEqual(review.classes,expected);
 const exact={revision:review.revision,summary_sha256:review.summary_sha256};
 assert.equal((await door.handle(approvalRequest(reviewerCookie,'/approve',exact)))!.status,403);
 assert.deepEqual(await state(),heldBefore,'a different signed-in person cannot execute the pending rotation');
 assert.equal((await mcp('address_rotate',{...heldArgs,expected_revision:heldArgs.source_revision})).body.result.resultType,'input_required');
 assert.deepEqual(await state(),heldBefore,'held retries cannot mutate early');
 const approved=await door.handle(approvalRequest(cookie,'/approve',exact));assert.equal(approved!.status,200);
 assert.equal((await approved!.json() as any).approval.state,'executed');
 const complete=await mcp('address_rotate',{...heldArgs,expected_revision:heldArgs.source_revision});done(complete);
 assert.deepEqual(complete.body.result._meta['com.runeditrun/receipt'].approved_by,[ownerId]);
 const heldAfter=await state();done(await mcp('address_rotate',{...heldArgs,expected_revision:heldArgs.source_revision}));assert.deepEqual(await state(),heldAfter);
 // An exact approval is invalidated by a native rotation before execution.
 const staleArgs=await args('synthetic-orbit-stale-approval');
 const stalePending=await mcp('address_rotate',{...staleArgs,expected_revision:staleArgs.source_revision});
 const staleHandle=stalePending.body.result._meta['com.runeditrun/approval'];
 await native('/api/v1/capture/forward','POST',{});const staleBefore=await state();
 const staleView=await door.handle(new Request(origin+'/agents/api/approvals/'+staleHandle.id,{headers:{Cookie:cookie}}));
 const staleReview=(await staleView!.json() as any).approval;
 const staleApproved=await door.handle(new Request(origin+'/agents/api/approvals/'+staleHandle.id+'/approve',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({revision:staleReview.revision,summary_sha256:staleReview.summary_sha256})}));
 assert.equal(staleApproved!.status,200);assert.equal((await staleApproved!.json() as any).approval.code,'revision_conflict');assert.deepEqual(await state(),staleBefore);
 await adopt(autonomousPolicy());
 // Full tool scopes do not substitute for the sponsoring person's native authority.
 const revokedArgs=await args('synthetic-orbit-revoked');
 await db.prepare("UPDATE access_memberships SET status='removed' WHERE operator_id=?").bind(ownerId).run();
 const revokedBefore=await state(),revoked=await mcp('address_rotate',revokedArgs);
 assert.equal(revoked.status,401);assert.deepEqual(await state(),revokedBefore);
 await db.prepare("UPDATE access_memberships SET status='active' WHERE operator_id=?").bind(ownerId).run();
 const beforeSelected=await state();
 assert.equal((await mcp('address_rotate',revokedArgs,{scope:'records:read records:write'})).status,403);
 assert.deepEqual(await state(),beforeSelected);
 // Interleave a real native connection change immediately before the adapter's write batch.
 let armed=false,interleaved=false;
 const racingDb=new Proxy(db,{get(target,key){
  if(key==='prepare')return (sql:string)=>{if(sql.includes("'capture_connection_fence'"))armed=true;return target.prepare(sql);};
  if(key==='batch')return async(statements:D1PreparedStatement[])=>{if(armed){armed=false;interleaved=true;await native('/api/v1/capture/forward','POST',{});}return target.batch(statements);};
  const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
 }});
 const racingDoor=orbitAgentDoor({...bindings,DB:racingDb});
 const owner=await operatorFromRequest(new Request(origin+'/app',{headers:{Cookie:cookie}}),bindings);assert.ok(owner);
 const race=await racingDoor.invoke('orbit.capture.address_rotate',await args('synthetic-orbit-transaction-race'),{person:{id:ownerId},agent:{id:'synthetic-orbit-race',name:'Synthetic race'},scopes:['capture:write']});
 assert.equal(race.code,'revision_conflict');assert.equal(interleaved,true);
 assert.equal(await db.prepare("SELECT count(*) FROM audit_entries WHERE action='capture.connected' AND json_extract(details_json,'$.preparedBy.agent.id')='synthetic-orbit-race'").first('count(*)'),0);
 const finalAddress=await address(),finalTag=finalAddress.split('+')[1]!.split('@')[0]!;
 const retained=JSON.stringify(Object.fromEntries(await Promise.all(['agent_door_calls','agent_door_approvals','agent_door_audit','agent_door_events','audit_entries'].map(async table=>[table,(await db.prepare('SELECT * FROM '+table).all()).results]))));
 const archiveRequest=Object.assign(async(path:string,method='GET',body?:unknown)=>{
  const response=await app.request(origin+'/api/v1/records/archive'+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.ok(response.ok,'archive lifecycle '+response.status);return response;
 },{observations:[] as {operation:string;milliseconds:number;status:number}[]});
 const archive=await httpArchive(archiveRequest),archived=JSON.stringify(archive);
 for(const value of [old,oldTag,newAddress,newTag,finalAddress,finalTag,confirmation,confirmationLink]){
  assert.ok(!retained.includes(value),'private Capture material is absent from retained MCP and native audit');
  assert.ok(!archived.includes(value),'private Capture material is absent from the exported archive');
  assert.ok(!(await readFile('docs/AGENT-DOOR.md','utf8')).includes(value),'the published guide contains no private material');
 }
 assert.ok(archive.parts.flatMap(part=>part.records).some(record=>record.table==='signals'&&JSON.stringify(record.row).includes('Synthetic buyer evidence')),'the archive retains actual captured evidence');
 console.log(JSON.stringify({proof:'SURFACE-006.private-address-rotation',autonomous:true,heldNamedPerson:true,noEarlyMutation:true,securityBlocked:true,oneRotationOnReplay:true,staleRefused:true,revokedRefused:true,selectedScopeRefused:true,transactionFence:true,oldTagRejected:true,newTagSignedIntake:true,evidencePreserved:true,privateMaterialRetained:false,contact:contact.id}));
}
