import {signalEntries} from './signal-lines';

export interface EvidenceLabel {id:string;title:string;occurredAt:string|null;href:string}

/** Names each cited evidence ID on an opportunity and links it to where a person can read it. */
export async function evidenceLabels(db:D1Database,opportunityId:string,ids:string[]):Promise<EvidenceLabel[]>{
 if(!ids.length)return [];
 const list=JSON.stringify(ids),page=`/app/opportunities/${opportunityId}`;
 const [signals,entries,drafts,handoffs,linked]=await Promise.all([
  db.prepare('SELECT id,type,subject,occurred_at AS occurredAt FROM signals WHERE id IN (SELECT value FROM json_each(?))').bind(list).all<{id:string;type:string;subject:string|null;occurredAt:string}>(),
  db.prepare("SELECT id,kind,occurred_at AS occurredAt,coalesce(json_extract(payload_json,'$.subject'),json_extract(payload_json,'$.title'),json_extract(payload_json,'$.text')) AS title FROM timeline_entries WHERE id IN (SELECT value FROM json_each(?))").bind(list).all<{id:string;kind:string;occurredAt:string;title:string|null}>(),
  db.prepare('SELECT id,subject,created_at AS occurredAt FROM drafts WHERE id IN (SELECT value FROM json_each(?))').bind(list).all<{id:string;subject:string;occurredAt:string}>(),
  db.prepare('SELECT id,title,updated_at AS occurredAt FROM handoff_tasks WHERE id IN (SELECT value FROM json_each(?))').bind(list).all<{id:string;title:string;occurredAt:string}>(),
  signalEntries(db,ids)]);
 const found=new Map<string,EvidenceLabel>();
 for(const row of signals.results){const entry=linked.get(row.id)?.find(item=>item.ref.type==='opportunity'&&item.ref.id===opportunityId);found.set(row.id,{id:row.id,title:row.subject||row.type,occurredAt:row.occurredAt,href:entry?`${page}#entry-${entry.entryId}`:page});}
 for(const row of entries.results)found.set(row.id,{id:row.id,title:String(row.title??row.kind).split('\n')[0]!,occurredAt:row.occurredAt,href:`${page}#entry-${row.id}`});
 for(const row of drafts.results)found.set(row.id,{id:row.id,title:`Draft: ${row.subject}`,occurredAt:row.occurredAt,href:`/app/drafts/${row.id}`});
 for(const row of handoffs.results)found.set(row.id,{id:row.id,title:`Handoff: ${row.title}`,occurredAt:row.occurredAt,href:`${page}#handoff-${row.id}`});
 return ids.map(id=>found.get(id)??{id,title:id===opportunityId?'This opportunity':id,occurredAt:null,href:page});
}
