import {createId} from '../../shared/ids';
import {tables,timeline} from '../records/shared';
import {reconcileLegacyOwnership} from './legacy';
import type {OwnershipKind} from './types';

interface OwnedRecord {id:string;title:string;revision:number;updated_at:string;record_revision:number}
type Guard=(condition:string,...values:unknown[])=>D1PreparedStatement;

/** Use the same independent owners as record pages and bulk assignment. */
export async function ownedRecordInventory(db:D1Database,ownerId:string){
 await reconcileLegacyOwnership(db);
 const read=async(kind:OwnershipKind)=>(await db.prepare(`SELECT r.id,COALESCE(r.name,'Unnamed record') AS title,x.revision,r.updated_at,COALESCE(g.revision,0) AS record_revision
  FROM record_ownership x JOIN ${tables[kind]} r ON r.id=x.record_id
  LEFT JOIN graph_records g ON g.workspace_id='workspace' AND g.kind=x.record_type AND g.id=r.id AND g.retired_into_id IS NULL
  WHERE x.record_type=? AND x.owner_id=? ORDER BY r.id`).bind(kind,ownerId).all<OwnedRecord>()).results;
 const [contacts,companies]=await Promise.all([read('contact'),read('company')]);
 return {contacts,companies};
}

/** Added to the removal batch: a changed set aborts revocation and every handover. */
export async function recordHandoverStatements(db:D1Database,input:{kind:OwnershipKind;records:OwnedRecord[];previous:string;previousOwnerName:string;current:string|null;actor:string;operation:string;now:string;guard:Guard}){
 const {kind,records,previous,current,actor,operation,now,guard}=input;
 const receiver=current?await db.prepare('SELECT display_name FROM operators WHERE id=?').bind(current).first<{display_name:string}>():null;
 const statements=[guard(`(SELECT count(*) FROM record_ownership x JOIN ${tables[kind]} r ON r.id=x.record_id WHERE x.record_type=? AND x.owner_id=?)=?`,kind,previous,records.length)];
 for(const record of records)statements.push(
  guard(`EXISTS(SELECT 1 FROM record_ownership x JOIN ${tables[kind]} r ON r.id=x.record_id
   WHERE x.record_type=? AND x.record_id=? AND x.owner_id=? AND x.revision=? AND r.updated_at=?
   AND COALESCE((SELECT revision FROM graph_records WHERE workspace_id='workspace' AND kind=? AND id=r.id AND retired_into_id IS NULL),0)=?)`,kind,record.id,previous,record.revision,record.updated_at,kind,record.record_revision),
  db.prepare('UPDATE record_ownership SET owner_id=?,revision=revision+1,updated_at=? WHERE record_type=? AND record_id=?').bind(current,now,kind,record.id),
  db.prepare(`INSERT INTO record_ownership_history(id,record_type,record_id,previous_owner_id,owner_id,actor_id,batch_id,action,revision,occurred_at)
   SELECT ?,record_type,record_id,?,?,?,NULL,'assigned',revision,? FROM record_ownership WHERE record_type=? AND record_id=?`).bind(createId(),previous,current,actor,now,kind,record.id),
  ...timeline(db,actor,kind,record.id,'owner.changed',{action:current===null?'unassigned':'reassigned',previous,previousOwnerName:input.previousOwnerName,current,currentOwnerName:receiver?.display_name??null,operation,reason:'Operator removal handover'},now)
 );
 return statements;
}
