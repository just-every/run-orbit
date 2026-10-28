import {z} from 'zod';
import {deny} from '../access/errors';
/** Native records and installed object definitions use the same scoped graph reads. */
export async function readableRecordKind(db:D1Database,value:string){
 const kind=z.string().regex(/^[a-z][a-z0-9_]{1,63}$/).parse(value);
 if(!['contact','company','opportunity'].includes(kind)&&!await db.prepare('SELECT 1 FROM managed_record_types WHERE name=?').bind(kind).first())deny('Choose an installed record type.');
 return kind;
}
