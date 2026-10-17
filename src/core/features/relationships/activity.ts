import {createId} from '../../shared/ids';
import {audit,type RecordKind} from '../records/shared';

export type RelationshipReference={kind:RecordKind;id:string};
/** Native RecordEditor integration: primary changes are explicit relationship events too. */
export function contactPrimaryCompanyActivity(db:D1Database,actor:string,contactId:string,previous:string|null,current:string|null,at=new Date().toISOString()){
 if(previous===current)return [];
 return relationshipActivity(db,actor,'relationship.primary_company_changed','Changed the primary company',
  [{kind:'contact',id:contactId},...[...new Set([previous,current].filter((id):id is string=>!!id))].map(id=>({kind:'company' as const,id}))],
  {contactId,previous,current},at);
}
/** Links describe the event at its time; later association edits never move these entries. */
export function relationshipActivity(db:D1Database,actor:string,event:string,text:string,refs:RelationshipReference[],details:Record<string,unknown>={},at=new Date().toISOString()){
 const id=createId(),unique=[...new Map(refs.map(ref=>[`${ref.kind}:${ref.id}`,ref])).values()];
 return [
  db.prepare("INSERT INTO timeline_entries(id,kind,occurred_at,recorded_at,actor_type,actor_id,source,payload_json) VALUES(?,?,?,?,'operator',?,'records',?)").bind(id,event,at,at,actor,JSON.stringify({text,...details})),
  ...unique.map(ref=>db.prepare('INSERT INTO timeline_entry_records VALUES(?,?,?)').bind(id,ref.kind,ref.id)),
  // Personal text lives only in erasable, contact-attributed timeline entries.
  audit(db,actor,event,unique[0].kind,unique[0].id,{recordIds:unique.map(ref=>ref.id)})
 ];
}
