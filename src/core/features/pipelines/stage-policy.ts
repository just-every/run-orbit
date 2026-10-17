import {RecordError} from '../records/shared';
export interface StagePolicy {
 stage_id:string;stage_name:string;pipeline_id:string;pipeline_name:string;
 revision:number;probability:number;required_fields_json:string;stale_interval_days:number|null;
}
export async function stagePolicy(db:D1Database,stageId:string){
 const policy=await db.prepare(`SELECT s.id AS stage_id,s.name AS stage_name,r.pipeline_id,p.name AS pipeline_name,p.revision,r.probability,r.required_fields_json,r.stale_interval_days
 FROM pipeline_stages s JOIN pipeline_stage_rules r ON r.stage_id=s.id JOIN pipelines p ON p.id=r.pipeline_id WHERE s.id=?`).bind(stageId).first<StagePolicy>();
 if(!policy)throw new RecordError(400,'Unknown pipeline stage.');
 return policy;
}
export function assertRequiredFields(policy:StagePolicy,deal:Record<string,unknown>){
 const fields=JSON.parse(policy.required_fields_json) as string[];
 const custom=(deal.custom_fields??JSON.parse(String(deal.custom_fields_json??'{}'))) as Record<string,unknown>;
 const missing=fields.filter(field=>{const value=field.startsWith('custom:')?(Object.hasOwn(custom,field.slice(7))?custom[field.slice(7)]:undefined):deal[field];return value===undefined||value===null||(typeof value==='string'&&!value.trim())||(Array.isArray(value)&&!value.length);});
 if(missing.length)throw new RecordError(409,`Complete required fields for ${policy.stage_name}: ${missing.map(field=>field.startsWith('custom:')?field.slice(7):field.replaceAll('_',' ')).join(', ')}.`);
}
/** Bind the rules and labels reviewed by the request to the transaction that writes. */
export function stagePolicyFence(db:D1Database,policies:StagePolicy[],deal?:{id:string;stage_id:string;updated_at:string}){
 const guard=`pipeline_policy_${crypto.randomUUID()}`;
 const conditions=policies.map(()=>`EXISTS(SELECT 1 FROM pipeline_stages s JOIN pipeline_stage_rules r ON r.stage_id=s.id JOIN pipelines p ON p.id=r.pipeline_id WHERE s.id=? AND s.name=? AND r.pipeline_id=? AND p.name=? AND p.revision=? AND r.probability=? AND r.required_fields_json=? AND r.stale_interval_days IS ?)`);
 const values:unknown[]=policies.flatMap(p=>[p.stage_id,p.stage_name,p.pipeline_id,p.pipeline_name,p.revision,p.probability,p.required_fields_json,p.stale_interval_days]);
 if(deal){conditions.push('EXISTS(SELECT 1 FROM opportunities WHERE id=? AND stage_id=? AND updated_at=?)');values.push(deal.id,deal.stage_id,deal.updated_at);}
 return [db.prepare(`INSERT INTO runtime_controls(name,value) SELECT ?,CASE WHEN ${conditions.join(' AND ')} THEN 'valid' ELSE NULL END`).bind(guard,...values),db.prepare('DELETE FROM runtime_controls WHERE name=?').bind(guard)];
}
