import {createOutboundMail} from '../../src/core/platform/outbound-mail';
import {createId} from '../../src/core/shared/ids';
import {exported} from './capture-data-archive';
import {launchFixture} from './launch-fixture';
import {localArchiveRoundTrip} from './capture-privacy-archive';
import {isolatedDatabase} from './isolated-database';
import {createApp} from './app';
import assert from 'node:assert/strict';
import {providerFixture} from './capture-provider-fixture';
import {captureFixtureSecurity as security} from './capture-provider-fixture';
import {scopes,sendScopes,type Provider} from '../../src/core/features/capture/providers/config';
import {OutreachService} from '../../src/core/features/outreach/service';
import {mailboxTransportResolver} from '../../src/core/features/outreach/mailbox/transport';
import {recordMailDatabase} from '../../src/core/features/outreach/record-mail-storage';
import {foldArchiveCatalog} from '../../src/core/features/records/archive-fold-catalog';
/** Native OAuth, saved review, provider transport, capture and timers; only provider HTTP is replaced. */
export async function mailboxSendProof(provider:Provider){
 const f=await providerFixture(provider);try{
  const origin='https://orbit.test',headers={cookie:f.cookie,origin,'content-type':'application/json'};
  const request=(path:string,body?:unknown)=>f.app.request(origin+'/api/v1/workbench'+path,{method:body===undefined?'GET':'POST',headers,...body===undefined?{}:{body:JSON.stringify(body)}});
  const first=await f.connect(),base=scopes[provider].join(' ');
  assert.equal((await request('/drafts/'+f.unsentDraft+'/approval-preview?mailboxSourceId='+first)).status,409,'Read-only capture cannot authorize sending.');
  const forbidden=await f.request('/oauth/'+provider+'/start',{sourceId:first,name:'Synthetic Orbit mailbox',clientId:'synthetic-orbit-1',clientSecret:'synthetic-orbit-2',sendConsent:true});
  if(provider==='microsoft'){
   assert.equal(forbidden.status,409);assert.match(await forbidden.text(),/Mail.ReadWrite/);
   f.state.scope=base+' '+sendScopes[provider];
   const unsolicited=await f.callback(await f.start(first));assert.match(unsolicited.headers.get('location')!,/error=/);
   assert.equal(await f.db.prepare('SELECT count(*) n FROM mailbox_send_authorizations').first('n'),0);
   assert.equal(f.state.mailSubmissions.length,0);return;
  }
  assert.equal(forbidden.status,200);
  // Missing grant changes neither the read credential nor send authority.
  const missing=new URL((await forbidden.json() as any).authorizationUrl);f.state.challenge=missing.searchParams.get('code_challenge')!;
  assert.match((await f.callback(missing)).headers.get('location')!,/error=/);
  assert.equal(await f.db.prepare('SELECT count(*) n FROM mailbox_send_authorizations').first('n'),0);
  f.state.scope=base+' https://www.googleapis.com/auth/calendar.events';
  const calendar=await f.callback(await f.start(first,f.cookie,true));assert.match(calendar.headers.get('location')!,/connected=/);
  assert.equal((await request('/drafts/'+f.unsentDraft+'/approval-preview?mailboxSourceId='+first)).status,409,'Calendar write permission cannot send mail.');
  f.state.scope=base+' '+sendScopes.google;
  assert.match((await f.callback(await f.start(first))).headers.get('location')!,/error=/,'unsolicited scope is refused');
  async function authorize(source:string){const flow=await f.start(source,f.cookie,false,true);assert.deepEqual(flow.searchParams.get('scope')!.split(/\s+/).sort(),[...scopes.google,sendScopes.google].sort());assert.match((await f.callback(flow)).headers.get('location')!,/connected=/);return source;}
  const source=await authorize(first),address=f.state.mailboxAddress;
  const initialMailboxes=await request('/mailboxes');assert.equal(initialMailboxes.status,200);assert.equal((await initialMailboxes.json() as any).mailboxes.length,1);
  assert.equal((await (await f.request('/sources/'+source+'/send-authorization')).json() as any).authorization.address,address);
  const peerId=createId();await f.deps.auth.ensureOperator({id:peerId,email:['synthetic-orbit-peer','example.test'].join(String.fromCharCode(64)),displayName:'Another operator'});
  const peerSession=await f.deps.auth.createSession(peerId),peerHeaders={...headers,cookie:'__Host-orbit_session='+peerSession.token};
  const peerMailboxes=await f.app.request(origin+'/api/v1/workbench/mailboxes',{headers:peerHeaders});assert.equal(peerMailboxes.status,200);assert.equal((await peerMailboxes.json() as any).mailboxes.length,0);
  const peerReview=await f.app.request(origin+'/api/v1/workbench/drafts/'+f.unsentDraft+'/approval-preview?mailboxSourceId='+source,{headers:peerHeaders});assert.equal(peerReview.status,409);assert.equal(f.state.mailSubmissions.length,0);

  const libraryCall=async(path:string,body:unknown,method='POST')=>{const response=await f.app.request(origin+'/api/v1/library'+path,{method,headers,body:JSON.stringify(body)});assert.ok(response.ok,await response.clone().text());return response.json() as Promise<any>;};
  const signature=await libraryCall('',{kind:'signature',name:'Synthetic Orbit sender signature',body:'Synthetic signature.',visibility:'private'});
  async function draft(kind:'contact'|'company'|'opportunity'='contact'){
   const recordId=kind==='contact'?f.ana:kind==='company'?f.company:f.opportunity;
   const response=await request('/records/'+kind+'/'+recordId+'/drafts',{contactId:f.ana,opportunityId:f.opportunity,subject:'Synthetic Orbit résumé 🚀 '.repeat(4).trim(),body:'Exact reviewed body.'});
   assert.equal(response.status,201,await response.clone().text());const id=(await response.json() as any).id as string;
   const render=await libraryCall('/drafts/'+id+'/apply',{revision:1,signatureId:signature.id});await libraryCall('/drafts/'+id+'/render',{revision:render.revision,reviewHash:render.reviewHash});return id;
  }
  const preview=async(id:string,selected=source)=>{const response=await request('/drafts/'+id+'/approval-preview?mailboxSourceId='+selected);assert.equal(response.status,200,await response.clone().text());const value=await response.json() as any,draftResponse=await f.app.request(origin+'/api/v1/drafts/'+id,{headers});assert.equal(draftResponse.status,200);return {...value,revision:(await draftResponse.json() as any).draft.revision};};
  const approve=async(id:string,review:any,extra:Record<string,unknown>={})=>request('/drafts/'+id+'/approve',{revision:review.revision,mailboxSourceId:review.mailbox.sourceId,mailboxReviewHash:review.mailboxReviewHash,quietHoursConfirmation:review.localTime,...extra});
  const one=await draft('company');let review=await preview(one);
  assert.equal(review.mailbox.address,address);assert.equal(f.state.mailSubmissions.length,0,'review never submits');
  const bad=await approve(one,{...review,mailboxReviewHash:'0'.repeat(64)});assert.equal(bad.status,409);assert.equal(f.state.mailSubmissions.length,0);
  await authorize(source);assert.equal((await approve(one,review)).status,409,'A reauthorized mailbox invalidates its previous send-as review.');review=await preview(one);
  const concurrent=await Promise.all([approve(one,review),approve(one,review)]);assert.deepEqual(concurrent.map(response=>response.status).sort(),[200,409]);
  const submitted=concurrent.find(response=>response.status===200)!;assert.equal(submitted.status,200,await submitted.clone().text());const accepted=await submitted.json() as any;
  assert.equal(accepted.state,'accepted');assert.equal(f.state.mailSubmissions.length,1);
  const saved=await f.db.prepare('SELECT * FROM record_mail_outbound_messages WHERE id=?').bind(accepted.id).first<any>();
  assert.equal(saved.mailbox_address,address);assert.ok(saved.provider_message_id);assert.ok(saved.provider_thread_id);
  const raw=f.state.mailSubmissions[0]!.raw;assert.ok(raw.includes('From: '+address+'\r\n'));assert.ok(raw.includes('Message-ID: '+saved.message_id+'\r\n'));assert.equal(Buffer.from(raw.split('\r\n\r\n')[1]!,'base64').toString(),saved.body);assert.equal(saved.body,'Exact reviewed body.\n\nSynthetic signature.');
  const wireSubject=raw.match(/Subject: ((?:[^\r]|\r\n )+)\r\nMessage-ID:/)![1]!,decodedSubject=[...wireSubject.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map(match=>Buffer.from(match[1]!,'base64').toString()).join('');assert.equal(decodedSubject,saved.subject);
  await libraryCall('/'+signature.id,{kind:'signature',name:'Synthetic Orbit sender signature',body:'Updated signature.',visibility:'private',revision:1},'PUT');
  assert.equal((await f.db.prepare('SELECT body FROM record_mail_outbound_messages WHERE id=?').bind(accepted.id).first('body')),saved.body);assert.ok(!raw.includes('List-Unsubscribe:'));
  assert.equal((await approve(one,review)).status,409);assert.equal(f.state.mailSubmissions.length,1);
  // A genuine reply arrives through the unchanged connected capture pipeline and threads once.
  await f.request('/sources/'+source+'/scope',{mail:{folders:['INBOX','SENT']}});
  f.state.total=0;f.state.incremental=true;f.state.incrementalIds=['synthetic-orbit-reply',saved.provider_message_id];f.state.mailHeaders['synthetic-orbit-reply']={'In-Reply-To':saved.message_id,References:saved.message_id};
  await f.drain(source);await f.drain(source);
  const replies=await f.db.prepare("SELECT s.id FROM signals s WHERE s.source_id=? AND s.type='email.replied'").bind(source).all<any>();assert.equal(replies.results.length,1);
  // Capture keeps its normalized event; contact and deal evidence links are visible through Records.
  const contact=await f.contact();assert.ok(JSON.stringify(contact).includes('synthetic-orbit-reply'));
  for(const [kind,id]of [['contact',f.ana],['company',f.company],['opportunity',f.opportunity]]){const response=await f.app.request(origin+'/api/v1/records/'+kind+'/'+id,{headers});assert.equal(response.status,200);const record=await response.json() as any;assert.equal(record.timeline.filter((entry:any)=>entry.id===replies.results[0].id).length,1,'The same genuine reply appears once on each permitted record.');}
  assert.equal(await f.db.prepare("SELECT count(*) n FROM signals WHERE source_id=? AND type='email.sent'").bind(source).first('n'),1,'The mailbox Sent copy is not a customer reply.');
  assert.equal(f.state.mailSubmissions.length,1);
  // New review binds the current scope connection. Revocation before dispatch has no fallback.
  const scheduled=await draft('opportunity'),scheduleReview=await preview(scheduled),future=new Date(Date.now()+86400000).toISOString();
  const scheduledResponse=await approve(scheduled,scheduleReview,{scheduledAt:future});assert.equal(scheduledResponse.status,200);const schedule=await scheduledResponse.json() as any;
  assert.equal((await f.request('/sources/'+source+'/revoke-send',{})).status,200);
  const mail=mailboxTransportResolver(f.db,undefined,{security,origin,fetcher:f.fetcher})!,service=new OutreachService(recordMailDatabase(f.db),mail);
  await service.dispatchDue(new Date(schedule.scheduledAt));
  assert.equal(await f.db.prepare('SELECT state FROM record_mail_outbound_messages WHERE id=?').bind(schedule.id).first('state'),'failed');assert.equal(f.state.mailSubmissions.length,1);
  await authorize(source);
  // A missing encryption capability cannot switch an already bound scheduled send to installation mail.
  const noKeyDraft=await draft(),noKeyPreview=await preview(noKeyDraft),noKeyResponse=await approve(noKeyDraft,noKeyPreview,{scheduledAt:future});assert.equal(noKeyResponse.status,200);const noKey=await noKeyResponse.json() as any;
  let fallback=0;const noKeyTransport=mailboxTransportResolver(f.db,{send:async()=>{fallback++;return{providerMessageId:'synthetic-orbit-unexpected'};}},{origin})!;
  await new OutreachService(recordMailDatabase(f.db),noKeyTransport).dispatchDue(new Date(noKey.scheduledAt));
  assert.equal(fallback,0);assert.equal(await f.db.prepare('SELECT state FROM record_mail_outbound_messages WHERE id=?').bind(noKey.id).first('state'),'failed');
  // Timeout after acceptance remains unknown through a restart and an empty Sent lookup, then settles once.
  const uncertain=await draft(),uncertainReview=await preview(uncertain);f.state.sendTimeout=true;
  const unknownResponse=await approve(uncertain,uncertainReview);assert.equal(unknownResponse.status,502);const unknown=await unknownResponse.json() as any;assert.equal(unknown.state,'delivery-unknown');assert.equal(f.state.mailSubmissions.length,2);
  await f.reopen();f.state.sentHidden=true;
  const recovered=new OutreachService(recordMailDatabase(f.db),mailboxTransportResolver(f.db,undefined,{security,origin,fetcher:f.fetcher})!);
  await recovered.reconcile(new Date(Date.now()+600000));assert.equal(await f.db.prepare('SELECT state FROM record_mail_outbound_messages WHERE id=?').bind(unknown.id).first('state'),'delivery-unknown');assert.equal(f.state.mailSubmissions.length,2);
  f.state.sentHidden=false;await recovered.reconcile(new Date(Date.now()+1200000));await recovered.reconcile(new Date(Date.now()+1800000));
  assert.equal(await f.db.prepare('SELECT state FROM record_mail_outbound_messages WHERE id=?').bind(unknown.id).first('state'),'accepted');assert.equal(f.state.mailSubmissions.length,2);
  assert.equal(await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='message.accepted' AND json_extract(payload_json,'$.messageId')=?").bind(unknown.id).first('n'),1);
  // A readback 429 follows one accepted submission; it never makes that submission retryable.
  const readbackDraft=await draft();f.state.sentRead429=true;const readbackResponse=await approve(readbackDraft,await preview(readbackDraft));assert.equal(readbackResponse.status,502);const readback=await readbackResponse.json() as any;assert.equal(readback.state,'delivery-unknown');const readbackCount=f.state.mailSubmissions.length;
  await recovered.reconcile(new Date(Date.now()+600000));assert.equal(await f.db.prepare('SELECT state FROM record_mail_outbound_messages WHERE id=?').bind(readback.id).first('state'),'accepted');assert.equal(f.state.mailSubmissions.length,readbackCount);
  await f.db.prepare('UPDATE mailbox_send_authorizations SET retry_at=NULL WHERE source_id=?').bind(source).run();
  // Provider deferral belongs only to this mailbox and keeps its exact Retry-After.
  const limited=await draft(),limitedReview=await preview(limited);f.state.send429=true;const at=Date.now();
  const limitedResponse=await approve(limited,limitedReview);const deferred=await limitedResponse.json() as any;assert.equal(deferred.state,'scheduled');
  const retry=await f.db.prepare('SELECT retry_at FROM mailbox_send_authorizations WHERE source_id=?').bind(source).first<string>('retry_at');assert.ok(retry&&Date.parse(retry)>=at+120000);
  const before=f.state.mailSubmissions.length,held=await draft();assert.equal((await (await approve(held,await preview(held))).json() as any).state,'scheduled');assert.equal(f.state.mailSubmissions.length,before);
  // A second mailbox and the installation transport continue during this mailbox's deferral.
  f.state.mailboxAddress=['synthetic-orbit-2','example.test'].join(String.fromCharCode(64));f.state.scope=base;
  const otherSource=await f.connect();f.state.scope=base+' '+sendScopes.google;await authorize(otherSource);
  const otherDraft=await draft(),otherPreview=await preview(otherDraft,otherSource);
  const otherSent=await approve(otherDraft,otherPreview);assert.equal(otherSent.status,200,await otherSent.clone().text());assert.equal(f.state.mailSubmissions.length,before+1);assert.equal(f.state.mailSubmissions.at(-1)!.address,f.state.mailboxAddress);
  let installationSends=0;const installationMail=createOutboundMail({DB:f.db,MAIL_FROM:['synthetic-orbit-installation','example.test'].join(String.fromCharCode(64)),MAIL_REPLY_TO:['synthetic-orbit-replies','example.test'].join(String.fromCharCode(64)),SENDGRID_API_KEY:'synthetic-orbit-1',SENDGRID_UNSUBSCRIBE_GROUP_ID:'1'})!;
  const installationApp=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},sourceSecurity:security,captureOrigin:origin,captureFetch:f.fetcher,outboundMail:installationMail});
  const installationDraft=await draft(),installationPreview=await preview(installationDraft,otherSource),originalFetch=globalThis.fetch;
  try{globalThis.fetch=async(input,init)=>{if(String(input)==='https://api.sendgrid.com/v3/mail/send'){installationSends++;return new Response(null,{status:202,headers:{'x-message-id':'synthetic-orbit-installation'}});}return originalFetch(input,init);};
   const installationResponse=await installationApp.request(origin+'/api/v1/workbench/drafts/'+installationDraft+'/approve',{method:'POST',headers,body:JSON.stringify({revision:installationPreview.revision,quietHoursConfirmation:installationPreview.localTime})});assert.equal(installationResponse.status,200,await installationResponse.clone().text());assert.equal(installationSends,1);
  }finally{globalThis.fetch=originalFetch;}
  // Explicit opt-out uses the bound installation-origin capability, exact headers and visible footer.
  const optDraft=await draft();assert.equal((await request('/drafts/'+optDraft+'/opt-out?mailboxSourceId='+otherSource,{choice:'added'})).status,200);
  const changed=await f.db.prepare('SELECT revision,updated_at,recipient_email,subject,body FROM record_mail_drafts WHERE id=?').bind(optDraft).first<any>();
  const reviewed=await request('/drafts/'+optDraft+'/review',{revision:changed.revision,reviewedUpdatedAt:changed.updated_at,recipientContactId:f.ana,recipientEmail:changed.recipient_email,subject:changed.subject,body:changed.body});assert.equal(reviewed.status,200,await reviewed.clone().text());
  const renderedOptResponse=await f.app.request(origin+'/api/v1/library/drafts/'+optDraft+'/render',{headers});assert.equal(renderedOptResponse.status,200);const renderedOpt=await renderedOptResponse.json() as any;
  await libraryCall('/drafts/'+optDraft+'/render',{revision:renderedOpt.revision,reviewHash:renderedOpt.reviewHash});
  const optPreview=await preview(optDraft,otherSource),optResponse=await approve(optDraft,optPreview,{revision:(await reviewed.json() as any).revision});assert.equal(optResponse.status,200,await optResponse.clone().text());const optMessage=await optResponse.json() as any;
  const capability=await f.db.prepare('SELECT token,origin FROM record_mail_outbound_opt_out_capabilities WHERE message_id=?').bind(optMessage.id).first<any>();assert.ok(capability);
  const optRaw=f.state.mailSubmissions.at(-1)!.raw,url=capability.origin+'/unsubscribe/'+capability.token;
  assert.ok(optRaw.includes('List-Unsubscribe: <'+url+'>'));assert.ok(optRaw.includes('List-Unsubscribe-Post: List-Unsubscribe=One-Click'));
  assert.equal(Buffer.from(optRaw.split('\r\n\r\n')[1]!,'base64').toString(),changed.body+'\n\nUnsubscribe: '+url);
  // The Workbench draft store uses the same Gmail binding and provider Sent readback.
  const workbenchDraftResponse=await request('/opportunities/'+f.opportunity+'/drafts',{contactId:f.ana,subject:'Workbench mailbox review',body:'Workbench exact approved bytes'});assert.equal(workbenchDraftResponse.status,201);
  const workbenchDraft=(await workbenchDraftResponse.json() as any).id,workbenchResponse=await approve(workbenchDraft,await preview(workbenchDraft,otherSource));assert.equal(workbenchResponse.status,200,await workbenchResponse.clone().text());const workbenchMessage=await workbenchResponse.json() as any;
  const workbenchSaved=await f.db.prepare('SELECT mailbox_address,provider_thread_id FROM outbound_messages WHERE id=?').bind(workbenchMessage.id).first<any>();assert.equal(workbenchSaved.mailbox_address,f.state.mailboxAddress);assert.ok(workbenchSaved.provider_thread_id);
  const heldResponse=await request('/drafts/'+(await draft())+'/approval-preview?mailboxSourceId='+source);assert.equal(heldResponse.status,200);
  // The actual Records export contains history, and no token or reusable send authorization.
  const archive=await exported({...f,request:(path:string,init:RequestInit={})=>f.app.request(origin+path,{...init,headers:{...headers,...init.headers}})},true);
  const serialized=JSON.stringify(archive);assert.ok(!serialized.includes('access-')&&!serialized.includes('refresh-'));assert.ok(!archive.manifest.tables.some((table:any)=>['mailbox_send_authorizations','capture_credentials','capture_oauth'].includes(table.name)));
  const restored=await launchFixture();try{
   const call=async(path:string,method:string,body:unknown)=>{const response=await restored.request(path,method,body);assert.ok(response.ok,await response.clone().text());return response.json() as Promise<any>;};
   let job=await call('records/archive/imports','POST',{confirmed:true,manifest:archive.manifest});for(const part of archive.parts)await call('records/archive/imports/'+job.id+'/parts/'+part.index,'PUT',part);
   for(let i=0;i<700&&job.state!=='complete';i++)job=await call('records/archive/imports/'+job.id+'/finalize','POST',{});
   assert.equal(job.state,'complete');assert.equal(await restored.db.prepare('SELECT count(*) n FROM mailbox_send_authorizations').first('n'),0);assert.equal(await restored.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'),0);
   assert.equal(await restored.db.prepare("SELECT count(*) n FROM record_mail_outbound_messages WHERE state IN('scheduled','queued')").first('n'),0);assert.equal(await restored.db.prepare('SELECT mailbox_address FROM record_mail_outbound_messages WHERE id=?').bind(accepted.id).first('mailbox_address'),address);
  }finally{await restored.dispose();}
  const local=await isolatedDatabase();try{await localArchiveRoundTrip(f.db,local.db);assert.equal(await local.db.prepare('SELECT count(*) n FROM mailbox_send_authorizations').first('n'),0);assert.equal(await local.db.prepare('SELECT count(*) n FROM capture_credentials').first('n'),0);assert.equal(await local.db.prepare("SELECT count(*) n FROM record_mail_outbound_messages WHERE state IN('scheduled','queued')").first('n'),0);}finally{await local.dispose();}
  const catalog=await foldArchiveCatalog(f.db);assert.ok(!catalog.some(table=>table.name==='mailbox_send_authorizations'||table.name==='capture_credentials'));
  const status=await (await f.request('/sources')).text();assert.ok(!status.includes('access-')&&!status.includes('refresh-'));
  // Refreshing a previously authorized token down to read-only withdraws send authority.
  const credentialRow=await f.db.prepare('SELECT ciphertext FROM capture_credentials WHERE source_id=?').bind(otherSource).first<string>('ciphertext');assert.ok(credentialRow);
  const credential=JSON.parse(await security.open(credentialRow));credential.expiresAt=0;
  await f.db.prepare('UPDATE capture_credentials SET ciphertext=? WHERE source_id=?').bind(await security.seal(JSON.stringify(credential)),otherSource).run();f.state.scope=base;
  const lostDraft=await draft(),lostResponse=await approve(lostDraft,await preview(lostDraft,otherSource));assert.equal(lostResponse.status,502);assert.equal((await lostResponse.json() as any).state,'failed');assert.equal(f.state.mailSubmissions.length,before+3);
  assert.equal(await f.db.prepare('SELECT state FROM mailbox_send_authorizations WHERE source_id=?').bind(otherSource).first('state'),'paused');
  // A disconnected source cannot execute its persisted approval or acquire another identity.
  await f.request('/sources/'+source+'/disconnect',{confirmed:true});
  await f.db.prepare("UPDATE record_mail_outbound_messages SET state='queued' WHERE draft_id=?").bind(held).run();
  await recovered.submit((await f.db.prepare('SELECT * FROM record_mail_outbound_messages WHERE draft_id=?').bind(held).first<any>())!);
  assert.equal(f.state.mailSubmissions.length,before+3);
  const publicBefore=await f.db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.ana).first('contactability');assert.equal((await f.app.request(url)).status,200);assert.equal(await f.db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.ana).first('contactability'),publicBefore);
  const optPost=()=>f.app.request(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'List-Unsubscribe=One-Click'});
  assert.equal((await optPost()).status,200);assert.equal((await optPost()).status,200);assert.equal(await f.db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.ana).first('contactability'),'do_not_contact');assert.equal(await f.db.prepare('SELECT contactability FROM contacts WHERE id=?').bind(f.bob).first('contactability'),'contactable');assert.equal(f.state.mailSubmissions.length,before+3);
  const erased=await f.app.request(origin+'/api/v1/records/contact/'+f.ana,{method:'DELETE',headers,body:JSON.stringify({confirmed:true})});assert.equal(erased.status,200);assert.equal((await f.app.request(url)).status,404);
  f.state.scope=base;f.state.mailboxAddress=address;await f.connect(source);await f.request('/sources/'+source+'/scope',{mail:{folders:['INBOX','SENT']}});await f.drain(source);
  assert.equal((await f.app.request(origin+'/api/v1/records/contact/'+f.ana,{headers})).status,404);assert.equal(await f.db.prepare('SELECT count(*) n FROM record_mail_outbound_messages WHERE contact_id=?').bind(f.ana).first('n'),0);
 }finally{await f.dispose();}
}
