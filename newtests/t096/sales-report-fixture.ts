import assert from 'node:assert/strict';
import {createHmac,generateKeyPairSync,sign} from 'node:crypto';
import {createApp} from '../../tests/support/app';
import {signedReplies} from '../../tests/support/signed-reply';
import {createSourceSecurity} from '../../src/core/platform/source-security';
import {OutreachService} from '../../src/core/features/outreach/service';
import {createMailEventRoutes} from '../../src/core/features/outreach/provider-routes';
import {createId} from '../../src/core/shared/ids';
import {signIn,type fixture} from './fixture';

/** A US sales book for REPORT-001: two pipelines (and an excluded default one) with won, lost and open deals, recorded stage
 * movement, rep activities, tasks, signed bookings and reviewed scheduled messages with SEQUENCE-002 outcomes. Everything is
 * created through Orbit's own HTTP doors; only its history is then dated into the two previous New York months, as fixture data. */
type Fixture=Awaited<ReturnType<typeof fixture>>;
export const TZ='America/New_York';
const DAY=86400000,format=new Intl.DateTimeFormat('en-US',{timeZone:TZ,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const parts=(instant:number)=>Object.fromEntries(format.formatToParts(new Date(instant)).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)])) as Record<'year'|'month'|'day'|'hour'|'minute',number>;
/** New York wall time as an instant, checked by rendering it back, independent of the app's own month code. */
export function newYork(year:number,month:number,day:number,hour=12,minute=0){for(const offset of [4,5]){const instant=Date.UTC(year,month-1,day,hour+offset,minute),p=parts(instant);if(p.year===year&&p.month===month&&p.day===day&&p.hour===hour&&p.minute===minute)return instant;}throw new Error('Not a New York wall time.');}
export const iso=(instant:number)=>new Date(instant).toISOString();
const shift=(year:number,month:number,by:number)=>{const index=year*12+month-1+by;return {year:Math.floor(index/12),month:index%12+1};};
const key=(value:{year:number;month:number})=>`${value.year}-${String(value.month).padStart(2,'0')}`;

export async function seedSalesReport(f:Fixture){
 const current=parts(Date.now()),thisMonth={year:current.year,month:current.month},lastMonth=shift(thisMonth.year,thisMonth.month,-1),twoBack=shift(thisMonth.year,thisMonth.month,-2);
 const p1=(day:number,hour=12,minute=0)=>newYork(twoBack.year,twoBack.month,day,hour,minute),p2=(day:number,hour=12)=>newYork(lastMonth.year,lastMonth.month,day,hour);
 const lastDay=Math.round((newYork(lastMonth.year,lastMonth.month,1,0)-newYork(twoBack.year,twoBack.month,1,0))/DAY);
 let sends=0;const mail={provider:'sendgrid' as const,messageIdDomain:'orbit-sales.test',send:async()=>({providerMessageId:`report-receipt-${++sends}`})};
 const app=createApp({database:f.db,assets:{fetch:async()=>new Response(null,{status:404})},outboundMail:mail,sourceSecurity:createSourceSecurity({ORBIT_ENCRYPTION_KEY:'5a'.repeat(32)})!});
 const as=(cookie:string)=>async<T=any>(path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T>=>{const response=await app.request('https://orbit.test'+path,{method,headers:{Cookie:cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await response.text();assert.ok(response.ok,`${method} ${path}: ${response.status} ${text}`);return (text?JSON.parse(text):null) as T;};
 const owner=as(f.cookie),settings=await owner<{workspace:Record<string,any>}>('/api/v1/settings'),workspace=settings.workspace;
 await owner('/api/v1/settings',{name:workspace.name,timezone:TZ,currency:workspace.currency,workingHours:JSON.parse(workspace.working_hours_json),staleIntervalDays:workspace.stale_interval_days,awaitingResponseWorkingDays:workspace.awaiting_response_working_days,freeMailDomains:JSON.parse(workspace.free_mail_domains_json)},'PUT');
 await owner('/api/v1/settings/operators',{email:'riley@orbit-sales.test',displayName:'Riley Chen'});
 const rileySession=await signIn(f.db,'riley@orbit-sales.test'),riley=as(rileySession.cookie),ownerId=f.operator.operatorId,rileyId=rileySession.operator.operatorId;
 const stage=(name:string)=>({name,probability:20,requiredFields:[],staleIntervalDays:14});
 const newBusiness=await owner<{id:string}>('/api/v1/settings/pipelines',{name:'New business',stages:['Discovery','Proposal','Negotiation'].map(stage)});
 const renewals=await owner<{id:string}>('/api/v1/settings/pipelines',{name:'Renewals',stages:['Renewal review','Renewal commit'].map(stage)});
 const stages=(await owner<{stages:{id:string;name:string;pipeline_id:string}[]}>('/api/v1/settings')).stages,stageId=(pipeline:string,name:string)=>stages.find(item=>item.pipeline_id===pipeline&&item.name===name)!.id;
 const s={discovery:stageId(newBusiness.id,'Discovery'),proposal:stageId(newBusiness.id,'Proposal'),negotiation:stageId(newBusiness.id,'Negotiation'),review:stageId(renewals.id,'Renewal review'),commit:stageId(renewals.id,'Renewal commit'),fallback:f.stage};
 const people:Record<string,{contact:string;company:string;email:string}>={};
 for(const [name,person] of [['Atlas','Ava Stone'],['Birch','Bo Lane'],['Cedar','Cy Hart'],['Dune','Dana Wells'],['Elm','Eli Brooks'],['Fir','Fay Moss'],['Grove','Gus Reed'],['Hazel','Hana Cole']] as const){const domain=`${name.toLowerCase()}.example`,company=(await owner<{id:string}>('/api/v1/records/company',{name:`${name} Co`,primary_domain:domain})).id,email=`${person.split(' ')[0]!.toLowerCase()}@${domain}`;people[name]={company,email,contact:(await owner<{id:string}>('/api/v1/records/contact',{name:person,email,company_id:company,timezone:TZ})).id};}
 const deal=async(name:string,title:string,stageId:string,value:number,dealOwner:string)=>(await owner<{id:string}>('/api/v1/records/opportunity',{title,stage_id:stageId,value_cents:value,owner_id:dealOwner,company_id:people[name]!.company,contact_ids:[people[name]!.contact],primary_contact_id:people[name]!.contact})).id;
 const d={
  atlas:await deal('Atlas','Atlas expansion',s.discovery,4_000_000,ownerId),birch:await deal('Birch','Birch rollout',s.discovery,2_500_000,rileyId),
  cedar:await deal('Cedar','Cedar renewal',s.review,1_200_000,rileyId),dune:await deal('Dune','Dune pilot',s.discovery,800_000,ownerId),
  elm:await deal('Elm','Elm upgrade',s.review,1_500_000,rileyId),fir:await deal('Fir','Fir trial',s.discovery,500_000,ownerId),
  grove:await deal('Grove','Grove platform',s.fallback,9_900_000,ownerId),hazel:await deal('Hazel','Hazel expansion',s.discovery,3_000_000,ownerId),
 };
 const move=(id:string,from:string,to:string)=>owner(`/api/v1/records/opportunity/${id}/move`,{stageId:to,reviewedStageId:from});
 await move(d.atlas,s.discovery,s.proposal);await move(d.atlas,s.proposal,s.negotiation);await move(d.birch,s.discovery,s.proposal);
 await move(d.cedar,s.review,s.commit);await move(d.dune,s.discovery,s.proposal);await move(d.hazel,s.discovery,s.proposal);
 const close=(id:string,state:'won'|'lost',reason:string)=>owner(`/api/v1/records/opportunity/${id}/lifecycle`,{state,reason});
 await close(d.atlas,'won','Better fit');await close(d.birch,'lost','Price');await close(d.cedar,'won','Renewed');await close(d.fir,'lost','No decision');await close(d.grove,'won','Pricing');
 const entry=(author:typeof owner,kind:string,id:string,type:'note'|'call'|'meeting',at:number)=>author<{id:string}>(`/api/v1/records/${kind}/${id}/entries`,{kind:type,text:`${type} for the monthly report`,occurredAt:iso(at),...(type==='note'?{}:{durationMinutes:30})});
 const activities={
  ownerCallAtlas:await entry(owner,'opportunity',d.atlas,'call',p1(9)),ownerMeetingAtlas:await entry(owner,'opportunity',d.atlas,'meeting',p1(lastDay,23,30)),
  ownerNoteDune:await entry(owner,'opportunity',d.dune,'note',p2(8)),rileyCallBirch:await entry(riley,'opportunity',d.birch,'call',p1(7)),
  rileyNoteElm:await entry(riley,'opportunity',d.elm,'note',p2(5)),rileyMeetingCedar:await entry(riley,'opportunity',d.cedar,'meeting',p2(6)),
  ownerCallGrove:await entry(owner,'opportunity',d.grove,'call',p2(10)),ownerNoteContact:await entry(owner,'contact',people.Dune!.contact,'note',p2(9)),
 };
 const task=async(title:string,recordType:string,recordId:string,assignee:string,due:number)=>{const input={title,recordType,recordId,ownerId:assignee,dueAt:iso(due),priority:'normal',type:'follow_up',notes:'',recurrence:'none',timezone:TZ,reminderMinutes:null};return {input,...await owner<{id:string;revision:string}>('/api/v1/tasks',input)};};
 const tasks={
  atlas:await task('Send the signed order form','opportunity',d.atlas,ownerId,p1(12)),birch:await task('Ask Birch for a decision date','opportunity',d.birch,rileyId,p1(14)),
  dune:await task('Confirm the Dune pilot scope','opportunity',d.dune,ownerId,p2(15)),elm:await task('Prepare the Elm upgrade quote','opportunity',d.elm,rileyId,p2(16)),
  cedar:await task('Cedar paperwork','opportunity',d.cedar,rileyId,p2(17)),hazel:await task('Book the Hazel pricing review','opportunity',d.hazel,ownerId,p2(18)),
  contact:await task('Call Dana about references','contact',people.Dune!.contact,ownerId,p2(19)),
 };
 const finish=(author:typeof owner,item:typeof tasks.atlas,status:'completed'|'cancelled')=>author(`/api/v1/tasks/${item.id}`,{...item.input,revision:item.revision,status},'PUT');
 await finish(owner,tasks.atlas,'completed');await finish(riley,tasks.elm,'completed');await finish(owner,tasks.cedar,'cancelled');
 // Reviewed scheduled messages, dispatched through the fake mail edge; one reviewed message is sent at approval.
 const draft=async(author:typeof owner,id:string,contact:string,subject:string)=>(await author<{id:string}>(`/api/v1/workbench/opportunities/${id}/drafts`,{contactId:contact,subject,body:'Following up on our conversation.'})).id;
 const schedule=async(author:typeof owner,id:string,contact:string,subject:string)=>author<{id:string;scheduledAt:string}>(`/api/v1/workbench/drafts/${await draft(author,id,contact,subject)}/approve`,{revision:1,scheduledAt:iso(Date.now()+120000)});
 const m1=await schedule(owner,d.dune,people.Dune!.contact,'Dune pilot next steps'),m2=await schedule(riley,d.elm,people.Elm!.contact,'Elm upgrade timing'),m3=await schedule(owner,d.hazel,people.Hazel!.contact,'Hazel proposal review');
 for(const message of [m1,m2,m3])await new OutreachService(f.db,mail).dispatchDue(new Date(Date.parse(message.scheduledAt)+60000));
 const directDraft=await draft(owner,d.dune,people.Dune!.contact,'Dune pilot recap'),review=await owner<{localTime:string}>(`/api/v1/workbench/drafts/${directDraft}/approval-preview`);
 const direct=await owner<{id:string}>(`/api/v1/workbench/drafts/${directDraft}/approve`,{revision:1,quietHoursConfirmation:review.localTime});
 const sent=async(id:string)=>(await f.db.prepare('SELECT id,state,provider_message_id,message_id FROM outbound_messages WHERE id=?').bind(id).first<{id:string;state:string;provider_message_id:string;message_id:string}>())!;
 const messages={m1:await sent(m1.id),m2:await sent(m2.id),m3:await sent(m3.id),direct:await sent(direct.id)};
 for(const message of Object.values(messages))assert.equal(message.state,'accepted',`message ${message.id} was accepted`);
 // Provider outcomes at the signed webhook edges: deliveries and a reported open, a genuine and an automatic reply.
 const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),events=createMailEventRoutes(f.db,{eventKey:keys.publicKey.export({type:'spki',format:'der'}).toString('base64')});
 const event=async(payload:unknown[])=>{const raw=Buffer.from(JSON.stringify(payload)),timestamp=String(Math.floor(Date.now()/1000));const response=await events.request('https://orbit.test/sendgrid',{method:'POST',headers:{'Content-Type':'application/json','X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':sign('sha256',Buffer.concat([Buffer.from(timestamp),raw]),keys.privateKey).toString('base64')},body:raw});assert.equal(response.status,200,await response.text());};
 const stamp=Math.floor(Date.now()/1000);
 await event([{sg_event_id:createId(),event:'delivered',timestamp:stamp,email:people.Dune!.email,sg_message_id:messages.m1.provider_message_id,rer_product:'orbit'},{sg_event_id:createId(),event:'delivered',timestamp:stamp,email:people.Elm!.email,sg_message_id:messages.m2.provider_message_id,rer_product:'orbit'},{sg_event_id:createId(),event:'open',timestamp:stamp,email:people.Dune!.email,sg_message_id:messages.m1.provider_message_id,rer_product:'orbit'}]);
 await new Promise(resolve=>setTimeout(resolve,1100));// mail Date headers have whole seconds; replies date after acceptance
 const reply=signedReplies(f.db),form=(from:string,references:string,automatic:boolean)=>{const value=new FormData();value.set('from',from);value.set('subject','Re: follow-up');value.set('text',automatic?'I am out of the office.':'Thanks, this works for us.');value.set('headers',`Message-ID: <${createId()}@customer.test>\r\nDate: ${new Date().toUTCString()}\r\nReferences: ${references}${automatic?'\r\nAuto-Submitted: auto-replied':''}`);return value;};
 assert.equal((await reply(form(people.Dune!.email,messages.m1.message_id,false))).status,200);assert.equal((await reply(form(people.Elm!.email,messages.m2.message_id,true))).status,200);
 await owner(`/api/v1/workbench/opportunities/${d.elm}/events`,{type:'email.opened',contactId:people.Elm!.contact,subject:'Open reported by a mail client',occurredAt:new Date().toISOString(),eventId:createId()});
 // Signed booking intake (Calendly and Cal.com), including a cancellation and a booking on the excluded pipeline.
 const source=await owner<{secret:string}>('/api/v1/sources/bookings',{name:'Booking tools',enabled:true},'PUT');
 const booking=async(vendor:'calendly'|'calcom',email:string,cancelled=false)=>{const at=new Date().toISOString(),ts=String(Math.floor(Date.now()/1000)),body=JSON.stringify(vendor==='calcom'?{triggerEvent:cancelled?'BOOKING_CANCELLED':'BOOKING_CREATED',createdAt:at,payload:{uid:crypto.randomUUID(),attendees:[{email}]}}:{event:cancelled?'invitee.canceled':'invitee.created',created_at:at,payload:{uri:'https://api.calendly.com/scheduled_events/sales/invitees/'+crypto.randomUUID(),event:'https://api.calendly.com/scheduled_events/sales',email}});const hash=createHmac('sha256',source.secret).update(vendor==='calcom'?body:ts+'.'+body).digest('hex');const response=await app.request('https://orbit.test/api/v1/signals/bookings/'+vendor,{method:'POST',headers:{[vendor==='calcom'?'X-Cal-Signature-256':'Calendly-Webhook-Signature']:vendor==='calcom'?hash:`t=${ts},v1=${hash}`},body});const text=await response.text();assert.equal(response.status,201,text);return (JSON.parse(text) as {id:string}).id;};
 const bookings={hazel:await booking('calendly',people.Hazel!.email),atlas:await booking('calcom',people.Atlas!.email),elmCancelled:await booking('calendly',people.Elm!.email,true),grove:await booking('calendly',people.Grove!.email)};
 await move(d.hazel,s.proposal,s.negotiation);// a stage advance after the Hazel message was accepted
 // Fixture history: date each recorded event into the two previous New York months.
 const at={atlasCreated:p1(3),atlasProposal:p1(6),atlasNegotiation:p1(10),atlasWon:p2(5),birchCreated:p1(4),birchProposal:p1(8),birchLost:p1(15),cedarCreated:p1(20),cedarCommit:p2(4),cedarWon:p2(8),duneCreated:p2(2),duneProposal:p2(6),elmCreated:p1(12),firCreated:p2(3),firLost:p2(12),groveCreated:p1(5),groveWon:p2(10),hazelCreated:p1(25),hazelProposal:p2(7),hazelNegotiation:p2(14),m1Accepted:p2(9),m2Accepted:p2(10),m3Accepted:p2(11),directAccepted:p2(16),atlasBooked:p1(18),elmCancelled:p2(12),hazelBooked:p2(13),groveBooked:p2(13)};
 const sql=(query:string,...values:unknown[])=>f.db.prepare(query).bind(...values).run();
 for(const [id,created] of [[d.atlas,at.atlasCreated],[d.birch,at.birchCreated],[d.cedar,at.cedarCreated],[d.dune,at.duneCreated],[d.elm,at.elmCreated],[d.fir,at.firCreated],[d.grove,at.groveCreated],[d.hazel,at.hazelCreated]] as const)await sql('UPDATE opportunities SET created_at=? WHERE id=?',iso(created),id);
 for(const [id,closed] of [[d.atlas,at.atlasWon],[d.birch,at.birchLost],[d.cedar,at.cedarWon],[d.fir,at.firLost],[d.grove,at.groveWon]] as const)await sql('UPDATE opportunities SET closed_at=? WHERE id=?',iso(closed),id);
 const moved=(id:string,to:string,instant:number)=>sql("UPDATE timeline_entries SET occurred_at=?,recorded_at=? WHERE kind='stage.changed' AND json_extract(payload_json,'$.current')=? AND id IN(SELECT timeline_entry_id FROM timeline_entry_records WHERE record_type='opportunity' AND record_id=?)",iso(instant),iso(instant),to,id);
 await moved(d.atlas,s.proposal,at.atlasProposal);await moved(d.atlas,s.negotiation,at.atlasNegotiation);await moved(d.birch,s.proposal,at.birchProposal);await moved(d.cedar,s.commit,at.cedarCommit);await moved(d.dune,s.proposal,at.duneProposal);await moved(d.hazel,s.proposal,at.hazelProposal);await moved(d.hazel,s.negotiation,at.hazelNegotiation);
 for(const [message,accepted] of [[messages.m1,at.m1Accepted],[messages.m2,at.m2Accepted],[messages.m3,at.m3Accepted],[messages.direct,at.directAccepted]] as const)await sql("UPDATE timeline_entries SET occurred_at=?,recorded_at=? WHERE kind='message.accepted' AND json_extract(payload_json,'$.messageId')=?",iso(accepted),iso(accepted),message.id);
 for(const [id,booked] of [[bookings.atlas,at.atlasBooked],[bookings.elmCancelled,at.elmCancelled],[bookings.hazel,at.hazelBooked],[bookings.grove,at.groveBooked]] as const)await sql('UPDATE signals SET occurred_at=? WHERE id=?',iso(booked),id);
 return {months:{first:key(twoBack),last:key(lastMonth),current:key(thisMonth)},at,deals:d,stages:s,pipelines:{newBusiness:newBusiness.id,renewals:renewals.id},people,activities,tasks,messages,bookings,ownerId,rileyId,rileyCookie:rileySession.cookie};
}
