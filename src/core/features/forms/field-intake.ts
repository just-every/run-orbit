import {typedFieldFences} from '../records/typed-fields';
import {proposalStatements,type ProposalDraft} from '../capture/proposals';
import {createId} from '../../shared/ids';
import {tables,type RecordKind} from '../records/shared';
export interface FieldIntake {statements:D1PreparedStatement[];proposals:ProposalDraft[]}
/** Empty values can be filled. Every populated disagreement remains a proposal. */
export async function existingFieldIntake(db:D1Database,kind:'contact'|'company',record:Record<string,any>,values:Record<string,any>,at:string):Promise<FieldIntake>{
 const custom=JSON.parse(record.custom_fields_json??'{}'),nextCustom={...custom},updates:Record<string,unknown>={},proposals:ProposalDraft[]=[];
 const mappings=Object.entries(values).flatMap(([field,value])=>field==='custom_fields'?Object.entries(value).map(([key,v])=>[`custom.${key}`,v] as const):[[field,value] as const]);
 for(const [field,value]of mappings){
  if(field==='email'||field==='primary_domain')continue;
  const previous=field.startsWith('custom.')?custom[field.slice(7)]:record[field];
  if(previous===value)continue;
  if(previous===null||previous===undefined||previous===''){if(field.startsWith('custom.'))nextCustom[field.slice(7)]=value;else updates[field]=value;}
  else proposals.push({kind:'set_field',recordType:kind,recordId:record.id,field,value:typeof value==='string'?value:JSON.stringify(value),current:typeof previous==='string'?previous:JSON.stringify(previous),details:{formField:true,valueType:typeof value==='number'?'number':typeof value==='boolean'?'boolean':'text',companyId:kind==='contact'?record.company_id:null}});
 }
 if(JSON.stringify(custom)!==JSON.stringify(nextCustom))updates.custom_fields_json=JSON.stringify(nextCustom);
 const statements:D1PreparedStatement[]=await typedFieldFences(db,kind,record.id,nextCustom,custom);
 if(Object.keys(updates).length){
  const columns=Object.keys(updates);statements.push(db.prepare(`UPDATE ${tables[kind]} SET ${columns.map(field=>`${field}=?`).join(',')},updated_at=? WHERE id=?`).bind(...Object.values(updates),at,record.id));
  if(kind==='contact')statements.push(db.prepare("UPDATE drafts SET is_stale=1,stale_reason='Contact changed',updated_at=? WHERE recipient_contact_id=?").bind(at,record.id));
  const entry=createId();statements.push(db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,'form.fields_filled',?,?,'source',NULL,'forms',?)").bind(entry,at,at,JSON.stringify({fields:columns})),db.prepare('INSERT INTO timeline_entry_records VALUES(?,?,?)').bind(entry,kind,record.id));
 }
 return{statements,proposals};
}
export function formFieldProposals(db:D1Database,source:string,signalId:string,submissionId:string,formId:string,values:unknown,drafts:ProposalDraft[],at:string){return proposalStatements(db,source,signalId,submissionId,{formId,submissionId,values},drafts,at);}
export function recordSnapshotFence(db:D1Database,kind:RecordKind,record:Record<string,any>){return db.prepare(`INSERT INTO runtime_controls(name,value) SELECT 'form_${kind}_fence',NULL WHERE NOT EXISTS(SELECT 1 FROM ${tables[kind]} WHERE id=? AND updated_at=? AND custom_fields_json IS ?${kind==='contact'?' AND contactability_revision=?':''})`).bind(record.id,record.updated_at,record.custom_fields_json??'{}',...(kind==='contact'?[record.contactability_revision]:[]));}
