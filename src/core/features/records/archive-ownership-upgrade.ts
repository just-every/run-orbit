import {ownershipMigrationSql as revisedSql} from './archive-ownership-sql';
import {reconcileOwnershipSchema} from '../../../../scripts/installer/ownership-upgrade.mjs';

const completed=new WeakMap<D1Database,Promise<void>>();
/** Structural migration barrier shared by local, direct and managed Workers. */
export function ensureOwnershipUpgrade(db:D1Database):Promise<void>{
 let pending=completed.get(db);
 if(!pending){pending=reconcileOwnershipSchema(db,revisedSql).then(()=>{}).catch(error=>{completed.delete(db);throw error;});completed.set(db,pending);}
 return pending;
}
