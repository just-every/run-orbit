import {requireRecord,type RecordKind} from '../records/shared';
import {recordKind,type WorkflowContext,type WorkflowRecordAction} from './record-types';

export type RecordTarget={id:string;kind:RecordKind};
export function targetKind(trigger:RecordKind,target='trigger'):RecordKind {
 if(target==='trigger')return trigger;
 if(target==='primary_contact'&&trigger==='company')throw new Error('Companies have no native primary contact designation.');
 if(target.startsWith('contacts_by_role:')&&(trigger!=='opportunity'||!target.slice(17).trim()))throw new Error('A named deal role target requires a triggering deal.');
 if(target==='associated_deals'&&trigger==='opportunity')throw new Error('Associated deals require a triggering company or contact.');
 if(['primary_company','company'].includes(target))return 'company';
 if(['primary_contact','associated_contacts','all_contacts'].includes(target)||target.startsWith('contacts_by_role:'))return 'contact';
 if(target==='associated_deals')return 'opportunity';
 throw new Error(`Unsupported workflow record target: ${target}.`);
}
export async function resolveRecordTargets(context:WorkflowContext,action:WorkflowRecordAction,target=action.target??'trigger'):Promise<RecordTarget[]> {
 const {db}=context,kind=recordKind(context.recordType),root=context.triggerSnapshots?.get(`${kind}:${context.recordId}`)??await requireRecord(db,kind,context.recordId);
 const resultKind=targetKind(kind,target);
 if(target==='trigger')return [{kind,id:root.id}];
 if(target==='company'||target==='primary_company')return kind==='company'?[{kind,id:root.id}]:root.company_id?[{kind:'company',id:root.company_id}]:[];
 if(resultKind==='contact'){
  if(kind==='contact'){
   if(target.startsWith('contacts_by_role:'))throw new Error('A deal role target requires a triggering deal.');
   return [{kind,id:root.id}];
  }
  if(kind==='company'){
   if(target==='primary_contact')throw new Error('Companies have no native primary contact designation.');
   if(target.startsWith('contacts_by_role:'))throw new Error('A deal role target requires a triggering deal.');
   const rows=await db.prepare('SELECT id FROM contacts WHERE company_id=? OR EXISTS(SELECT 1 FROM contact_company_relationships r WHERE r.contact_id=contacts.id AND r.company_id=?) ORDER BY id').bind(root.id,root.id).all<{id:string}>();
   return rows.results.map(row=>({kind:'contact',id:row.id}));
  }
  if(context.triggerSnapshots&&Array.isArray(root.contact_ids)&&!target.startsWith('contacts_by_role:')){const ids=target==='primary_contact'?(root.primary_contact_id?[root.primary_contact_id]:[]):root.contact_ids;return ids.map((id:string)=>({kind:'contact' as const,id}));}
  const role=target.startsWith('contacts_by_role:')?target.slice(17):null;
  if(role!==null&&!role.trim())throw new Error('Name the associated contact role.');
  const rows=await db.prepare(`SELECT contact_id AS id FROM opportunity_contacts c WHERE opportunity_id=? ${target==='primary_contact'?'AND is_primary=1':''} ${role!==null?'AND EXISTS(SELECT 1 FROM opportunity_stakeholder_roles r,json_each(r.roles_json) role WHERE r.opportunity_id=c.opportunity_id AND r.contact_id=c.contact_id AND role.value=?)':''} ORDER BY contact_id`).bind(root.id,...(role!==null?[role]:[])).all<{id:string}>();
  return rows.results.map(row=>({kind:'contact',id:row.id}));
 }
 if(kind==='opportunity')throw new Error('Associated deals require a triggering company or contact.');
 const rows=await db.prepare(`SELECT o.id FROM opportunities o JOIN pipeline_stage_rules r ON r.stage_id=o.stage_id WHERE ${kind==='company'?'o.company_id=?':'EXISTS(SELECT 1 FROM opportunity_contacts c WHERE c.opportunity_id=o.id AND c.contact_id=?)'} ${action.pipelineId?'AND r.pipeline_id=?':''} ${action.stage&&action.kind!=='move_stage'?'AND o.stage_id=?':''} ORDER BY o.id`).bind(root.id,...(action.pipelineId?[action.pipelineId]:[]),...(action.stage&&action.kind!=='move_stage'?[action.stage]:[])).all<{id:string}>();
 return rows.results.map(row=>({kind:'opportunity',id:row.id}));
}
