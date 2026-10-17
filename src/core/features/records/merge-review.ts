import {recordSource} from '../ownership/storage';
import {type RecordKind} from './shared';

export type MergeReview={survivor:string;retired:string};

/** Contactability is not an operator choice: the merge batch always inherits the strictest current state, including a stop that lands after review. */
const inheritedState=new Set(['contactability','contactability_revision','updated_at']);
const reviewedFields=(record:Record<string,unknown>)=>Object.keys(record).filter(key=>!inheritedState.has(key)).sort();

/** A review identifies every displayed value of the row, including same-timestamp edits. */
export async function mergeReviewToken(record:Record<string,unknown>){
 const snapshot=JSON.stringify(reviewedFields(record).map(key=>[key,record[key]]));
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot));
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

/** D1 rolls the whole merge batch back if either reviewed row changed after reading. */
export function mergeReviewFence(db:D1Database,kind:Exclude<RecordKind,'opportunity'>,records:Record<string,unknown>[]){
 const bindings:unknown[]=[];
 const matches=records.map(record=>{
  const fields=reviewedFields(record);bindings.push(...fields.map(field=>record[field]));
  return `EXISTS(SELECT 1 FROM ${recordSource(kind)} WHERE ${fields.map(field=>`"${field.replaceAll('"','""')}" IS ?`).join(' AND ')})`;
 });
 return db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'record_merge_review',NULL WHERE NOT (${matches.join(' AND ')})`).bind(...bindings);
}
