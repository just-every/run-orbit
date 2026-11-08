import assert from 'node:assert/strict';

/** Compare rendered public inventories with authenticated native MCP discovery. */
export async function agentDocsInventory({html,mcp}) {
 const tools=await mcp('tools/list'),resources=await mcp('resources/templates/list');
 assert.equal(tools.status,200,'authenticated tool discovery succeeds');
 assert.equal(resources.status,200,'authenticated resource discovery succeeds');
 assert.ok(Array.isArray(tools.body.result?.tools));
 assert.ok(Array.isArray(resources.body.result?.resourceTemplates));
 assert.ok(tools.body.result.tools.length>0,'the comparison exercises populated tool discovery');
 assert.ok(resources.body.result.resourceTemplates.length>0,'the comparison exercises populated resource discovery');
 const tableAfter=id=>{
  const start=html.indexOf(`id="${id}"`);
  assert.ok(start>=0,'the generated inventory heading is rendered');
  const section=html.slice(start).split(/<h[23]\b/)[0];
  const table=section.match(/<tbody>([\s\S]*?)<\/tbody>/);
  assert.ok(table,'the inventory has rendered rows');
  return [...table[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(row=>
   [...row[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(cell=>cell[1].replace(/<[^>]+>/g,'')));
 };
 const toolRows=tableAfter('current-tool-inventory');
 assert.deepEqual(toolRows.map(row=>row[0]).sort(),tools.body.result.tools.map(tool=>tool.name).sort(),'rendered tools exactly match native discovery');
 const resourceRows=tableAfter('current-resource-template-inventory');
 assert.deepEqual(resourceRows.map(([uriTemplate,name])=>({uriTemplate,name})).sort((a,b)=>a.uriTemplate.localeCompare(b.uriTemplate)),
  resources.body.result.resourceTemplates.map(({uriTemplate,name})=>({uriTemplate,name})).sort((a,b)=>a.uriTemplate.localeCompare(b.uriTemplate)),
  'rendered resource templates and names exactly match native discovery');
 return {tools:toolRows.length,resourceTemplates:resourceRows.length};
}

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
 const writeArgs={kind:'opportunity',id,fields:{value_cents:Number(record.fields.value_cents)+1000},expected_revision:record.ref.revision,idempotency_key:writeKey};
 const accepted=await tool('orbit.records.update',writeArgs);
 assert.equal(accepted.status,200);
 assert.equal(accepted.result?.isError,false,'the original native record write succeeds');
 const edited=accepted.result?.structuredContent;
 assert.ok(edited,'records.update must return native structured content');
 assert.equal(edited.id,id);
 const readback=await call('records.read',{kind:'opportunity',id});
 assert.equal(readback.fields.value_cents,Number(record.fields.value_cents)+1000,'CRM value is an estimate, not a payment');
 const native=await request(new URL(`/api/v1/records/opportunity/${id}`,origin).href,{headers:{Cookie:cookie}});
 assert.equal(native.status,200);
 const detail=await native.json();
 assert.ok(detail.timeline.some(row=>row.actor_type==='agent'&&row.actor_name&&JSON.parse(row.payload_json).preparedBy?.agent?.id),'native timeline must name agent for sponsor');
 const beforeConflict=await call('operations.read');
 const conflict=await tool('orbit.records.update',{...writeArgs,fields:{value_cents:writeArgs.fields.value_cents+1000}});
 assert.notEqual(conflict.body.id,accepted.body.id,'changed arguments use a new JSON-RPC request identity');
 assert.equal(conflict.status,200,'an idempotency conflict is a tool refusal');
 assert.equal(conflict.result?.isError,true);
 assert.equal(conflict.result?._meta?.['com.runeditrun/error']?.code,'idempotency_conflict');
 assert.equal(conflict.result?.structuredContent,undefined,'a conflict returns no successful native result');
 assert.deepEqual(await call('operations.read'),beforeConflict,'changed arguments with the accepted key have no second native effect');
 const afterConflict=await request(new URL(`/api/v1/records/opportunity/${id}`,origin).href,{headers:{Cookie:cookie}});
 assert.equal(afterConflict.status,200);
 assert.deepEqual(await afterConflict.json(),detail,'the accepted record and its native history remain unchanged');
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

// The installed 0.2.93 runner exercises the native target, resource refusal,
// replay admission, signed owner binding and independent reviewer lifecycle.
// Access/security tools remain undeclared, so no self-widening probe applies.
// The runner refreshes native revisions for injection variants. The stale
// public_update, save_handoff and draft_update requests still refuse, while
// fresh injection variants assert the original classes and native effects.
// PENDING-BASE-ARCHIVE-ANCESTRY-2026-10-29: 0.2.87 refresh --base-archive
// succeeds for the door/settings record, but a whole-record refresh crosses
// an edition migration at Base edition-authoring/edition-migrations.mjs:33-34.
// archive-source.mjs:34 correctly refuses unavailable Git ancestry. Preserve
// the other pins; never invent ancestry or skip their migration obligations.
