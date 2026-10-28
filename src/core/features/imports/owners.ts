import {canonicalJson,sha256,type D1ImportContext,type TargetEffect} from '../../../modules/import-kit/d1/index';
import type {ImportInput} from './contracts';
import type {Row} from './source';
import {ownerRead,type OwnerValue} from './targets-owner';
export const fullOwnerSql="SELECT o.id,o.email,o.display_name FROM operators o JOIN access_memberships m ON m.operator_id=o.id WHERE o.status='active' AND m.workspace_id='workspace' AND m.status='active' AND m.role='legacy_operator' AND NOT EXISTS(SELECT 1 FROM access_collaborators c WHERE c.operator_id=o.id)";
/** Resolve only an exact mailbox or a deliberate saved value-to-user choice. */
export async function importOwners(input:ImportInput,context:D1ImportContext,rows:Row[],namespace:string,at:string){
 const db=context.storage.database,operators=(await db.prepare(fullOwnerSql).all()).results;
 const choices=new Map<Row,{owner:string|null;explicit:boolean}>();
 for(const row of rows){if(row.kind!=='contact'&&row.kind!=='company'||!row.data.owner)continue;
  const mappings=input.ownerMappings?.[row.kind],explicit=!!mappings&&Object.hasOwn(mappings,row.data.owner),selected=explicit?mappings![row.data.owner]:operators.find(o=>o.email===row.data.owner)?.id;
  if(selected!==undefined&&selected!==null&&!operators.some(o=>o.id===selected))throw new Error('An owner mapping names an inactive or unavailable full operator. Run a new dry run.');
  if(selected!==undefined)choices.set(row,{owner:selected,explicit});
  row.source.payload={...row.source.payload as object,ownerReview:{value:row.data.owner,matched:selected!==undefined,ownerId:selected??null,explicit}};row.source.payloadHash=sha256(canonicalJson(row.source.payload));
  // Include the reviewed mapping in source identity reconciliation as well as the effect fingerprint.
  if(explicit){row.source.payload={...row.source.payload as object,ownerMapping:selected};row.source.payloadHash=sha256(canonicalJson(row.source.payload));}
 }
 async function effect(row:Row,id:string,name:string):Promise<TargetEffect[]>{
  const choice=choices.get(row);if(!choice)return [];
  const targetId=`${row.kind}:${id}`,before=await ownerRead(db,'workspace',targetId),current=before?.value as unknown as OwnerValue|undefined;
  const sourceKey=`${namespace}:${row.kind}:${row.id}`;
  if(current?.attribution?.sourceKey===sourceKey)return[{targetKind:'owner',targetId,value:current as any,...current.attribution.expectedRevision?{expectedRevision:current.attribution.expectedRevision}:{}}];
  // A mailbox match fills empty ownership. Reassignment needs an explicit value mapping.
  if(current?.row.owner_id&&!choice.explicit||current?.row.owner_id===choice.owner||!current&&choice.owner===null)return [];
  const previous=current?.row.owner_id??null;
  const value:OwnerValue={row:{record_type:row.kind as 'contact'|'company',record_id:id,owner_id:choice.owner,revision:(current?.row.revision??0)+1,updated_at:at},attribution:{sourceKey,...before?{expectedRevision:before.revision}:{},actorId:context.authorization.principalId,recordName:name,previousOwnerId:previous,source:input.vendor,account:input.account}};
  return[{targetKind:'owner',targetId,value:value as any,...before?{expectedRevision:before.revision}:{}}];
 }
 return{effect};
}
