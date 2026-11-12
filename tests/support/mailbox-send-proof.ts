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
  f.state.scope=base+' '+sendScopes.google;
  assert.match((await f.callback(await f.start(first))).headers.get('location')!,/error=/,'unsolicited scope is refused');
  async function authorize(source:string){const flow=await f.start(source,f.cookie,false,true);assert.deepEqual(flow.searchParams.get('scope')!.split(/\s+/).sort(),[...scopes.google,sendScopes.google].sort());assert.match((await f.callback(flow)).headers.get('location')!,/connected=/);return source;}
  const source=await authorize(first),address=f.state.mailboxAddress;
  assert.equal((await (await f.request('/sources/'+source+'/send-authorization')).json() as any).authorization.address,address);
  async function draft(kind:'contact'|'company'|'opportunity'='contact'){
   const id=kind==='contact'?f.ana:kind==='company'?f.company:f.opportunity;
   const response=await request('/records/'+kind+'/'+id+'/drafts',{contactId:f.ana,opportunityId:f.opportunity,subject:'Synthetic Orbit reviewed message',body:'Exact reviewed body.\nSynthetic signature.'});
   assert.equal(response.status,201,await response.clone().text());return (await response.json() as any).id as string;
  }
  const preview=async(id:string,selected=source)=>{const response=await request('/drafts/'+id+'/approval-preview?mailboxSourceId='+selected);assert.equal(response.status,200,await response.clone().text());return await response.json() as any;};
  const approve=async(id:string,review:any,extra:Record<string,unknown>={})=>request('/drafts/'+id+'/approve',{revision:1,mailboxSourceId:review.mailbox.sourceId,mailboxReviewHash:review.mailboxReviewHash,quietHoursConfirmation:review.localTime,...extra});
  const one=await draft('company'),review=await preview(one);
  assert.equal(review.mailbox.address,address);assert.equal(f.state.mailSubmissions.length,0,'review never submits');
  const bad=await approve(one,{...review,mailboxReviewHash:'0'.repeat(64)});assert.equal(bad.status,409);assert.equal(f.state.mailSubmissions.length,0);
  const submitted=await approve(one,review);assert.equal(submitted.status,200,await submitted.clone().text());const accepted=await submitted.json() as any;
  assert.equal(accepted.state,'accepted');assert.equal(f.state.mailSubmissions.length,1);
  const saved=await f.db.prepare('SELECT * FROM record_mail_outbound_messages WHERE id=?').bind(accepted.id).first<any>();
  assert.equal(saved.mailbox_address,address);assert.ok(saved.provider_message_id);assert.ok(saved.provider_thread_id);
  const raw=f.state.mailSubmissions[0]!.raw;assert.ok(raw.includes('From: '+address+'\r\n'));assert.ok(raw.includes('Message-ID: '+saved.message_id+'\r\n'));assert.equal(Buffer.from(raw.split('\r\n\r\n')[1]!,'base64').toString(),saved.body);assert.equal(saved.body,'Exact reviewed body.\nSynthetic signature.');assert.ok(!raw.includes('List-Unsubscribe:'));
  assert.equal((await approve(one,review)).status,409);assert.equal(f.state.mailSubmissions.length,1);
  // A genuine reply arrives through the unchanged connected capture pipeline and threads once.
  await f.request('/sources/'+source+'/scope',{mail:{folders:['INBOX','SENT']}});
  f.state.total=0;f.state.incremental=true;f.state.incrementalIds=['synthetic-orbit-reply'];f.state.mailHeaders['synthetic-orbit-reply']={'In-Reply-To':saved.message_id,References:saved.message_id};
  await f.drain(source);await f.drain(source);
  const replies=await f.db.prepare("SELECT s.id FROM signals s WHERE s.source_id=? AND s.type='email.replied'").bind(source).all<any>();assert.equal(replies.results.length,1);
  // Capture keeps its normalized event; contact and deal evidence links are visible through Records.
  const contact=await f.contact();assert.ok(JSON.stringify(contact).includes('synthetic-orbit-reply'));
  assert.equal(f.state.mailSubmissions.length,1);
  // New review binds the current scope connection. Revocation before dispatch has no fallback.
  const scheduled=await draft('opportunity'),scheduleReview=await preview(scheduled),future=new Date(Date.now()+86400000).toISOString();
  const scheduledResponse=await approve(scheduled,scheduleReview,{scheduledAt:future});assert.equal(scheduledResponse.status,200);const schedule=await scheduledResponse.json() as any;
  assert.equal((await f.request('/sources/'+source+'/revoke-send',{})).status,200);
  const mail=mailboxTransportResolver(f.db,undefined,{security,origin,fetcher:f.fetcher})!,service=new OutreachService(recordMailDatabase(f.db),mail);
  await f.db.prepare("UPDATE record_mail_outbound_messages SET state='queued' WHERE id=?").bind(schedule.id).run();
  await service.submit((await f.db.prepare('SELECT * FROM record_mail_outbound_messages WHERE id=?').bind(schedule.id).first<any>())!);
  assert.equal(await f.db.prepare('SELECT state FROM record_mail_outbound_messages WHERE id=?').bind(schedule.id).first('state'),'failed');assert.equal(f.state.mailSubmissions.length,1);
  await authorize(source);
  // Timeout after acceptance remains unknown through a restart and an empty Sent lookup, then settles once.
  const uncertain=await draft(),uncertainReview=await preview(uncertain);f.state.sendTimeout=true;
  const unknownResponse=await approve(uncertain,uncertainReview);assert.equal(unknownResponse.status,502);const unknown=await unknownResponse.json() as any;assert.equal(unknown.state,'delivery-unknown');assert.equal(f.state.mailSubmissions.length,2);
  await f.reopen();f.state.sentHidden=true;
  const recovered=new OutreachService(recordMailDatabase(f.db),mailboxTransportResolver(f.db,undefined,{security,origin,fetcher:f.fetcher})!);
  await recovered.reconcile(new Date(Date.now()+600000));assert.equal(await f.db.prepare('SELECT state FROM record_mail_outbound_messages WHERE id=?').bind(unknown.id).first('state'),'delivery-unknown');assert.equal(f.state.mailSubmissions.length,2);
  f.state.sentHidden=false;await recovered.reconcile(new Date(Date.now()+1200000));await recovered.reconcile(new Date(Date.now()+1800000));
  assert.equal(await f.db.prepare('SELECT state FROM record_mail_outbound_messages WHERE id=?').bind(unknown.id).first('state'),'accepted');assert.equal(f.state.mailSubmissions.length,2);
  assert.equal(await f.db.prepare("SELECT count(*) n FROM timeline_entries WHERE kind='message.accepted' AND json_extract(payload_json,'$.messageId')=?").bind(unknown.id).first('n'),1);
  // Provider deferral belongs only to this mailbox and keeps its exact Retry-After.
  const limited=await draft(),limitedReview=await preview(limited);f.state.send429=true;const at=Date.now();
  const limitedResponse=await approve(limited,limitedReview);const deferred=await limitedResponse.json() as any;assert.equal(deferred.state,'scheduled');
  const retry=await f.db.prepare('SELECT retry_at FROM mailbox_send_authorizations WHERE source_id=?').bind(source).first<string>('retry_at');assert.ok(retry&&Date.parse(retry)>=at+120000);
  const before=f.state.mailSubmissions.length,held=await draft();assert.equal((await (await approve(held,await preview(held))).json() as any).state,'scheduled');assert.equal(f.state.mailSubmissions.length,before);
  const catalog=await foldArchiveCatalog(f.db);assert.ok(!catalog.some(table=>table.name==='mailbox_send_authorizations'||table.name==='capture_credentials'));
  const status=await (await f.request('/sources')).text();assert.ok(!status.includes('access-')&&!status.includes('refresh-'));
  // A disconnected source cannot execute its persisted approval or acquire another identity.
  await f.request('/sources/'+source+'/disconnect',{confirmed:true});
  await f.db.prepare("UPDATE record_mail_outbound_messages SET state='queued' WHERE draft_id=?").bind(held).run();
  await recovered.submit((await f.db.prepare('SELECT * FROM record_mail_outbound_messages WHERE draft_id=?').bind(held).first<any>())!);
  assert.equal(f.state.mailSubmissions.length,before);
 }finally{await f.dispose();}
}
