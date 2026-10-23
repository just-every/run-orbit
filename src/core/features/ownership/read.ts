import type {Ownership,OwnershipKind} from './types';
export async function ownershipForRecords(db:D1Database,kind:OwnershipKind,ids:string[]){
 const rows=(await db.prepare('SELECT x.record_id,x.owner_id,o.display_name AS owner_name,x.revision FROM record_ownership x LEFT JOIN operators o ON o.id=x.owner_id WHERE x.record_type=? AND x.record_id IN(SELECT value FROM json_each(?))').bind(kind,JSON.stringify(ids)).all<{record_id:string;owner_id:string|null;owner_name:string|null;revision:number}>()).results;
 return new Map(rows.map(row=>[row.record_id,{ownerId:row.owner_id,ownerName:row.owner_name,revision:row.revision} satisfies Ownership]));
}
export async function readOwnership(db:D1Database,kind:OwnershipKind,id:string):Promise<Ownership>{
 return (await ownershipForRecords(db,kind,[id])).get(id)??{ownerId:null,ownerName:null,revision:0};
}
