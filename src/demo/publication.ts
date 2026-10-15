import {compileLanding} from '../core/features/publication/fixed-compiler';
import {hash,insert} from './records';

/** A real compiled form; the demo front gates its entire /p/ path by visitor cookie. */
export async function seedPublication(db:D1Database,owner:string,now:Date){
 const formId='dede0000-0000-4000-8000-000000000001',operation='dede0000-0000-4000-8000-000000000002',artifact='dede0000-0000-4000-8000-000000000003',authority='dede0000-0000-4000-8000-000000000004',slug='team-walkthrough';
 if(await db.prepare('SELECT 1 FROM publication_operations WHERE id=?').bind(operation).first())return;
 const at=now.toISOString(),form={title:'Plan your team walkthrough',fields:[{id:'name' as const,label:'Your name',required:true},{id:'email' as const,label:'Work email',required:true},{id:'message' as const,label:'What would you like to explore?',required:false}],consentWording:'You may contact me about this walkthrough.'},landing={title:'Team walkthrough',heading:'See your customer workflow together',paragraphs:['Tell us about your team and the follow-ups you want to improve.','This is a sample page inside your private Orbit demo. Nothing is sent.']};
 const body=JSON.stringify({form,landing}),html=compileLanding({form,landing,slug,revision:1,operationId:operation}),artifactHash=await hash(html);
 await db.batch([
  insert(db,'content_entities',{id:formId,kind:'form',revision:1,body_json:body,content_hash:await hash(body),created_by:owner,updated_at:at}),
  insert(db,'content_entities',{id:artifact,kind:'artifact',revision:1,body_json:JSON.stringify({html}),content_hash:artifactHash,created_by:owner,updated_at:at}),
  insert(db,'access_form_authorities',{id:authority,form_id:formId,form_revision:1,custodian_id:owner,artifact_hash:artifactHash,max_records:100,expires_at:new Date(now.getTime()+3600000).toISOString()}),
  insert(db,'publication_operations',{id:operation,slug,form_id:formId,form_revision:1,artifact_id:artifact,artifact_hash:artifactHash,authority_id:authority,state:'published',approved_by:owner,approved_at:at,published_at:at,receipt_json:JSON.stringify({provider:'orbit-d1',operationId:operation,artifactHash,formRevision:1,path:`/p/${slug}`,publishedAt:at})}),
  insert(db,'publication_targets',{slug,operation_id:operation,revision:1}),
  insert(db,'signal_sources',{id:`form:${formId}`,name:'Demo sample · walkthrough form',type:'fixed_form',enabled:1,created_at:at,updated_at:at}),
 ]);
}
