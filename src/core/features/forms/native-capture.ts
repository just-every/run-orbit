import {reconcileLegacyOwnership} from '../ownership/legacy';
import {IngestionRepository} from '../ingestion/repository';
import {targetsFor,type SignalTarget} from '../ingestion/linking-repository';
import {RecordsRepository} from '../records/repository';
import {suppressionContextFence,suppressionHashes} from '../records/suppression';
import {linkTargetFence} from '../ingestion/linking-fence';
import {createId} from '../../shared/ids';
import {RecordError} from '../records/shared';
import type {FormDefinition,FormIntake} from './definition';
import {mappedFormValues} from './mappings';
import {submittedFormValues} from './field-values';
import {existingFieldIntake,formFieldProposals,recordSnapshotFence} from './field-intake';
import {formCompany} from './company-intake';
import {formOpportunity} from './opportunity-intake';
import {formAssignment,formAssignmentTimeline,formSubmissionNotice} from './assignment';
export async function nativeCapture(db:D1Database,input:{form:FormDefinition;intake:FormIntake;formId:string;ownerId:string;operationId:string;artifactHash:string;payloadHash:string}){
 const {form,intake}=input,submitted=submittedFormValues(form,intake.values,intake.consent);
 const values=mappedFormValues(form.fields,submitted),email=String(values.contact.email??'');if(!email)throw new RecordError(400,'Enter a valid email address.');
 const matches=(await db.prepare("SELECT * FROM contacts WHERE email_key=? UNION SELECT c.* FROM record_aliases a JOIN contacts c ON c.id=a.survivor_id WHERE a.record_type='contact' AND a.identity_key=?").bind(email,email).all<Record<string,any>>()).results;
 if(matches.length>1)throw new RecordError(409,'This identity needs operator review before capture.');
 const at=new Date().toISOString(),existing=matches[0],statements:D1PreparedStatement[]=[],company=await formCompany(db,form,values.company,email,input.ownerId,at);
 statements.push(...company.statements);
 const contactValues={...values.contact,contactability:!form.consentWording||intake.consent?'contactable':'do_not_contact',...(company.id&&!company.created?{company_id:company.id}:{})},saved=existing?null:await new RecordsRepository(db).prepareSave('contact',contactValues,input.ownerId,undefined,{ordinaryEdit:true});
 const contactId=existing?.id??saved!.id,submissionId=createId(),signalId=createId(),source=`form:${input.formId}`,event={eventId:submissionId,type:'form.submitted',subject:form.title,occurredAt:at,email,record:{type:'contact' as const,id:contactId}};
 const proposals=[...company.proposals];
 if(saved){statements.push(...saved.statements);if(company.id&&company.created)statements.push(db.prepare('UPDATE contacts SET company_id=?,updated_at=? WHERE id=?').bind(company.id,at,contactId));}
 else{const fields=existingFieldIntake(db,'contact',existing,values.contact,at);statements.push(recordSnapshotFence(db,'contact',existing),...fields.statements);proposals.push(...fields.proposals);
  if(company.id&&!existing.company_id)statements.push(db.prepare('UPDATE contacts SET company_id=?,updated_at=? WHERE id=? AND company_id IS NULL').bind(company.id,at,contactId));
 }
 if(existing)await reconcileLegacyOwnership(db);
 const assignment=await formAssignment(db,form,input.formId,contactId,Boolean(existing),at);statements.push(...assignment.statements,...formAssignmentTimeline(db,contactId,submissionId,assignment.ownerId,assignment.reason,source,at));
 const opportunity=await formOpportunity(db,form,values.opportunity,{newContact:!existing,contactId,companyId:existing?.company_id??company.id,ownerId:assignment.ownerId,email,name:submitted.name,at}),opportunityId=opportunity.id;statements.push(...opportunity.statements);
 statements.push(...suppressionContextFence(db,await suppressionHashes(db,email)),...linkTargetFence(db,{...event,record:undefined} as any,[{type:'contact',id:contactId,basis:'Published form exact email'}],false));
 const contactTarget:SignalTarget={type:'contact',id:contactId,basis:'Published form exact email'},targets=existing?await targetsFor(db,contactTarget):[contactTarget,...(company.id?[{type:'company' as const,id:company.id,basis:'Exact submitted company domain'}]:[]),...(opportunityId?[{type:'opportunity' as const,id:opportunityId,basis:'Created from this enquiry'}]:[])];
 if(existing){statements.push(db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'form_opportunity_fence',NULL WHERE (SELECT json_group_array(opportunity_id) FROM(SELECT opportunity_id FROM opportunity_contacts WHERE contact_id=? ORDER BY opportunity_id))<>?").bind(contactId,JSON.stringify(targets.filter(t=>t.type==='opportunity').map(t=>t.id).sort())));if(company.id&&!existing.company_id&&!targets.some(target=>target.type==='company'&&target.id===company.id))targets.push({type:'company',id:company.id,basis:'Exact submitted company domain'});}
 statements.push(db.prepare("INSERT INTO signals(id,source_id,source_event_id,type,subject,occurred_at,received_at,payload_hash,confidence,linking_basis,created_at,payload_json) VALUES(?,?,?,'form.submitted',?,?,?,?,'observed','Published form exact email',?,?)").bind(signalId,source,submissionId,form.title,at,at,input.payloadHash,at,JSON.stringify({formId:input.formId,operationId:input.operationId,values:submitted})),db.prepare('UPDATE signal_sources SET last_accepted_at=?,updated_at=? WHERE id=?').bind(at,at,source),...await new IngestionRepository(db).linkStatements(signalId,event,targets,source,at,'source',source,{text:submitted.message??''}),...await formFieldProposals(db,source,signalId,submissionId,input.formId,submitted,proposals,at),db.prepare('INSERT INTO marketing_form_submissions VALUES(?,?,?,?,?,?,?,?,?,?)').bind(submissionId,input.formId,input.operationId,intake.idempotencyKey,input.payloadHash,contactId,signalId,JSON.stringify(submitted),Number(Boolean(proposals.length||existing)),at),...formSubmissionNotice(db,submissionId,assignment.ownerId,opportunityId??targets.find(target=>target.type==='opportunity')?.id??null,at));
 if(form.consentWording&&intake.consent)statements.push(db.prepare('INSERT INTO consent_events VALUES(?,?,?,?,?,?,?)').bind(createId(),submissionId,contactId,form.consentWording,intake.revision,input.artifactHash,at));
 return{statements,created:!existing,result:{submissionId,contactId,signalId,reviewRequired:Boolean(proposals.length||existing),...(opportunityId?{opportunityId}:{})}};
}
