import {AccessError} from '../access/errors';
import {RecordError} from '../records/shared';
import type {Publication} from './service';
import type {FormIntake} from './definition';
export interface Refusal {id:string;payload_hash:string|null;reason:string;state:string|null;receipt_json:string|null}
export async function previousRefusal(db:D1Database,formId:string,key:string,hash:string){
 const row=await db.prepare('SELECT r.id,r.payload_hash,r.reason,s.state,s.receipt_json FROM form_abuse_refusals r LEFT JOIN form_spam s ON s.id=r.id WHERE r.form_id=? AND r.idempotency_key=?').bind(formId,key).first<Refusal>();
 if(row&&row.payload_hash!==hash)throw new AccessError('conflict','This submission key was already used with different contents.');return row;
}
export function refusalResult(row:Refusal):never|Record<string,unknown>{if(row.state==='released'&&row.receipt_json)return {...JSON.parse(row.receipt_json),replayed:true};throw new RecordError(row.reason==='rate_limit'?429:400,`Form submission refused: ${row.reason}.`);}
export async function recordRefusal(db:D1Database,operation:Publication,reason:string,intake?:FormIntake,hash?:string){
 const id=crypto.randomUUID(),guard=crypto.randomUUID(),at=new Date().toISOString();
 const statements=[db.prepare("INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM publication_targets WHERE operation_id=?) AND NOT EXISTS(SELECT 1 FROM marketing_form_submissions WHERE form_id=? AND idempotency_key=?) THEN 1 ELSE 0 END)").bind(guard,operation.id,operation.form_id,intake?.idempotencyKey??''),db.prepare('INSERT INTO form_abuse_refusals VALUES(?,?,?,?,?,?,?)').bind(id,operation.form_id,operation.id,intake?.idempotencyKey??null,hash??null,reason,at)];
 if(intake){const {fillToken,turnstileToken,honeypot,...semantic}=intake;statements.push(db.prepare("INSERT INTO form_spam VALUES(?,?,?,'pending',NULL)").bind(id,JSON.stringify(intake.values),JSON.stringify(semantic)));}
 statements.push(db.prepare('DELETE FROM access_write_guards WHERE id=?').bind(guard));
 try{await db.batch(statements);}catch(error){if(intake&&hash){const previous=await previousRefusal(db,operation.form_id,intake.idempotencyKey,hash);if(previous)return previous;const accepted=await db.prepare('SELECT id,payload_hash,review_required FROM marketing_form_submissions WHERE form_id=? AND idempotency_key=?').bind(operation.form_id,intake.idempotencyKey).first<{id:string;payload_hash:string;review_required:number}>();if(accepted){if(accepted.payload_hash!==hash)throw new AccessError('conflict','This submission key was already used with different contents.');return {id:accepted.id,payload_hash:hash,reason,state:'released',receipt_json:JSON.stringify({submissionId:accepted.id,reviewRequired:Boolean(accepted.review_required)})};}}throw error;}
 return {id,payload_hash:hash??null,reason,state:intake?'pending':null,receipt_json:null};
}
