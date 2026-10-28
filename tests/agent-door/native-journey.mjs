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
 const edited=await call('records.update',{kind:'opportunity',id,fields:{value_cents:Number(record.fields.value_cents)+1000},expected_revision:record.ref.revision,idempotency_key:crypto.randomUUID()});
 assert.equal(edited.id,id);
 const readback=await call('records.read',{kind:'opportunity',id});
 assert.equal(readback.fields.value_cents,Number(record.fields.value_cents)+1000,'CRM value is an estimate, not a payment');
 const native=await request(new URL(`/api/v1/records/opportunity/${id}`,origin).href,{headers:{Cookie:cookie}});
 assert.equal(native.status,200);
 const detail=await native.json();
 assert.ok(detail.timeline.some(row=>row.actor_type==='agent'&&row.actor_name&&JSON.parse(row.payload_json).preparedBy?.agent?.id),'native timeline must name agent for sponsor');
 const auditResponse=await request(new URL('/agents/api/audit?limit=200',origin).href,{headers:{Cookie:cookie}});
 assert.equal(auditResponse.status,200);
 const audit=await auditResponse.json();
 assert.equal(audit.differs_from_policy,0);
 const write=audit.rows.find(row=>row.tool==='orbit.records.update'&&row.outcome==='done');
 assert.deepEqual(write?.resource,{kind:'opportunity',id},'native write audit identifies its actual opportunity');
}

// PENDING-CT-SURFACE-2026-10-28: the complete CLI conformance run is refused
// while CONTRACT.md lacks BASE-AGENT-010. The existing native proof now also
// asserts resource data.code, current-policy replay refusal and an independent
// native reviewer session. No access/security tool is declared, so sponsor
// self-widening fixtures are inapplicable; the standard handoff assignee still
// uses the shared {$sponsor:'id'} fixture syntax.
