import {sha256,type ImportPlan,type D1Sql} from '../../../modules/import-kit/d1/index';
/** The uploaded bytes can expand beyond D1's single-value bound in a plan. Keep exact review bytes in bounded private chunks. */
export function reviewStatements(db:D1Database,id:string,actor:string,plan:ImportPlan,authority:D1Sql){
 const json=JSON.stringify(plan),chunks:string[]=[];
 for(let start=0;start<json.length;){let end=Math.min(start+300_000,json.length);if(end<json.length&&/[\uD800-\uDBFF]/.test(json[end-1]))end--;chunks.push(json.slice(start,end));start=end;}
 const manifest=JSON.stringify({chunks:chunks.length,sha256:sha256(json)}),fence=()=>db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'crm_review_authority',NULL WHERE NOT (${authority.sql})`).bind(...authority.params??[]);
 return [fence(),db.prepare('INSERT INTO crm_import_reviews(id,actor_id,namespace,fingerprint,plan_json,created_at) VALUES(?,?,?,?,?,?)').bind(id,actor,plan.namespace,plan.fingerprint,manifest,new Date().toISOString()),...chunks.map((body,ordinal)=>db.prepare('INSERT INTO crm_import_review_chunks VALUES(?,?,?)').bind(id,ordinal,body)),fence()];
}
export async function reviewPlan(db:D1Database,id:string,manifest:string){
 if(manifest==='null')return manifest;
 const expected=JSON.parse(manifest),chunks=(await db.prepare('SELECT ordinal,body FROM crm_import_review_chunks WHERE review_id=? ORDER BY ordinal').bind(id).all<{ordinal:number;body:string}>()).results;
 if(chunks.length!==expected.chunks||chunks.some((chunk,index)=>chunk.ordinal!==index))throw new Error('Saved review chunks are incomplete.');
 const body=chunks.map(chunk=>chunk.body).join('');if(sha256(body)!==expected.sha256)throw new Error('Saved review changed. Run a new dry run.');return body;
}
