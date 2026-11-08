import assert from 'node:assert/strict';

export async function auditInventory({request,origin,cookie}) {
 const rows=[],cursors=new Set();
 let cursor='0',pages=0;
 for(;;) {
  assert.ok(!cursors.has(cursor),'audit pagination must advance');cursors.add(cursor);
  const response=await request(new URL('/agents/api/audit?after='+cursor,origin).href,{headers:{Cookie:cookie}});
  assert.equal(response.status,200);
  const page=await response.json();pages++;
  assert.equal(page.differs_from_policy,0,'recorded decisions still match the policy in force at the call');
  assert.ok(Array.isArray(page.rows));rows.push(...page.rows);
  if(!page.cursor||page.cursor===cursor)break;
  assert.ok(Number(page.cursor)>Number(cursor));cursor=page.cursor;
 }
 assert.equal(new Set(rows.map(row=>row.id)).size,rows.length,'pagination must not repeat an audit identity');
 assert.ok(rows.every((row,index)=>index===0||row.sequence>rows[index-1].sequence),'public audit sequence remains ordered');
 return {rows,pages};
}

/** Reconcile the emitted person door with the complete public audit inventory. */
export async function agentOverviewProof({request,origin,cookie,calls,now=Date.now()}) {
 const inventory=await auditInventory({request,origin,cookie});
 const date=new Date(now),today=Math.floor(now/86400000);
 const since=(today-(date.getUTCDay()+6)%7)*86400000;
 const period=inventory.rows.filter(row=>Date.parse(row.at)>=since&&Date.parse(row.at)<=now);
 const groups=new Map();
 for(const row of period)for(const item of row.classes) {
  const key=JSON.stringify([item.class,row.decision]);groups.set(key,(groups.get(key)??0)+1);
 }
 assert.ok(groups.size>0,'overview reconciliation starts with real current-week calls');
 const response=await request(new URL('/agents',origin).href,{headers:{Cookie:cookie}});
 assert.equal(response.status,200);
 const html=await response.text(),emitted=new Map();
 for(const cell of html.matchAll(/<td data-agents-count data-class="([^"]+)" data-decision="([^"]+)">(\d+)<\/td>/g)) {
  const key=JSON.stringify([cell[1],cell[2]]);
  assert.ok(!emitted.has(key),'the overview must render one row per group');emitted.set(key,Number(cell[3]));
 }
 assert.deepEqual([...emitted].sort(),[...groups].sort(),'every emitted class and decision count equals the complete audit inventory for this week');
 const reviewsResponse=await request(new URL('/agents/api/reviews',origin).href,{headers:{Cookie:cookie}});
 assert.equal(reviewsResponse.status,200);
 const {reviews}=await reviewsResponse.json();assert.ok(Array.isArray(reviews));
 for(const call of calls) {
  const row=inventory.rows.find(row=>row.id===call.id);
  assert.ok(row,'the returned public audit identity is retained');
  assert.equal(row.tool,'orbit.handoffs.upsert');assert.equal(row.idempotency_key,call.key);
  assert.equal(row.decision,call.decision);assert.equal(row.outcome,'done');
  assert.deepEqual(row.classes.map(item=>item.class),['standard']);
  assert.ok(period.some(item=>item.id===row.id),'the actual handoff time belongs to the displayed week');
  if(call.at)assert.equal(row.at,call.at,'overview reads retain the original public call time');
  if(call.review) {
   assert.equal(row.review?.id,call.review);
   const review=reviews.find(item=>item.id===call.review);
   assert.ok(review,'the held call has a visible linked review item');
   assert.equal(review.decision_id,row.id);assert.equal(review.tool,row.tool);assert.equal(review.state,'open');
   assert.deepEqual(review.classes,row.classes);
   assert.equal(review.summary.target.id,call.target);
   assert.ok(review.summary.items.includes(call.title),'the review contains the actual saved internal task');
   assert.ok(html.includes(`data-review-id="${review.id}"`),'the linked held review is present on the emitted overview');
   assert.ok(html.includes(`action="/agents/api/reviews/${review.id}/reviewed"`),'the native review action is retained');
   assert.ok(html.includes(`action="/agents/api/reviews/${review.id}/flag"`),'the native flag action is retained');
  } else assert.equal(row.review,null,'autonomous work opens no review item');
 }
 return {...inventory,since,through:now,groups:[...groups].sort(),reviews,html};
}
