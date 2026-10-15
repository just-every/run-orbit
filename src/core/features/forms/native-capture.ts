import {IngestionRepository} from '../ingestion/repository';
import {targetsFor,type SignalTarget} from '../ingestion/linking-repository';
import {RecordsRepository} from '../records/repository';
import {suppressionContextFence,suppressionHashes} from '../records/suppression';
import {linkTargetFence} from '../ingestion/linking-fence';
import {createId} from '../../shared/ids';
import {RecordError} from '../records/shared';
import type {FormDefinition,FormIntake} from './definition';
export async function nativeCapture(db:D1Database,input:{form:FormDefinition;intake:FormIntake;formId:string;ownerId:string;operationId:string;artifactHash:string;payloadHash:string}){
 const {form,intake}=input,allowed=new Set(form.fields.map(f=>f.id));
 if(Object.keys(intake.values).some(key=>!allowed.has(key as any))||form.fields.some(field=>field.required&&!intake.values[field.id]?.trim())||(!form.consentWording&&intake.consent))throw new RecordError(400,'Use the published fields and consent choice.');
 const email=intake.values.email?.trim().toLowerCase();if(!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new RecordError(400,'Enter a valid email address.');
 const matches=(await db.prepare("SELECT id,email,updated_at,contactability_revision FROM contacts WHERE email_key=? UNION SELECT c.id,c.email,c.updated_at,c.contactability_revision FROM record_aliases a JOIN contacts c ON c.id=a.survivor_id WHERE a.record_type='contact' AND a.identity_key=?").bind(email,email).all<{id:string;email:string|null;updated_at:string;contactability_revision:number}>()).results;
 if(matches.length>1)throw new RecordError(409,'This identity needs operator review before capture.');
 const statements:D1PreparedStatement[]=[],existing=matches[0],recordValues={...Object.fromEntries(Object.entries(intake.values).filter(([key])=>['name','email','phone','job_title'].includes(key))),contactability:!form.consentWording||intake.consent?'contactable':'do_not_contact'},saved=existing?null:await new RecordsRepository(db).prepareSave('contact',recordValues,input.ownerId,undefined,{ordinaryEdit:true});
 const contactId=existing?.id??saved!.id,submissionId=createId(),signalId=createId(),at=new Date().toISOString(),source=`form:${input.formId}`,event={eventId:submissionId,type:'form.submitted',subject:form.title,occurredAt:at,email,record:{type:'contact' as const,id:contactId}};
 if(saved)statements.push(...saved.statements);
 else statements.push(db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'form_contact_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM contacts WHERE id=? AND email IS ? AND updated_at=? AND contactability_revision=?)").bind(existing!.id,existing!.email,existing!.updated_at,existing!.contactability_revision));
 statements.push(...suppressionContextFence(db,await suppressionHashes(db,email)),...linkTargetFence(db,{...event,record:undefined} as any,[{type:'contact',id:contactId,basis:'Published form exact email'}],false));
 const contactTarget:SignalTarget={type:'contact',id:contactId,basis:'Published form exact email'},targets=existing?await targetsFor(db,contactTarget):[contactTarget];
 if(existing)statements.push(db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'form_opportunity_fence',NULL WHERE (SELECT json_group_array(opportunity_id) FROM(SELECT opportunity_id FROM opportunity_contacts WHERE contact_id=? ORDER BY opportunity_id))<>?").bind(contactId,JSON.stringify(targets.filter(t=>t.type==='opportunity').map(t=>t.id).sort())));
 statements.push(db.prepare("INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json) VALUES(?,?,?,'form.submitted',?,?,?,?,'observed','Published form exact email',?,?)").bind(signalId,source,submissionId,form.title,at,at,input.payloadHash,at,JSON.stringify({formId:input.formId,operationId:input.operationId,values:intake.values})),db.prepare('UPDATE signal_sources SET last_accepted_at=?,updated_at=? WHERE id=?').bind(at,at,source),...await new IngestionRepository(db).linkStatements(signalId,event,targets,source,at,'source',source,{text:intake.values.message??''}),db.prepare('INSERT INTO marketing_form_submissions VALUES(?,?,?,?,?,?,?,?,?,?)').bind(submissionId,input.formId,input.operationId,intake.idempotencyKey,input.payloadHash,contactId,signalId,JSON.stringify(intake.values),Number(Boolean(existing)),at));
 if(form.consentWording&&intake.consent)statements.push(db.prepare('INSERT INTO consent_events VALUES(?,?,?,?,?,?,?)').bind(createId(),submissionId,contactId,form.consentWording,intake.revision,input.artifactHash,at));
 return{statements,created:!existing,result:{submissionId,contactId,signalId,reviewRequired:Boolean(existing)}};
}
