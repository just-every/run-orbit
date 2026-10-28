import assert from 'node:assert/strict';
import {test} from 'node:test';
import {launchFixture} from '../support/launch-fixture';
import {signedReplies,replyForm} from '../support/signed-reply';
import {createId} from '../../src/core/shared/ids';
import {archiveHash} from '../../src/core/features/records/archive-schema';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';

test('OUT-004 OUT-007 OUT-015 SIGNAL-003 SIGNAL-008 DATA-002 AGENT-002 verified delivery and human replies retain exact authority, honest provenance and replay-safe stop effects',async()=>{
 const f=await launchFixture();try{
  const a=await f.customer(),b=await f.customer(),sent=await f.message(a.contactId,a.opportunityId,'queued'),scheduled=await f.message(a.contactId,a.opportunityId),post=signedReplies(f.db);
  const foreign='visitor@elsewhere.test';
  const snapshot=async()=>archiveHash(await Promise.all(['signals','signal_links','timeline_entries','drafts','outbound_messages','opportunities','unlinked_replies','mail_provider_events'].map(async table=>(await f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results)));
  const before=await snapshot();
  const cases:[string,string[]][]=[
   [a.email,[foreign]],[foreign,[a.email]],[a.email,[b.email]],
   [a.email,[a.email,foreign]],[a.email,[foreign,a.email]],
   [foreign,[a.email,foreign]],[a.email,[a.email,a.email]],
   [a.email,[`${a.email}, ${foreign}`]],[a.email,[`<${foreign}>, <${a.email}>`]],
   [a.email,['']],[a.email,[`"Unclosed <${a.email}>`]],
  ];
  for(const [index,[sender,rawSenders]] of cases.entries()){const inline=index%2===0;
   const form=replyForm(sender,`<${createId()}@reply.test>`,sent.messageId);
   const lines=rawSenders.map((raw,i)=>`${i%2?'fRoM':'From'}: ${raw}`);
   if(inline)form.set('headers',`${form.get('headers')}\r\n${lines.join('\r\n')}`);
   else for(const line of lines)form.append('headers',line);
   assert.equal((await post(form)).status,400,'Ambiguous signed sender authority is rejected');
   assert.equal(await snapshot(),before,'No receipt or business effect from rejected sender authority');
  }
  for(const line of [`From : ${foreign}`,`From\t: ${foreign}`,`From ${foreign}`,` From: ${foreign}`,`From\u0000: ${foreign}`]){
   const form=replyForm(a.email,`<${createId()}@reply.test>`,sent.messageId);form.append('headers',line);
   assert.equal((await post(form)).status,400,'Malformed raw sender authority cannot be treated as absent');
   assert.equal(await snapshot(),before);
  }
  for(const extra of ['from','Message-ID','Date']){
   const form=replyForm(a.email,`<${createId()}@reply.test>`,sent.messageId);
   if(extra==='from')form.append('from',a.email);else form.append('headers',`${extra}: ${extra==='Date'?'Thu, 08 Oct 2026 06:00:00 GMT':'<extra@reply.test>'}`);
   assert.equal((await post(form)).status,400);assert.equal(await snapshot(),before);
  }
  const company=await f.records.save('company',{name:'Reply customer account'},f.actor);
  await f.db.prepare('UPDATE opportunities SET company_id=? WHERE id=?').bind(company.id,a.opportunityId).run();
  const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),eventApp=createMailEventRoutes(f.db,{eventKey:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')});
  const eventTime=Math.floor(Date.now()/1000)-60;
  const event=(kind:string)=>({sg_event_id:createId(),event:kind,timestamp:eventTime,email:a.email,rer_product:'orbit',rer_delivery_id:sent.id,sg_message_id:'provider-receipt'});
  async function report(item:ReturnType<typeof event>,verified=true){
   const raw=Buffer.from(JSON.stringify([item])),timestamp=String(Math.floor(Date.now()/1000));
   return eventApp.request('https://orbit.test/sendgrid',{method:'POST',headers:{'X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':verified?sign('sha256',Buffer.concat([Buffer.from(timestamp),raw]),keys.privateKey).toString('base64'):'invalid'},body:raw});
  }
  const processed=event('processed');assert.equal((await report(processed,false)).status,401);
  await f.db.prepare("CREATE TRIGGER test_delivery_failure BEFORE INSERT ON timeline_entries WHEN NEW.kind='provider.processed' BEGIN SELECT RAISE(ABORT,'Injected delivery persistence failure'); END").run();
  assert.equal((await report(processed)).status,503);assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(sent.id).first('state'),'queued');assert.equal(await f.db.prepare('SELECT id FROM mail_provider_events WHERE id=?').bind(processed.sg_event_id).first(),null);
  await f.db.prepare('DROP TRIGGER test_delivery_failure').run();
  assert.deepEqual((await Promise.all([report(processed),report(processed)])).map(response=>response.status),[200,200]);
  const conflict={...processed,event:'unsubscribe',email:'foreign@customer.test'};
  assert.equal((await report(conflict)).status,200);assert.equal((await report(conflict)).status,200);assert.equal(await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts WHERE event_id=?').bind(processed.sg_event_id).first('n'),1);
  assert.equal((await (await f.request(`records/contact/${a.contactId}`)).json() as any).record.contactability,'contactable','conflicting receipt is a durable acknowledged no-op');

  const readMessage=async()=>((await (await f.request(`workbench/opportunities/${a.opportunityId}/messages`)).json()) as {messages:{id:string;state:string;acceptedAt:string|null;deliveredAt:string|null}[]}).messages.find(message=>message.id===sent.id)!;
  const accepted=await readMessage();assert.equal(accepted.state,'accepted');assert.ok(accepted.acceptedAt);assert.equal(accepted.deliveredAt,null);
  const delivered=event('delivered');assert.equal((await report(delivered)).status,200);assert.equal((await report(delivered)).status,200);
  assert.equal((await readMessage()).state,'delivered');assert.equal((await readMessage()).acceptedAt,accepted.acceptedAt);assert.equal((await readMessage()).deliveredAt,new Date(eventTime*1000).toISOString());
  const beforeReports=await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first();
  for(const kind of ['open','click']){const item=event(kind);assert.equal((await report(item)).status,200);assert.equal((await report(item)).status,200);}
  assert.deepEqual(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first(),beforeReports,'Open and click reports never stop follow-up');
  const risks=await(await f.request(`risks/${a.opportunityId}/findings`)).json() as {evidence:{id:string;label:string;confidence:string}[];findings:{kind:string;citations:{evidenceId:string}[];inference:{source:string}|null}[]};
  const opened=risks.findings.find(finding=>finding.kind==='opens-no-reply')!;assert.ok(opened,'Reported opens with no human reply are a deal risk');assert.equal(opened.inference?.source,'rule');
  const cited=opened.citations.map(item=>risks.evidence.find(evidence=>evidence.id===item.evidenceId)!);assert.equal(cited[0]!.label,'Accepted send');assert.equal(cited[0]!.confidence,'observed');
  assert.ok(cited.length>1&&cited.slice(1).every(item=>item.confidence==='inferred'),'Each open report is cited as inferred evidence, never as a reply');
  for(const kind of ['opportunity','company','contact']){
   const id=kind==='opportunity'?a.opportunityId:kind==='company'?company.id:a.contactId;
   const response=await f.request(`records/${kind}/${id}`);assert.equal(response.status,200);
   const history=(await response.json() as {timeline:{kind:string;source:string;occurred_at:string;recorded_at:string;payload_json:string}[]}).timeline;
   for(const expected of ['message.accepted','provider.processed','provider.delivered','provider.open','provider.click'])assert.equal(history.filter(entry=>entry.kind===expected).length,1,`${kind} retains each provider status once`);
   for(const entry of history.filter(entry=>['provider.open','provider.click'].includes(entry.kind))){
    assert.equal(entry.source,'sendgrid');assert.equal(entry.occurred_at,new Date(eventTime*1000).toISOString());assert.ok(entry.recorded_at);
    const payload=JSON.parse(entry.payload_json);assert.equal(payload.confidence,'inferred');assert.equal(payload.humanResponse,false);assert.equal(payload.tracking,'not tracked');
   }
  }
  const draftResponse=await f.request(`workbench/opportunities/${a.opportunityId}/drafts`,'POST',{contactId:a.contactId,subject:'Follow up after response',body:'Still needs approval'});
  assert.equal(draftResponse.status,201);
  const draft=await draftResponse.json() as {id:string};
  const businessState=async()=>archiveHash(await Promise.all([
   f.db.prepare('SELECT * FROM outbound_messages ORDER BY rowid').all().then(result=>result.results),
   f.db.prepare('SELECT * FROM drafts ORDER BY rowid').all().then(result=>result.results),
   f.db.prepare('SELECT * FROM opportunities ORDER BY rowid').all().then(result=>result.results),
  ]));
  const pending=await businessState();
  const automaticHeaders=['Auto-Submitted: auto-replied','Auto-Submitted: auto-generated\r\nAuto-Submitted: no','X-Autoreply: yes','X-Autorespond: yes','Precedence: auto_reply'];
  for(const header of automaticHeaders){
   const automatic=replyForm(a.email,`<${createId()}@reply.test>`,sent.messageId);automatic.append('headers',header);
   assert.equal((await post(automatic)).status,200);assert.equal((await post(automatic)).status,200);
   assert.equal(await businessState(),pending,'Automatic replies leave follow-up, drafts, score and queue unchanged');
  }
  const automaticForeign=replyForm(foreign,`<${createId()}@reply.test>`,sent.messageId);automaticForeign.append('headers','Auto-Submitted: auto-replied');
  assert.equal((await post(automaticForeign)).status,200);
  const unlinkedAuto=await f.db.prepare("SELECT s.id FROM signals s JOIN unlinked_signals u ON u.signal_id=s.id WHERE s.source_event_id=?").bind(String(automaticForeign.get('headers')).match(/Message-ID: ([^\r]+)/)![1]).first<{id:string}>();
  assert.ok(unlinkedAuto,'Unmatched automatic mail stays nonhuman in signal review');
  const link=await f.request(`sources/unlinked/${unlinkedAuto.id}/link`,'POST',{type:'opportunity',id:a.opportunityId});
  assert.equal(link.status,200);
  assert.equal(await businessState(),pending,'Even reviewed foreign automatic evidence cannot stop follow-up');
  const foreignBefore=replyForm(foreign,`<${createId()}@reply.test>`,sent.messageId);foreignBefore.append('headers',`From: Visitor <${foreign}>`);
  assert.equal((await post(foreignBefore)).status,200);assert.equal(await businessState(),pending,'A foreign sender cannot stop the native recipient follow-up');
  const ambiguous=replyForm(a.email,`<${createId()}@reply.test>`,`${sent.messageId} ${(await f.message(b.contactId,b.opportunityId,'accepted')).messageId}`);
  const ambiguousBefore=await businessState();assert.equal((await post(ambiguous)).status,200);assert.equal(await businessState(),ambiguousBefore,'Cross-opportunity thread references cannot stop follow-up');
  const unknown=replyForm(a.email,`<${createId()}@reply.test>`,'<unknown@customer.test>');assert.equal((await post(unknown)).status,200);assert.equal(await businessState(),ambiguousBefore);
  const secondRecipient=await f.message(b.contactId,a.opportunityId,'accepted'),otherScheduled=await f.message(b.contactId,a.opportunityId);
  await f.db.prepare('INSERT INTO opportunity_contacts VALUES(?,?,0,?)').bind(a.opportunityId,b.contactId,new Date().toISOString()).run();
  const otherDraft=await (await f.request(`workbench/opportunities/${b.opportunityId}/drafts`,'POST',{contactId:b.contactId,subject:'Other buyer follow-up',body:'Review remains current'})).json() as {id:string};
  const automaticCount=automaticHeaders.length+1;
  const agreement=replyForm(`"Native customer" <${a.email.toUpperCase()}>`,`<${createId()}@reply.test>`,sent.messageId);
  agreement.append('headers','Auto-Submitted: no');
  agreement.append('headers',`From: Native customer <${a.email}>\r\nReferences: <unseen@reply.test> ${secondRecipient.messageId}\r\nIn-Reply-To: ${sent.messageId}`);
  const beforeHuman=await businessState();
  await f.db.prepare("CREATE TRIGGER test_reply_failure BEFORE INSERT ON unlinked_replies BEGIN SELECT RAISE(ABORT,'Injected reply persistence failure'); END").run();
  assert.equal((await post(agreement)).status,503);assert.equal(await businessState(),beforeHuman);
  await f.db.prepare('DROP TRIGGER test_reply_failure').run();
  assert.deepEqual((await Promise.all([post(agreement),post(agreement)])).map(response=>response.status),[200,200]);
  const replacement=replyForm(`Native customer <${a.email}>`,String(agreement.get('headers')).match(/Message-ID: ([^\r]+)/)![1]!,sent.messageId);replacement.set('text','Conflicting replacement body');
  assert.equal((await post(replacement)).status,200);assert.equal(await f.db.prepare('SELECT count(*) n FROM mail_provider_conflicts').first('n'),2);

  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,automaticCount+1);
  assert.equal((await f.db.prepare("SELECT count(*) n FROM signals WHERE type='email.replied'").first())!.n,1);
  assert.equal((await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(draft.id).first())!.is_stale,1);
  assert.ok(Number((await f.db.prepare('SELECT count(*) n FROM mail_provider_events').first())!.n)>=automaticCount+7);
  assert.equal((await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(scheduled.id).first())!.state,'cancelled');
  assert.equal((await post(replyForm(a.email,`<${createId()}@reply.test>`,sent.messageId))).status,200,'Provider forms without raw From remain supported');
  const foreignAgreement=replyForm(foreign,`<${createId()}@reply.test>`,sent.messageId);foreignAgreement.append('headers',`From: Visitor <${foreign}>`);
  assert.equal((await post(foreignAgreement)).status,200);
  assert.equal((await f.db.prepare('SELECT count(*) n FROM signals').first())!.n,automaticCount+2);
  assert.ok(Number((await f.db.prepare('SELECT count(*) n FROM unlinked_replies WHERE opportunity_id IS NULL').first())!.n)>=3);
  assert.equal(await f.db.prepare('SELECT state FROM outbound_messages WHERE id=?').bind(otherScheduled.id).first('state'),'scheduled');assert.equal(await f.db.prepare('SELECT is_stale FROM drafts WHERE id=?').bind(otherDraft.id).first('is_stale'),0);
  assert.equal((await f.request(`records/contact/${a.contactId}`,'DELETE',{confirmed:true})).status,200);
  assert.ok(!(await (await f.request(`records/company/${company.id}`)).text()).includes('Customer reply body'),'erasure withdraws the signed original from public account reads');
 }finally{await f.dispose();}
});
