import assert from 'node:assert/strict';

export default async function sellerDay({tool,request,origin,cookie}) {
 async function call(name,args={}) {
  const answer=await tool('orbit.'+name,args);
  assert.equal(answer.status,200,name);
  assert.equal(answer.result?.isError,false,`${name} refused`);
  assert.ok(answer.result?.structuredContent,`${name} must return native structured content`);
  return answer.result.structuredContent;
 }
 const selected=await call('records.list',{kind:'opportunity',query:'Door specialist fixture opportunity',limit:1});
 const id=selected.items[0].ref.id,record=await call('records.read',{kind:'opportunity',id});
 const signals=await call('signals.list',{opportunity_id:id});
 const meeting=await call('meetings.read',{id:signals.signals[0].id});
 assert.ok(meeting.plan);
 const handoff=await call('handoffs.read',{opportunity_id:id,id:'cited-seller-shift'});
 const args={target:handoff.target,source_revision:handoff.revision,audience_revision:handoff.audienceRevision,content:{title:'Cited buyer follow-up',description:'Prepare the current buyer discussion',assigneeId:null,dueAt:null,status:'open',evidence:[signals.signals[0].id]},idempotency_key:crypto.randomUUID()};
 const saved=await call('handoffs.upsert',args),replay=await call('handoffs.upsert',args);
 assert.deepEqual(replay,saved,'native handoff replay has the retained outcome');
 const stale=await tool('orbit.handoffs.upsert',{...args,idempotency_key:crypto.randomUUID()});
 assert.equal(stale.result?._meta?.['com.runeditrun/error']?.code,'revision_conflict');
 const writeKey=crypto.randomUUID();
 const edited=await call('records.update',{kind:'opportunity',id,fields:{value_cents:Number(record.fields.value_cents)+1000},expected_revision:record.ref.revision,idempotency_key:writeKey});
 assert.equal(edited.id,id);
 const readback=await call('records.read',{kind:'opportunity',id});
 assert.equal(readback.fields.value_cents,Number(record.fields.value_cents)+1000,'CRM value is an estimate, not a payment');
 const native=await request(new URL(`/api/v1/records/opportunity/${id}`,origin).href,{headers:{Cookie:cookie}});
 assert.equal(native.status,200);
 const detail=await native.json();
 assert.ok(detail.timeline.some(row=>row.actor_type==='agent'&&row.actor_name&&JSON.parse(row.payload_json).preparedBy?.agent?.id),'native timeline must name agent for sponsor');
 const rows=[];
 let cursor='0';
 for(;;) {
  const auditResponse=await request(new URL('/agents/api/audit?after='+cursor,origin).href,{headers:{Cookie:cookie}});
  assert.equal(auditResponse.status,200);
  const audit=await auditResponse.json();
  assert.equal(audit.differs_from_policy,0);
  rows.push(...audit.rows);
  if(!audit.cursor||audit.cursor===cursor)break;
  cursor=audit.cursor;
 }
 const write=rows.find(row=>row.tool==='orbit.records.update'&&row.outcome==='done'&&row.idempotency_key===writeKey);
 assert.deepEqual(write?.resource,{kind:'opportunity',id},'native write audit identifies its actual opportunity');
}

// The installed 0.2.86 runner exercises the native target, resource refusal,
// replay admission, signed owner binding and independent reviewer lifecycle.
// Access/security tools remain undeclared, so no self-widening probe applies.
// PENDING-BASE-ARCHIVE-2026-10-28: 0.2.86 archive record-base succeeds,
// but refresh-base still needs historical workflow matching at Base
// edition-authoring/workflow-copies.mjs:51; archive-source.mjs:34 refuses it.
// Keep the recorded release source; do not invent Git ancestry for an archive.
// PENDING-BASE-INJECTION-2026-10-28: Base modules/agent-door/conformance/
// journey.mjs:92 reissues completed mutations with a new key and their old
// native revisions. public_update, save_handoff and draft_update must refuse
// that stale request. Keep the injection assertions and native fences intact.
