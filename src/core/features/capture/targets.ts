import {targetsFor,type SignalTarget} from '../ingestion/linking-repository';

/** The company of each linked contact or opportunity, so captured evidence lands on the account too. */
export async function companyTargets(db:D1Database,targets:SignalTarget[]){
 const ids=new Set<string>();
 for(const target of targets){
  const row=target.type==='contact'?await db.prepare('SELECT company_id AS id FROM contacts WHERE id=?').bind(target.id).first<{id:string|null}>():target.type==='opportunity'?await db.prepare('SELECT company_id AS id FROM opportunities WHERE id=?').bind(target.id).first<{id:string|null}>():null;
  if(row?.id)ids.add(row.id);
 }
 return [...ids].filter(id=>!targets.some(t=>t.type==='company'&&t.id===id)).map(id=>({type:'company' as const,id,basis:'Company of a linked record'}));
}
/** The records a reviewed link appends to: each contact, its company, and its opportunities (SIGNAL-004). */
export async function linkTargets(db:D1Database,contactIds:string[],companyId:string|null,basis:string){
 const targets:SignalTarget[]=[];
 for(const id of contactIds)for(const target of await targetsFor(db,{type:'contact',id,basis}))if(!targets.some(t=>t.type===target.type&&t.id===target.id))targets.push(target);
 if(!contactIds.length&&companyId)targets.push({type:'company',id:companyId,basis});
 return [...targets,...await companyTargets(db,targets)];
}
