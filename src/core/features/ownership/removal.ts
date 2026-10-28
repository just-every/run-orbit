import {createId} from '../../shared/ids';
import {automaticOwnership} from './automatic';
import type {OwnershipKind} from './types';
export interface OwnedRemovalRecord {id:string;title:string;revision:number;updated_at:string}
export async function ownedRemovalRecords(db:D1Database,operator:string,kind:OwnershipKind){
 const table=kind==='contact'?'contacts':'companies';
 return (await db.prepare(`SELECT r.id,COALESCE(r.name,'Unnamed record') AS title,x.revision,r.updated_at FROM ${table} r JOIN record_ownership x ON x.record_type=? AND x.record_id=r.id WHERE x.owner_id=? ORDER BY r.id`).bind(kind,operator).all<OwnedRemovalRecord>()).results;
}
export function ownedRemovalStatements(db:D1Database,kind:OwnershipKind,records:OwnedRemovalRecord[],from:string,to:string|null,actor:string){
 const table=kind==='contact'?'contacts':'companies',guard=createId();
 return [
  db.prepare(`INSERT INTO access_write_guards VALUES(?,CASE WHEN (SELECT count(*) FROM record_ownership x JOIN ${table} r ON r.id=x.record_id WHERE x.record_type=? AND x.owner_id=?)=? THEN 1 ELSE 0 END)`).bind(guard,kind,from,records.length),
  ...records.map(record=>db.prepare(`INSERT INTO access_write_guards VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM record_ownership x JOIN ${table} r ON r.id=x.record_id WHERE x.record_type=? AND x.record_id=? AND x.owner_id=? AND x.revision=? AND r.updated_at=?) THEN 1 ELSE 0 END)`).bind(`${guard}:${record.id}`,kind,record.id,from,record.revision,record.updated_at)),
  ...automaticOwnership(db,kind,`SELECT r.id AS record_id,r.name AS record_name,? AS owner_id FROM ${table} r JOIN record_ownership x ON x.record_type=? AND x.record_id=r.id WHERE x.owner_id=?`,[to,kind,from],actor,'Operator removal handover'),
  db.prepare('DELETE FROM access_write_guards WHERE id=? OR id LIKE ?').bind(guard,guard+':%')
 ];
}
