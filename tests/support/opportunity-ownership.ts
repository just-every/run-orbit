import assert from 'node:assert/strict';
import {createId} from '../../src/core/shared/ids';
import {createSourceSecurity,payloadHash} from '../../src/core/platform/source-security';
import {IngestionRepository} from '../../src/core/features/ingestion/repository';

/** A scored deal changes owner through the record page's own save route; the timeline attributes each change and the score stays put. */
export async function exerciseOpportunityOwnership(request:(path:string,method?:string,body?:unknown)=>Promise<Response>,db:D1Database,actor:string,other:string,stageId:string){
 const call=async(path:string,method='GET',body?:unknown,status=200):Promise<any>=>{
  const response=await request(path,method,body),result=await response.json();
  assert.equal(response.status,status,JSON.stringify(result));return result;
 };
 const contact=await call('records/contact','POST',{name:'synthetic-orbit-deal-buyer',email:`buyer${'@'}opportunity-owner.test`},201);
 const deal=await call('records/opportunity','POST',{title:'synthetic-orbit-owned-deal',stage_id:stageId,value_cents:0,owner_id:null,contact_ids:[contact.id],primary_contact_id:contact.id},201);
 // A customer reply scores the deal; ageing the evidence makes any re-scoring visible in the stored score.
 const security=createSourceSecurity({ORBIT_ENCRYPTION_KEY:'22'.repeat(32)})!,source=createId(),ingestion=new IngestionRepository(db);
 await ingestion.configure({id:source,name:'Ownership source',enabled:true,secret:'synthetic-orbit-ownership-secret-'.repeat(2)},security);
 const event={eventId:createId(),type:'email.replied',subject:'Reply',occurredAt:new Date().toISOString(),email:`buyer${'@'}opportunity-owner.test`},raw=JSON.stringify(event);
 await ingestion.ingest(source,event,await payloadHash(raw),raw);
 await db.prepare('UPDATE signals SET occurred_at=? WHERE source_id=?').bind(new Date(Date.now()-15*86400000).toISOString(),source).run();
 const read=async()=>call(`records/opportunity/${deal.id}`);
 const scored=(await read()).record;assert.ok(scored.score>0,'The deal starts with a score');
 const evaluations=async()=>(await db.prepare("SELECT count(*) AS n FROM evaluations WHERE opportunity_id=?").bind(deal.id).first<{n:number}>())!.n;
 const evaluationsBefore=await evaluations();
 const names=new Map<string,string>();
 for(const id of [actor,other])names.set(id,(await db.prepare('SELECT display_name FROM operators WHERE id=?').bind(id).first<{display_name:string}>())!.display_name);
 const changes=async()=>(await read()).timeline.filter((entry:any)=>entry.kind==='owner.changed');
 async function change(previous:string|null,next:string|null,expectedChanges:number){
  const saved=await call(`records/opportunity/${deal.id}`,'PATCH',{changes:{owner_id:next},base:{owner_id:previous}});assert.equal(saved.record.owner_id,next);
  // Reload through both reads: the native owner persists and the attributed entry is on the timeline.
  assert.equal((await read()).record.owner_id,next);assert.equal((await call(`opportunities/${deal.id}`)).opportunity.ownerId,next);
  const entries=await changes();assert.equal(entries.length,expectedChanges);
  const latest=entries.find((entry:any)=>{const seen=JSON.parse(entry.payload_json);return seen.previous===previous&&seen.current===next;}),payload=JSON.parse(latest.payload_json);
  assert.equal(latest.actor_id,actor);assert.equal(payload.previous,previous);assert.equal(payload.current,next);
  assert.equal(payload.previousOwnerName,previous?names.get(previous):null);assert.equal(payload.currentOwnerName,next?names.get(next):null);
  const after=(await read()).record;
  for(const field of ['score','band','queue_state','queue_reason','lifecycle','stage_id'])assert.equal(after[field],scored[field],`Owner change leaves ${field} unchanged`);
  assert.equal(await evaluations(),evaluationsBefore,'Owner change does not re-score the deal');
 }
 await change(null,other,1);
 await change(other,actor,2);
 await change(actor,null,3);
 const unchanged=await call(`records/opportunity/${deal.id}`,'PATCH',{changes:{owner_id:null},base:{owner_id:null}});assert.equal(unchanged.changed,false);assert.equal((await changes()).length,3,'Choosing the same owner records nothing');
 // A departed operator cannot own a deal, and erasing them removes their name from the deal's owner history.
 const gone=await call('settings/operators','POST',{email:`synthetic-orbit-gone${'@'}opportunity-owner.test`,displayName:'Departed rep'},201);
names.set(gone.id,'Departed rep');
 await change(null,gone.id,4);await change(gone.id,null,5);
 assert.ok(JSON.stringify(await read()).includes('Departed rep'),'The owner history names the operator while they exist');
 await call(`settings/operators/${gone.id}`,'DELETE',{confirmed:true});
 await call(`settings/operators/${gone.id}/erase`,'POST',{confirmed:true});
 assert.ok(!JSON.stringify(await read()).includes('Departed rep'),'Erasing an operator erases their name from deal history');
 await call(`records/opportunity/${deal.id}`,'PATCH',{changes:{owner_id:gone.id},base:{owner_id:null}},400);
 assert.equal((await read()).record.owner_id,null);assert.equal((await changes()).length,5);
}
