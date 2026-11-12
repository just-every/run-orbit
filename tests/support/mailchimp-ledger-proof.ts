import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {createApp} from './app';
import {createDependencies} from './dependencies';
import {launchFixture} from './launch-fixture';
import {emailLinkSignIn} from './email-link';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {localArchiveRoundTrip} from './capture-privacy-archive';
import {isolatedDatabase} from './isolated-database';
import {readCurrentArchive} from './current-archive';

/** The only replaced boundary is Mailchimp HTTP, including its synchronous address validation. */
export function mailchimpLedgerEdge(fallback:typeof fetch){
 const members=new Map<string,any>(),calls:{method:string;path:string;query:string;body?:any}[]=[],faults=new Map<string,number>(),hooks=new Map<string,{list:string;url:string}>();
 const md5=(email:string)=>createHash('md5').update(email.trim().toLowerCase()).digest('hex');
 let sequence=0;
 const edge={members,calls,faults,hooks,md5,validate:undefined as undefined|((url:string)=>Promise<Response>),validationEnabled:true,pingStatus:200,
  fetch:(async(input,init)=>{
   const url=new URL(String(input));if(url.origin!=='https://us1.api.mailchimp.com')return fallback(input,init);
   const path=url.pathname.replace(/^\/3\.0/,''),method=init?.method??'GET',body=init?.body?JSON.parse(String(init.body)):undefined;calls.push({method,path,query:url.search,body});
   if(path==='/ping')return edge.pingStatus===200?Response.json({health_status:'ok'}):Response.json({title:'Invalid API Key'},{status:edge.pingStatus});
   if(path==='/lists')return Response.json({lists:[{id:'synthlist1',name:'Synthetic consent audience',web_id:4242}]});
   const list=/^\/lists\/(synthlist[12])$/.exec(path)?.[1];if(list)return Response.json({id:list,name:'Synthetic consent audience',web_id:list==='synthlist1'?4242:4243});
   if(/^\/lists\/synthlist[12]\/merge-fields$/.test(path))return Response.json(method==='POST'?{tag:'ORBITCONS'}:{merge_fields:[{tag:'FNAME'},{tag:'LNAME'},{tag:'PHONE'}]});
   const registration=/^\/lists\/(synthlist[12])\/webhooks$/.exec(path);
   if(registration&&method==='POST'){
    assert.equal(new URL(body.url).protocol,'https:');assert.deepEqual(body.sources,{user:true,admin:true,api:true});assert.equal(body.events.unsubscribe,true);assert.equal(body.events.cleaned,true);
    if(edge.validationEnabled){assert.ok(edge.validate,'A validation callback must reach Orbit');const response=await edge.validate(body.url);assert.equal(response.status,200,'Mailchimp GET validates the exact registered address');}
    const id=`hook${++sequence}`;hooks.set(id,{list:registration[1]!,url:body.url});return Response.json({id});
   }
   const hook=/^\/lists\/(synthlist[12])\/webhooks\/([a-z0-9]+)$/.exec(path);
   if(hook&&method==='DELETE')return hooks.delete(hook[2]!)?new Response(null,{status:204}):Response.json({title:'Resource Not Found'},{status:404});
   if(/^\/lists\/synthlist[12]\/members$/.test(path)&&method==='GET'){
    const since=url.searchParams.get('since_last_changed'),rows=[...members.values()].filter(member=>!since||member.last_changed>=since),offset=Number(url.searchParams.get('offset')??0),count=Number(url.searchParams.get('count')??100);
    assert.ok(count<=100&&offset>=0,'Changed-member reads are bounded pages');return Response.json({members:rows.slice(offset,offset+count),total_items:rows.length});
   }
   const removed=/^\/lists\/synthlist[12]\/members\/([a-f0-9]{32})\/actions\/delete-permanent$/.exec(path)?.[1],fault=removed?faults.get(removed):undefined;
   if(removed&&method==='POST'){faults.delete(removed);if(fault===0)throw new TypeError('Synthetic Mailchimp lost acknowledgement');if(fault)return Response.json({title:'Invalid Resource'},{status:fault});return members.delete(removed)?new Response(null,{status:204}):Response.json({title:'Resource Not Found'},{status:404});}
   const hash=/^\/lists\/synthlist[12]\/members\/([a-f0-9]{32})$/.exec(path)?.[1],member=hash?members.get(hash):undefined;
   if(hash&&method==='PUT'){const next={id:hash,email_address:body.email_address,unique_email_id:'u'+hash.slice(0,9),status:body.status??member?.status??body.status_if_new,merge_fields:{...member?.merge_fields,...body.merge_fields},last_changed:new Date().toISOString()};members.set(hash,next);return Response.json(next);}
   if(hash&&member&&method==='PATCH'){member.status=body.status;member.last_changed=new Date().toISOString();return Response.json(member);}
   return member?Response.json(member):Response.json({title:'Resource Not Found'},{status:404});
  }) as typeof fetch};
 return edge;
}

/** Native consent, merge, custody and authority proof folded into the retained suppression registration. */
export async function proveMailchimpLedger(){
 const f=await launchFixture(),nativeFetch=globalThis.fetch,edge=mailchimpLedgerEdge(nativeFetch),security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')})!,origin='https://orbit.example.com',apiKey='synthetic-orbit-ledger-us1';
 globalThis.fetch=edge.fetch;
 try{
  await f.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(f.actor).run();
  const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,captureOrigin:origin});edge.validate=url=>app.request(url);
  const client=async(actor:string,cookie?:string)=>{const token=cookie??`__Host-orbit_session=${(await createDependencies(f.db).auth.createSession(actor)).token}`;
   const call=(path:string,method='GET',body?:unknown)=>app.request(path.startsWith('/')?`${origin}${path}`:`${origin}/api/v1/${path}`,{method,headers:{Cookie:token,Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
   const json=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await call(path,method,body);assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};return {call,json};};
  const owner=await client(f.actor),{json,call}=owner,products=async()=>(await json('settings/products')).products.find((item:any)=>item.products.includes('Mailchimp'));
  edge.validationEnabled=false;
  await json('settings/mailchimp/connect','POST',{apiKey});await json('settings/mailchimp/audience','PUT',{audienceId:'synthlist1'});
  assert.equal((await json('settings/mailchimp')).state,'unresolved-setup');assert.equal((await products()).state,'unresolved-setup');
  const quiet=edge.calls.length;
  assert.equal((await call('marketing/mailchimp/preview')).status,409);assert.equal((await call('marketing/mailchimp/handoffs','POST',{fields:[],previewDigest:'0'.repeat(64),operationId:crypto.randomUUID()})).status,409);assert.equal(edge.calls.length,quiet,'Unverified setup refuses preview and handoff before provider access');
  edge.validationEnabled=true;await json('settings/mailchimp/check','POST',{});assert.equal((await products()).state,'connected');assert.equal(edge.hooks.size,1,'Checking replaces the unverified registration');
  const create=async(label:string)=>{const contact=await json('records/contact','POST',{name:'Synthetic merged customer',email:[`synthetic-orbit-${label}`,'example.test'].join('@')},201);return contact.id as string;};
  const consent=async(id:string)=>json(`marketing/mailchimp/consents/${id}`,'POST',{source:'Synthetic explicit signup',basis:'Product news agreed at the signup',confirmed:true});
  const sync=async()=>{const view=await json('marketing/mailchimp/preview?fields=name');return json('marketing/mailchimp/handoffs','POST',{fields:view.fields,previewDigest:view.digest,operationId:crypto.randomUUID()});};
  const ledger=async(db:D1Database)=>(await db.prepare("SELECT * FROM audit_entries WHERE action IN('marketing.consent-recorded','marketing.consent-withdrawn','mailchimp.member','mailchimp.deletion-requested','mailchimp.deletion') ORDER BY id").all()).results;
  // A full operator reads status without the private address, but every administration verb is owner-only.
  const operator=await json('settings/operators','POST',{email:['synthetic-orbit-operator','example.test'].join('@'),displayName:'Synthetic full operator'},201),nonowner=await client(operator.id);
  assert.equal((await nonowner.json('settings/mailchimp')).webhookUrl,null);
  const fullLedger=await ledger(f.db),fullCalls=edge.calls.length,source=await f.db.prepare("SELECT * FROM signal_sources WHERE id='mailchimp'").first();
  for(const [path,method,body] of [['connect','POST',{apiKey}],['check','POST',{}],['audiences','GET',undefined],['audience','PUT',{audienceId:'synthlist2'}],['disconnect','POST',{}],[`deletions/${f.actor}/retry`,'POST',{}]] as const)assert.equal((await nonowner.call('settings/mailchimp/'+path,method,body)).status,403,path);
  assert.deepEqual(await ledger(f.db),fullLedger);assert.deepEqual(await f.db.prepare("SELECT * FROM signal_sources WHERE id='mailchimp'").first(),source);assert.equal(edge.calls.length,fullCalls);
  const invitation=await json('/api/v2/access/workspaces/workspace/invitations','POST',{email:['synthetic-orbit-ledger-guest','example.test'].join('@'),role:'guest',expiresAt:new Date(Date.now()+86400000).toISOString()}),viewer=await emailLinkSignIn(f.db,['synthetic-orbit-ledger-guest','example.test'].join('@')),guest=await client(viewer.operator.operatorId,viewer.cookie);
  await guest.json('/api/v2/access/invitations/accept','POST',{token:invitation.token});
  const allowed=await create('allowed');await consent(allowed);
  const guestLedger=await ledger(f.db),guestCalls=edge.calls.length;
  for(const [path,method,body] of [['preview','GET',undefined],['handoffs','POST',{fields:[],previewDigest:'0'.repeat(64),operationId:crypto.randomUUID()}],[`consents/${allowed}`,'POST',{source:'Synthetic signup',basis:'Product news',confirmed:true}],[`consents/${allowed}/withdraw`,'POST',{confirmed:true}]] as const)assert.equal((await guest.call('marketing/mailchimp/'+path,method,body)).status,403,path);
  assert.deepEqual(await ledger(f.db),guestLedger);assert.equal(edge.calls.length,guestCalls,'Collaborator refusals write no ledger and request no provider');
  // Consent from the retired contact is sufficient; either participant's withdrawal or stop wins.
  for(const mode of ['consent','withdraw-survivor','withdraw-retired','stop-survivor','stop-retired','unsubscribed-survivor','unsubscribed-retired','cleaned-survivor','cleaned-retired']){
   const survivor=await create(`${mode}-a`),retired=await create(`${mode}-b`);await consent(retired);if(mode!=='consent')await consent(survivor);await sync();
   const duplicate=(await json('records/contact/duplicates')).groups.flat(),a=duplicate.find((item:any)=>item.id===survivor),b=duplicate.find((item:any)=>item.id===retired),selected=mode.endsWith('survivor')?survivor:retired;
   if(mode.startsWith('withdraw'))await json(`marketing/mailchimp/consents/${selected}/withdraw`,'POST',{confirmed:true});
   if(mode.startsWith('stop'))await json(`records/contact/${selected}`,'PUT',{name:'Synthetic merged customer',contactability:'do_not_contact'});
   if(mode.startsWith('unsubscribed')||mode.startsWith('cleaned')){
    const status=mode.split('-')[0]!,email=selected===survivor?a.email:b.email;edge.members.get(edge.md5(email)).status=status;
    // Reconcile provider changes before merging; this follows the existing Mailchimp stop path.
    await sync();assert.equal((await json(`records/contact/${selected}`)).record.contactability,'do_not_contact');
   }
   const prior=(await ledger(f.db)).filter(row=>row.entity_id===retired);
   await json('records/contact/merge','POST',{survivorId:survivor,retiredId:retired,choices:{email:'survivor'},reviewed:{survivor:a.mergeReviewToken,retired:b.mergeReviewToken},confirmed:true});
   const after=await ledger(f.db);for(const row of prior)assert.deepEqual(after.find(item=>item.id===row.id),{...row,entity_id:survivor},'Merge retains original consent and member provenance');
   const view=await json('marketing/mailchimp/preview?fields=name');assert.ok(view.groups[mode==='consent'?'subscribed':'stopped'].some((item:any)=>item.contactId===survivor),'The survivor inherits consent or the stricter stop rather than becoming unknown');
   await sync();assert.equal(edge.members.get(edge.md5(b.email)).status,mode==='cleaned-retired'?'cleaned':'unsubscribed','A merged person never stays two subscribed members, and a cleaned member keeps its stricter state');
   if(mode==='consent'){
    assert.equal(edge.members.get(edge.md5(a.email)).status,'subscribed');await json(`records/contact/${survivor}`,'PUT',{name:'Synthetic merged customer',contactability:'do_not_contact'});await sync();assert.equal(edge.members.get(edge.md5(a.email)).status,'unsubscribed');
   }
   const removals=edge.calls.length;await json(`records/contact/${survivor}`,'DELETE',{confirmed:true});
   for(const email of [a.email,b.email])assert.ok(edge.calls.slice(removals).some(item=>item.path.endsWith(`${edge.md5(email)}/actions/delete-permanent`)),'Erasure requests every linked member');
  }
  // A locally unchanged member can be stopped in Mailchimp without a webhook delivery.
  await sync();const allowedRow=(await json(`records/contact/${allowed}`)).record,member=edge.members.get(edge.md5(allowedRow.email));assert.equal(member.status,'subscribed');
  const schedule=await f.records.save('opportunity',{title:'Synthetic stopped newsletter',stage_id:f.stage,value_cents:0,contact_ids:[allowed],primary_contact_id:allowed},f.actor),message=await f.message(allowed,schedule.id);
  const localPreview=await json('marketing/mailchimp/preview?fields=name');assert.ok(localPreview.groups.subscribed.some((item:any)=>item.contactId===allowed&&item.action==='unchanged'));
  member.status='cleaned';member.last_changed=new Date().toISOString();const beforeReconcile=edge.calls.length;
  await json('marketing/mailchimp/handoffs','POST',{fields:localPreview.fields,previewDigest:localPreview.digest,operationId:crypto.randomUUID()});
  assert.equal((await json(`records/contact/${allowed}`)).record.contactability,'do_not_contact');assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(message.id).first('state'),'cancelled');
  assert.ok(edge.calls.slice(beforeReconcile).some(item=>item.method==='GET'&&item.query.includes('since_last_changed=')));assert.ok(edge.calls.slice(beforeReconcile).every(item=>item.method==='GET'),'A newly cleaned unchanged member is stopped without any subscribing write');
  // Populate both archives with given consent, member history and an unfinished deletion.
  const retained=await create('retained');await consent(retained);await sync();const pending=await create('pending');await consent(pending);await sync();const pendingRow=(await json(`records/contact/${pending}`)).record;edge.faults.set(edge.md5(pendingRow.email),0);await json(`records/contact/${pending}`,'DELETE',{confirmed:true});
  const pendingId=(await json('settings/mailchimp')).deletions.find((item:any)=>item.state==='uncertain').id;
  const beforeRestore=await json('marketing/mailchimp/preview?fields=name'),originalLedger=await ledger(f.db),webhook=(await json('settings/mailchimp')).webhookUrl;
  let job=await json('records/archive/exports','POST',{},201);while(job.state==='preparing')job=await json(`records/archive/exports/${job.id}/advance`,'POST',{});
  const archive=await readCurrentArchive(await call(`records/archive/exports/${job.id}/download`)),serialized=JSON.stringify(archive);assert.ok(!serialized.includes(apiKey)&&!serialized.includes(new URL(webhook).pathname.split('/').pop()!),'Records archive carries neither key nor token');
  const target=await launchFixture(),local=await isolatedDatabase();try{
   const targetApp=createApp({database:target.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:randomBytes(32).toString('hex')}),captureOrigin:origin});
   let targetCookie=`__Host-orbit_session=${(await createDependencies(target.db).auth.createSession(target.actor)).token}`;
   const restored=async(path:string,method='GET',body?:unknown,status=200)=>{const response=await targetApp.request(origin+'/api/v1/'+path,{method,headers:{Cookie:targetCookie,Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(response.status,status,await response.clone().text());return response.json() as Promise<any>;};
   let imported=await restored('records/archive/imports','POST',{manifest:archive.manifest,confirmed:true},201);for(const part of archive.parts)await restored(`records/archive/imports/${imported.id}/parts/${part.index}`,'PUT',part);for(let step=0;step<1000&&imported.state!=='complete';step++)imported=await restored(`records/archive/imports/${imported.id}/finalize`,'POST',{});assert.equal(imported.state,'complete');
   assert.deepEqual(await ledger(target.db),originalLedger,'Records restore reproduces the populated marketing ledger exactly');
   await localArchiveRoundTrip(f.db,local.db);assert.deepEqual(await ledger(local.db),originalLedger,'CLI restore reproduces the same complete ledger');
   await target.db.batch([target.db.prepare('UPDATE operators SET setup_owner=0 WHERE setup_owner=1'),target.db.prepare('UPDATE operators SET setup_owner=1 WHERE id=?').bind(target.actor)]);targetCookie=`__Host-orbit_session=${(await createDependencies(target.db).auth.createSession(target.actor)).token}`;
   assert.equal((await restored('settings/mailchimp')).state,'unresolved-setup');assert.equal((await restored('settings/mailchimp')).deletions.find((item:any)=>item.id===pendingId).state,'paused');
   edge.validate=url=>targetApp.request(url);await restored('settings/mailchimp/connect','POST',{apiKey});await restored('settings/mailchimp/audience','PUT',{audienceId:'synthlist1'});
   const afterRestore=await restored('marketing/mailchimp/preview?fields=name');assert.deepEqual(afterRestore.groups,beforeRestore.groups,'Reconnected and verified restore previews the same groups and actions');
   const writes=edge.calls.length;await restored('marketing/mailchimp/handoffs','POST',{fields:afterRestore.fields,previewDigest:afterRestore.digest,operationId:crypto.randomUUID()});assert.ok(edge.calls.slice(writes).every(item=>item.method==='GET'),'Restored unchanged members cause no provider write');
   assert.equal((await restored('settings/mailchimp')).deletions.find((item:any)=>item.id===pendingId).state,'held');
  }finally{await target.dispose();await local.dispose();edge.validate=url=>app.request(url);}
  await json('settings/mailchimp/audience','PUT',{audienceId:'synthlist2'});assert.equal([...edge.hooks.values()].filter(item=>item.list==='synthlist1').length,1,'Only the independently restored installation retains its own audience registration');
  const active=(await json('settings/mailchimp')).webhookUrl;await json('settings/mailchimp/disconnect','POST',{});assert.ok(![...edge.hooks.values()].some(item=>item.url===active),'Disconnect removes this installation’s current webhook');
  // A private origin retains an explicit public HTTPS setup step without registering a webhook.
  const privateApp=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,captureOrigin:'https://127.0.0.1:8787'}),token=(await createDependencies(f.db).auth.createSession(f.actor)).token;
  const privateCall=async(path:string,method='GET',body?:unknown)=>privateApp.request('https://127.0.0.1:8787/api/v1/'+path,{method,headers:{Cookie:`__Host-orbit_session=${token}`,Origin:'https://127.0.0.1:8787','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal((await privateCall('settings/mailchimp/connect','POST',{apiKey})).status,200);const privateStart=edge.calls.length;assert.equal((await privateCall('settings/mailchimp/audience','PUT',{audienceId:'synthlist1'})).status,200);const privateStatus=await(await privateCall('settings/mailchimp')).json() as any;assert.equal(privateStatus.state,'unresolved-setup');assert.match(privateStatus.reason,/public HTTPS/);assert.ok(!edge.calls.slice(privateStart).some(item=>item.path.endsWith('/webhooks')));
 }finally{globalThis.fetch=nativeFetch;await f.dispose();}
}
