import assert from 'node:assert/strict';

interface SourceClient {
 request(path:string,method?:string,body?:unknown):Promise<Response>;
 signed(secret:string,id?:string):Promise<Response>;
}
interface RemovedSourceProof {id:string;name:string;secret:string;source:Record<string,unknown>;signalId:string;signal:Record<string,unknown>;timeline:Record<string,unknown>;links:Record<string,unknown>[]}
export async function removeSourceWithEvidence(db:D1Database,client:SourceClient,contactId:string):Promise<RemovedSourceProof>{
 const id='retired-website',name='Previous website inquiries';
 const connected=await client.request(`/${id}`,'PUT',{name,enabled:true});assert.equal(connected.status,200);
 const {secret}=await connected.json() as {secret:string};
 const accepted=await client.signed(secret,id);assert.equal(accepted.status,201);
 const {id:signalId}=await accepted.json() as {id:string};
 const signal=await db.prepare('SELECT * FROM signals WHERE id=?').bind(signalId).first();
 const timeline=await db.prepare('SELECT * FROM timeline_entries WHERE id=?').bind(signalId).first();
 const links=(await db.prepare('SELECT * FROM signal_links WHERE signal_id=?').bind(signalId).all()).results;
 assert.ok(signal&&timeline);assert.ok(links.some(row=>row.record_id===contactId));
 assert.equal((await client.request(`/${id}`,'DELETE',{})).status,400);
 assert.equal((await client.request('').then(r=>r.json()) as any).sources.some((source:any)=>source.id===id),true);
 assert.equal((await client.request(`/${id}`,'DELETE',{confirmed:true})).status,200);
 const source=await db.prepare('SELECT * FROM signal_sources WHERE id=?').bind(id).first();
 assert.ok(source?.removed_at);assert.equal(source.enabled,0);assert.equal(source.secret_ciphertext,null);assert.equal(source.name,name);
 const proof={id,name,secret,source,signalId,signal,timeline,links};
 await assertRemovedSourceEvidence(db,client,proof,contactId);
 assert.equal((await client.request(`/${id}`,'DELETE',{confirmed:true})).status,404);
 return proof;
}

export async function assertRemovedSourceEvidence(db:D1Database,client:SourceClient,proof:RemovedSourceProof,contactId:string){
 assert.equal((await client.request('').then(r=>r.json()) as any).sources.some((source:any)=>source.id===proof.id),false);
 assert.equal((await client.signed(proof.secret,proof.id)).status,403);
 assert.equal((await client.request(`/${proof.id}/test`,'POST',{contactId})).status,403);
 assert.equal((await client.request(`/${proof.id}`,'PATCH',{enabled:true})).status,404);
 assert.equal((await client.request(`/${proof.id}`,'PUT',{name:proof.name,enabled:true})).status,404);
 assert.deepEqual(await db.prepare('SELECT * FROM signal_sources WHERE id=?').bind(proof.id).first(),proof.source);
 assert.deepEqual(await db.prepare('SELECT * FROM signals WHERE id=?').bind(proof.signalId).first(),proof.signal);
 assert.deepEqual(await db.prepare('SELECT * FROM timeline_entries WHERE id=?').bind(proof.signalId).first(),proof.timeline);
 assert.deepEqual((await db.prepare('SELECT * FROM signal_links WHERE signal_id=?').bind(proof.signalId).all()).results,proof.links);
 const named=await db.prepare('SELECT s.name FROM timeline_entries t JOIN signal_sources s ON s.id=t.source WHERE t.id=?').bind(proof.signalId).first();
 assert.equal(named?.name,proof.name,'Past evidence keeps its recorded source name');
}
