import {canonicalJson,type D1Database,type ImportPlan,type TargetEffect} from '../../../modules/import-kit/d1/index';
import type {ImportInput} from './contracts';
import type {Row} from './source';
import {nativeId} from './source';

export const activeOwnerSql="SELECT o.id,o.email,o.display_name AS name FROM operators o JOIN access_memberships m ON m.operator_id=o.id WHERE o.status='active' AND m.workspace_id='workspace' AND m.status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=o.id)";
export async function importOwners(db:D1Database){return (await db.prepare(`${activeOwnerSql} ORDER BY o.display_name,o.email`).all()).results as {id:string;email:string;name:string}[];}

/** Exact mailbox matching only; an explicit null deliberately overrides a match. */
export async function resolveImportOwners(db:D1Database,input:ImportInput,rows:Row[]){
 const users=await importOwners(db),byId=new Map(users.map(user=>[user.id,user]));
 for(const row of rows){
  if(row.kind!=='contact'&&row.kind!=='company')continue;
  const value=row.data.owner;if(!value)continue;
  const mapping=input.owners?.[row.kind],explicit=!!mapping&&Object.hasOwn(mapping,value),id=explicit?mapping![value]:undefined;
  const matches=users.filter(user=>user.email.toLowerCase()===value.toLowerCase());
  const user=explicit?(id?byId.get(id):undefined):matches.length===1?matches[0]:undefined;
  if(explicit&&id&&!user)throw new Error('An owner mapping names an inactive or unavailable Orbit user. Run a new dry run.');
  row.ownerMapping={value,ownerId:user?.id??null,ownerName:user?.name??null,method:user&&matches.length===1&&matches[0].id===user.id?'email':explicit?'explicit':'unmatched'};
  if(user)(row.source.payload as any).ownerMapping={value,ownerId:user.id};
 }
}

export function importedOwnerEffects(row:Row,id:string,namespace:string,at:string):TargetEffect[]{
 const mapping=row.ownerMapping;if(!mapping?.ownerId)return [];
 const historyId=nativeId(namespace,'owner-history',`${row.kind}:${row.id}`),source=`${namespace} CSV import`;
 return [{targetKind:`${row.kind}-owner`,targetId:id,value:{record_id:id,owner_id:mapping.ownerId,owner_revision:1}},
  {targetKind:'note',targetId:historyId,value:{row:{id:historyId,kind:'owner.changed',occurred_at:at,recorded_at:at,actor_type:'source',actor_id:null,source:namespace,payload_json:canonicalJson({previous:null,current:mapping.ownerId,previousOwnerId:null,previousOwnerName:null,ownerId:mapping.ownerId,ownerName:mapping.ownerName,source,operationId:namespace})},links:[{timeline_entry_id:historyId,record_type:row.kind,record_id:id}]}}];
}

export function ownerReview(plan:ImportPlan){
 const values=new Map<string,any>();
 for(const entry of plan.entries){if(entry.source.kind!=='contact'&&entry.source.kind!=='company')continue;const payload=entry.source.payload as any,diagnostic=plan.source.diagnostics.find(item=>item.code==='ORBIT_OWNER_MAPPING'&&item.kind===entry.source.kind&&item.sourceId===entry.source.sourceId),mapping=diagnostic?JSON.parse(diagnostic.message):payload.ownerMapping??(payload.data?.owner?{value:payload.data.owner,ownerId:null,ownerName:null,method:'unmatched'}:null);if(!mapping)continue;
  const key=canonicalJson([entry.source.kind,mapping.value]),group=values.get(key)??{kind:entry.source.kind,...mapping,count:0,linkedCount:0,rejectedCount:0};group.count++;
  if(entry.rejection)group.rejectedCount++;else if(entry.effects.some(effect=>effect.targetKind==='reference')||entry.unmapped.some(item=>item.field==='owner-review'))group.linkedCount++;
  values.set(key,group);
 }
 return [...values.values()];
}
