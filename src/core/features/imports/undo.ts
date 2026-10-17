import type { D1Database,D1UndoEffect,D1UndoSnapshot,D1UndoDependency } from '../../../modules/import-kit/d1/index';
import { targets,sql } from './targets';
import type { StopValue } from './targets-stop';
import {readUndoTargets} from './undo-targets';
/** Complete incoming relationships are fenced in the same reversal batch. Native edits retain their dependency closure. */
export async function prepareUndo(db:D1Database,destination:string,effects:D1UndoEffect[]):Promise<D1UndoSnapshot>{
 const observations=[],dependencies:D1UndoDependency[]=[],guards=[],byTarget=new Map(effects.map(e=>[`${e.expected.targetKind}:${e.expected.targetId}`,e]));
 const currentValues=await readUndoTargets(db,destination,effects),requiredTargets=JSON.stringify(effects.map(e=>`${e.expected.targetKind}:${e.expected.targetId}`));
 const queries=[
  ...['contact','company'].map(kind=>({sql:`SELECT '${kind}' AS required_kind,record_id AS required_id,'${kind}-owner' AS dependent_kind,record_id AS dependent_id FROM record_owners WHERE record_type='${kind}' AND owner_id IS NOT NULL`})),
  {sql:"SELECT record_kind AS required_kind,record_id AS required_id,'reference' AS dependent_kind,id AS dependent_id FROM crm_import_references"},
  {sql:"SELECT 'company' AS required_kind,company_id AS required_id,'contact' AS dependent_kind,id AS dependent_id FROM contacts WHERE company_id IS NOT NULL"},
  {sql:"SELECT 'company' AS required_kind,company_id AS required_id,'deal' AS dependent_kind,id AS dependent_id FROM opportunities WHERE company_id IS NOT NULL"},
  {sql:"SELECT 'contact' AS required_kind,contact_id AS required_id,'deal' AS dependent_kind,opportunity_id AS dependent_id FROM opportunity_contacts"},
  {sql:"SELECT CASE record_type WHEN 'opportunity' THEN 'deal' ELSE record_type END AS required_kind,record_id AS required_id,'note' AS dependent_kind,timeline_entry_id AS dependent_id FROM timeline_entry_records"},
  {sql:"SELECT 'contact' AS required_kind,recipient_contact_id AS required_id,'draft' AS dependent_kind,id AS dependent_id FROM drafts WHERE recipient_contact_id IS NOT NULL"},
  {sql:"SELECT 'deal' AS required_kind,opportunity_id AS required_id,'draft' AS dependent_kind,id AS dependent_id FROM drafts"},
  {sql:"SELECT 'contact' AS required_kind,contact_id AS required_id,'message' AS dependent_kind,id AS dependent_id FROM outbound_messages WHERE contact_id IS NOT NULL"},
  {sql:"SELECT 'deal' AS required_kind,opportunity_id AS required_id,'message' AS dependent_kind,id AS dependent_id FROM outbound_messages"},
  {sql:"SELECT CASE record_type WHEN 'opportunity' THEN 'deal' ELSE record_type END AS required_kind,record_id AS required_id,'signal' AS dependent_kind,signal_id AS dependent_id FROM signal_links"},
  ...['evaluations','recommendations','handoff_tasks','ai_previews','notifications','evaluation_job_runs'].map(table=>({sql:`SELECT 'deal' AS required_kind,opportunity_id AS required_id,'${table}' AS dependent_kind,${table==='evaluation_job_runs'?'opportunity_id':'id'} AS dependent_id FROM ${table}`})),
  {sql:"SELECT 'contact' AS required_kind,contact_id AS required_id,'handoff' AS dependent_kind,handoff_id AS dependent_id FROM handoff_contacts"},
 ];
 for(const query of queries){const querySql=`SELECT * FROM (${query.sql}) WHERE required_kind||':'||required_id IN(SELECT value FROM json_each(?)) ORDER BY required_kind,required_id,dependent_kind,dependent_id`,rows=(await db.prepare(querySql).bind(requiredTargets).all()).results;
  guards.push(sql(`(SELECT json_group_array(json_array(required_kind,required_id,dependent_kind,dependent_id)) FROM (${querySql}))=?`,requiredTargets,JSON.stringify(rows.map(r=>[r.required_kind,r.required_id,r.dependent_kind,r.dependent_id]))));
  for(const row of rows){const required=byTarget.get(`${row.required_kind}:${row.required_id}`);if(!required)continue;const dependent=byTarget.get(`${row.dependent_kind}:${row.dependent_id}`);dependencies.push({requiredEffectId:required.provenance.id,...dependent?{dependentEffectId:dependent.provenance.id}:{},cause:{table:row.dependent_kind,recordId:row.dependent_id},evidence:{relationship:'native incoming record'}});}
 }
 for(const effect of effects){const {targetKind:kind,targetId:id}=effect.expected,current=currentValues.get(`${kind}:${id}`)??null;
  observations.push({effectId:effect.provenance.id,current,entity:{table:kind,recordId:id}});
  guards.push(targets.matches(current,destination,kind,id));
  if(kind==='suppression'&&current){const stop=current.value as unknown as StopValue;
   const emails=JSON.stringify(stop.emails),query="SELECT id,email,contactability_revision FROM contacts WHERE lower(trim(email)) IN(SELECT value FROM json_each(?)) OR id IN(SELECT survivor_id FROM record_aliases WHERE record_type='contact' AND lower(trim(identity_key)) IN(SELECT value FROM json_each(?))) ORDER BY id",rows=(await db.prepare(query).bind(emails,emails).all()).results;
   guards.push(sql(`(SELECT json_group_array(json_array(id,email,contactability_revision)) FROM (${query}))=?`,emails,emails,JSON.stringify(rows.map(r=>[r.id,r.email,r.contactability_revision]))));
   for(const row of rows){if(stop.contacts.some(c=>c.id===row.id))continue;const dependent=byTarget.get(`contact:${row.id}`);dependencies.push({requiredEffectId:effect.provenance.id,...dependent?{dependentEffectId:dependent.provenance.id}:{},cause:{table:'contacts',recordId:row.id},evidence:{relationship:'mailbox suppression inherited'}});}
  }
 }
 return{observations,dependencies,guards};
}
