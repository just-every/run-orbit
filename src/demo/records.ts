import {demoStory} from '../core/features/public/demo-story';
import {evaluationStatements} from '../core/features/workbench/evaluation-repository';

// Stable ULIDs let a partially completed hook resume without duplicating records.
export const demoId = (kind:number, index:number) => `01DEM0${String(kind).padStart(4,'0')}${String(index).padStart(16,'0')}`;
export function insert(db:D1Database, table:string, values:Record<string,string|number|null>) {
 const keys=Object.keys(values);
 return db.prepare(`INSERT OR IGNORE INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...Object.values(values));
}

export async function seedRecords(db:D1Database, owner:string, now:Date) {
 const at=now.toISOString(), story=demoStory(now);
 const stages=(await db.prepare('SELECT id,name FROM pipeline_stages ORDER BY position').all<{id:string;name:string}>()).results;
 const source=demoId(1,0);
 await db.batch([
  insert(db,'signal_sources',{id:source,name:'Demo sample · customer activity',type:'demo',enabled:1,created_at:at,updated_at:at}),
  insert(db,'signal_sources',{id:demoId(2,0),name:'Demo sample · mailbox archive',type:'capture',enabled:0,created_at:at,updated_at:at}),
  insert(db,'capture_sources',{id:demoId(2,0),adapter:'file',name:'Demo sample · mailbox archive',scope_json:JSON.stringify({mail:{folders:['Customer conversations']}}),state:'disconnected',captured_count:2,last_success_at:at,disconnected_at:at,created_at:at,updated_at:at}),
 ]);
 for (const [index,deal] of story.deals.entries()) {
  const company=demoId(10,index),contact=demoId(11,index),opportunity=demoId(12,index),draft=demoId(13,index),signal=demoId(14,index);
  if(await db.prepare('SELECT 1 FROM drafts WHERE id=?').bind(draft).first())continue;
  const domain=deal.company.toLowerCase().replaceAll(' ','-')+'.example',email=deal.contact.split(' ')[0]!.toLowerCase()+'@'+domain;
  const occurred=deal.signals[0]!.occurredAt,stage=stages.find(s=>s.name===deal.stage);
  if(!stage)throw new Error('Demo pipeline stage is missing.');
  const batch=[
   insert(db,'companies',{id:company,name:deal.company,primary_domain:domain,primary_domain_key:domain,created_at:occurred,updated_at:at}),
   insert(db,'contacts',{id:contact,company_id:company,name:deal.contact,email,email_key:email,job_title:index%2?'Operations director':'Team lead',timezone:'Australia/Brisbane',contactability:'contactable',created_at:occurred,updated_at:at}),
   insert(db,'opportunities',{id:opportunity,title:deal.title,lifecycle:'open',stage_id:stage.id,owner_id:owner,company_id:company,value_cents:deal.value*100,score:0,band:'low',queue_state:deal.queue.toLowerCase(),queue_reason:deal.reason,created_at:occurred,updated_at:at}),
   insert(db,'opportunity_contacts',{opportunity_id:opportunity,contact_id:contact,is_primary:1,created_at:occurred}),
   insert(db,'signals',{id:signal,source_id:source,source_event_id:deal.id,type:index===0?'email.replied':index%2?'meeting.booked':'form.submitted',subject:deal.signals[0]!.subject,occurred_at:occurred,received_at:occurred,payload_hash:await hash(JSON.stringify(deal.signals)),confidence:'observed',linking_basis:'Demo sample story',created_at:occurred}),
   insert(db,'timeline_entries',{id:signal,kind:'signal.recorded',occurred_at:occurred,recorded_at:occurred,actor_type:'source',actor_id:source,source:'Demo sample',payload_json:JSON.stringify({signalId:signal,subject:deal.signals[0]!.subject,type:index===0?'email.replied':index%2?'meeting.booked':'form.submitted'})}),
  ];
  for(const [record_type,record_id] of [['company',company],['contact',contact],['opportunity',opportunity]])batch.push(
   insert(db,'signal_links',{signal_id:signal,record_type:record_type!,record_id:record_id!,linking_basis:'Demo sample story',linked_at:occurred}),
   insert(db,'timeline_entry_records',{timeline_entry_id:signal,record_type:record_type!,record_id:record_id!}),
  );
  for(const [m,message] of deal.messages.entries()) {
   const id=demoId(20,m),messageSignal=demoId(21,m),headers=`From: ${message.kind==='reply'?email:'alex@demo.invalid'}\nTo: ${message.kind==='reply'?'alex@demo.invalid':email}\nSubject: ${message.subject}\nDate: ${new Date(message.occurredAt).toUTCString()}\nMessage-ID: <sample-${m}@demo.invalid>`;
   batch.push(
    insert(db,'signals',{id:messageSignal,source_id:demoId(2,0),source_event_id:`story-message-${m}`,type:message.kind==='reply'?'email.replied':'email.sent',subject:message.subject,occurred_at:message.occurredAt,received_at:message.occurredAt,payload_hash:await hash(headers+message.body),confidence:'observed',linking_basis:'Demo sample mailbox history',created_at:message.occurredAt}),
    insert(db,'capture_items',{id,source_id:demoId(2,0),signal_id:messageSignal,kind:'message',headers,body:message.body,captured_at:message.occurredAt}),
    insert(db,'signal_links',{signal_id:messageSignal,record_type:'opportunity',record_id:opportunity,linking_basis:'Demo sample mailbox history',linked_at:message.occurredAt}),
    insert(db,'timeline_entries',{id,kind:message.kind==='reply'?'email.replied':'email.sent',occurred_at:message.occurredAt,recorded_at:message.occurredAt,actor_type:'source',actor_id:demoId(2,0),source:'Demo sample mailbox history',payload_json:JSON.stringify({signalId:messageSignal,subject:message.subject,body:message.body})}),
    insert(db,'timeline_entry_records',{timeline_entry_id:id,record_type:'opportunity',record_id:opportunity}),
   );
  }
  // Scores and recommendations are computed by the real product policy.
  batch.push(...evaluationStatements(db,opportunity,owner,'Demo sample customer evidence',now));
  batch.push(insert(db,'drafts',{id:draft,opportunity_id:opportunity,author_id:owner,recipient_contact_id:contact,recipient_email:email,subject:deal.draft.subject,body:deal.draft.body,revision:1,is_stale:0,created_at:deal.draft.updatedAt,updated_at:deal.draft.updatedAt}));
  await db.batch(batch);
 }
}
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
