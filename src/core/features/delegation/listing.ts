import {deny,type Grant} from './protocol';

/** Each readable target kind, its table and the column a person knows it by. */
const tables={opportunities:{kind:'crm.opportunity',name:'title'},contacts:{kind:'crm.contact',name:"COALESCE(NULLIF(name,''),email)"},companies:{kind:'crm.company',name:'name'},signals:{kind:'crm.signal',name:"COALESCE(NULLIF(subject,''),type)"}} as const;
export interface ListedRecord{target:string;kind:string;name:string}

/** The records a delegation may read, by name: its selected targets, plus the handoffs on its selected
 * opportunities, exactly the targets /evidence accepts. Names and target IDs only; nothing else is read out. */
export async function readableRecords(db:D1Database,grant:Grant):Promise<ListedRecord[]>{
 if(!JSON.parse(grant.scopes_json).includes('crm.evidence.read'))deny(403,'SCOPE_DENIED');
 return recordsFor(db,JSON.parse(grant.targets_json) as string[]);
}
/** Selected targets by name, with the handoffs on selected opportunities; absent records are left out. */
export async function recordsFor(db:D1Database,targets:readonly string[]):Promise<ListedRecord[]>{
 const records:ListedRecord[]=[],seen=new Set<string>(),add=(record:ListedRecord)=>{if(!seen.has(record.target)){seen.add(record.target);records.push(record);}};
 for(const target of targets){
  const [table,id,,handoff]=target.split('/') as [keyof typeof tables,string,string?,string?];
  if(handoff){const task=await db.prepare('SELECT title FROM handoff_tasks WHERE id=? AND opportunity_id=?').bind(handoff,id).first<{title:string}>();if(task)add({target,kind:'crm.handoff',name:task.title});continue;}
  const source=tables[table];if(!source)continue;
  const row=await db.prepare(`SELECT ${source.name} AS name FROM ${table} WHERE id=?`).bind(id).first<{name:string|null}>();if(!row)continue;
  add({target,kind:source.kind,name:row.name??target});
  if(table==='opportunities')for(const task of (await db.prepare('SELECT id,title FROM handoff_tasks WHERE opportunity_id=? ORDER BY created_at,id').bind(id).all<{id:string;title:string}>()).results)add({target:`${target}/handoffs/${task.id}`,kind:'crm.handoff',name:task.title});
 }
 return records;
}

/** One page of readableRecords, narrowed by kind and a case-insensitive name search. */
export function listingPage(records:ListedRecord[],query:{q?:string;kind?:string;cursor?:string;limit?:string}){
 const limit=query.limit===undefined?50:Number(query.limit),offset=query.cursor===undefined?0:Number(query.cursor);
 if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||(query.q?.length??0)>200)deny(400,'INVALID_REQUEST');
 if(query.kind!==undefined&&![...Object.values(tables).map(t=>t.kind),'crm.handoff'].includes(query.kind))deny(400,'INVALID_REQUEST');
 const needle=query.q?.trim().toLowerCase()??'',matching=records.filter(record=>(!query.kind||record.kind===query.kind)&&(!needle||record.name.toLowerCase().includes(needle)));
 const items=matching.slice(offset,offset+limit);
 return{items,nextCursor:offset+limit<matching.length?String(offset+limit):null};
}
