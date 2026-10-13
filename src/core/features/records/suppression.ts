import { createId } from '../../shared/ids';
import { audit, RecordError, requireRecord, timeline } from './shared';

function newPrivacyContext(){
 const random=(size:number)=>Array.from(crypto.getRandomValues(new Uint8Array(size)),byte=>byte.toString(16).padStart(2,'0')).join('');
 return {context_id:random(16),matching_key:random(32)};
}
export function privacyContextStatement(db:D1Database){
 const context=newPrivacyContext();
 return db.prepare('INSERT INTO privacy_matching_contexts(context_id,matching_key) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM privacy_matching_contexts)').bind(context.context_id,context.matching_key);
}
/** Private backup contexts make keyed matching portable without retaining a mailbox. */
export async function privacyMatcher(db:D1Database,staged?:D1PreparedStatement[]){
 const read=()=>db.prepare('SELECT context_id,matching_key FROM privacy_matching_contexts ORDER BY context_id').all<{context_id:string;matching_key:string}>();
 let contexts=(await read()).results;
 if(!contexts.length){
  if(staged){
   const context=newPrivacyContext();contexts=[context];
   // Keep a newly required context in the same atomic batch as its proofs.
   // Concurrent first stops may each create a context; both remain matchable.
   staged.push(db.prepare('INSERT INTO privacy_matching_contexts(context_id,matching_key) VALUES(?,?)').bind(context.context_id,context.matching_key));
  }else{await privacyContextStatement(db).run();contexts=(await read()).results;}
 }
 if(!contexts.length)throw new Error('Privacy matching context is unavailable.');
 if(contexts.some(context=>! /^[a-f0-9]{32}$/.test(context.context_id)||! /^[a-f0-9]{64}$/.test(context.matching_key)))throw new Error('Privacy matching context is invalid.');
 const prepared=await Promise.all(contexts.map(async context=>({id:context.context_id,key:await crypto.subtle.importKey('raw',Uint8Array.from(context.matching_key.match(/../g)??[],value=>parseInt(value,16)),{name:'HMAC',hash:'SHA-256'},false,['sign'])})));
 return async(email:string|null|undefined):Promise<string[]>=>{
  const normalized=email?.trim().toLowerCase();if(!normalized)return [];
  return Promise.all(prepared.map(async context=>{const digest=await crypto.subtle.sign('HMAC',context.key,new TextEncoder().encode(`orbit-mail-suppression-v1:${normalized}`));return context.id+':'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');}));
 };
}
export async function suppressionHashes(db:D1Database,email:string|null|undefined){if(!email?.trim())return [];return (await privacyMatcher(db))(email);}
export async function activeSuppressionTokens(db:D1Database){return new Set((await db.prepare(`SELECT DISTINCT entity_id FROM audit_entries proof WHERE ${activeProof}`).all<{entity_id:string}>()).results.map(row=>row.entity_id));}
/** Only locally derived hexadecimal tokens may be embedded in this SQL fragment. */
const activeProof="proof.action='contact.suppressed' AND NOT EXISTS(SELECT 1 FROM audit_entries cleared,json_each(cleared.details_json,'$.proofs') item WHERE cleared.action='contact.suppression_cleared' AND cleared.entity_id=proof.entity_id AND item.value=proof.id)";
export function suppressionPredicate(tokens:readonly string[]){
 if(tokens.some(token=>! /^[a-f0-9]{32}:[a-f0-9]{64}$/.test(token)))throw new Error('Invalid privacy matching token.');
 return `EXISTS(SELECT 1 FROM audit_entries proof WHERE ${activeProof} AND proof.entity_id IN(${(tokens.length?tokens:['']).map(token=>`'${token}'`).join(',')}))`;
}
/** Fail closed if a concurrent first stop added a context after mailbox hashing. */
export function suppressionContextFence(db:D1Database,tokens:readonly string[]){
 if(!tokens.length)return [];
 suppressionPredicate(tokens); // Validate locally derived tokens before embedding context IDs.
 const contexts=[...new Set(tokens.map(token=>token.slice(0,32)))];
 return [db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'suppression_context_check',NULL WHERE EXISTS(SELECT 1 FROM privacy_matching_contexts WHERE context_id NOT IN(${contexts.map(context=>`'${context}'`).join(',')}))`)];
}
export function suppressionProof(db:D1Database,token:string,condition='1=1',bindings:unknown[]=[]){
 return db.prepare(`INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT ?,NULL,'contact.suppressed','mailbox',?,'{}',? WHERE ${condition} AND NOT EXISTS(SELECT 1 FROM audit_entries proof WHERE proof.entity_id=? AND ${activeProof})`).bind(createId(),token,new Date().toISOString(),...bindings,token);
}
export async function suppressionStatements(db:D1Database,emails:Array<string|null|undefined>){
 const statements:D1PreparedStatement[]=[];if(!emails.some(email=>email?.trim()))return statements;
 const match=await privacyMatcher(db,statements),tokens=[...new Set((await Promise.all(emails.map(email=>match(email)))).flat())];
 return [...statements,...tokens.map(token=>suppressionProof(db,token))];
}
export async function contactSuppressionStatements(db:D1Database,id:string){
 const contact=await db.prepare('SELECT email FROM contacts WHERE id=?').bind(id).first<{email:string|null}>();
 const aliases=(await db.prepare("SELECT identity_key FROM record_aliases WHERE record_type='contact' AND survivor_id=?").bind(id).all<{identity_key:string}>()).results;
 return suppressionStatements(db,[contact?.email,...aliases.map(row=>row.identity_key)]);
}
export function clearSuppressionStatements(db:D1Database,tokens:string[]){
 // Append a truthful clear receipt naming anonymous proofs; never delete or rewrite audit history.
 return tokens.map(token=>db.prepare(`INSERT INTO audit_entries(id,actor_id,action,entity_type,entity_id,details_json,occurred_at) SELECT ?,NULL,'contact.suppression_cleared','mailbox',?,json_object('proofs',json_group_array(proof.id)),? FROM audit_entries proof WHERE proof.entity_id=? AND ${activeProof} HAVING count(*)>0`).bind(createId(),token,new Date().toISOString(),token));
}
export async function clearContactSuppression(db:D1Database,id:string,actor:string,reviewed:{email:string|null;updatedAt:string;revision:number}){
 const record=await requireRecord(db,'contact',id);
 if(record.email!==reviewed.email||record.updated_at!==reviewed.updatedAt||record.contactability_revision!==reviewed.revision)throw new RecordError(409,'Contact changed; review the current contact before clearing do-not-contact.');
 if(!await db.prepare("SELECT id FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)").bind(actor).first())throw new RecordError(409,'An active operator must review this action.');
 const tokens=await suppressionHashes(db,record.email),at=new Date().toISOString();
 const statements=[db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'contact_clear',CASE WHEN EXISTS(SELECT 1 FROM contacts WHERE id=? AND email IS ? AND updated_at=? AND contactability_revision=?) AND EXISTS(SELECT 1 FROM operators WHERE id=? AND status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id)) THEN ? ELSE NULL END").bind(id,reviewed.email,reviewed.updatedAt,reviewed.revision,actor,id),...clearSuppressionStatements(db,tokens)];
 statements.push(db.prepare("UPDATE contacts SET contactability='contactable',updated_at=? WHERE id=?").bind(at,id),...timeline(db,actor,'contact',id,'contactability.cleared',{}),audit(db,actor,'contactability.cleared','contact',id),db.prepare("DELETE FROM runtime_controls WHERE name='contact_clear'"));
 try{await db.batch(statements);}catch(error){if(String(error).includes('runtime_controls.value'))throw new RecordError(409,'Contact changed; review it again.');throw error;}
 return {id};
}
