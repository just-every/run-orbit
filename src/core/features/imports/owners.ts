import type {D1Database,ImportPlan} from '../../../modules/import-kit/d1/index';
import type {ImportInput} from './contracts';
import type {Row} from './source';

export interface ImportOwner {id:string;email:string;display_name:string}
/** Only active full operators can receive native ownership. Assignment grants no access. */
export async function importOwners(db:D1Database):Promise<ImportOwner[]>{
 return (await db.prepare("SELECT id,email,display_name FROM operators WHERE status='active' AND NOT EXISTS(SELECT 1 FROM access_collaborators WHERE operator_id=operators.id) ORDER BY display_name,id").all<ImportOwner>()).results;
}
export function resolveImportOwner(value:string,input:ImportInput,owners:ImportOwner[]){
 if(Object.hasOwn(input.owners??{},value))return owners.find(owner=>owner.id===input.owners?.[value])??null;
 return owners.find(owner=>owner.email===value)??null;
}
/** Resolution is part of the saved source fingerprint, including explicit unassignment. */
export function mapImportOwners(rows:Row[],input:ImportInput,owners:ImportOwner[]){
 for(const id of Object.values(input.owners??{}))if(id!==null&&!owners.some(owner=>owner.id===id))throw new Error('Choose an active full operator for every owner mapping.');
 for(const row of rows)if(['contact','company'].includes(row.kind)&&row.data.owner){
  const owner=resolveImportOwner(row.data.owner,input,owners),payload={...row.source.payload as object,ownerMapping:{value:row.data.owner,ownerId:owner?.id??null,ownerName:owner?.display_name??null,explicit:Object.hasOwn(input.owners??{},row.data.owner)}};
  row.source.payload=payload;
 }
}
export function importOwnerSummary(plan:ImportPlan){
 const groups=new Map<string,{value:string;ownerId:string|null;ownerName:string|null;explicit:boolean;count:number}>();
 for(const entry of plan.entries){const mapping=(entry.source.payload as any).ownerMapping;if(!mapping)continue;const group=groups.get(mapping.value)??{...mapping,count:0};group.count++;groups.set(mapping.value,group);}
 return [...groups.values()].sort((a,b)=>a.value.localeCompare(b.value));
}
