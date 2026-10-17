// The released 0042 (2b0851ed…) added owner columns to the native record tables.
// Migration 0043 keeps ownership in record_owners and leaves those columns alone,
// because SQL alone cannot tell them apart from an owner's own columns. The
// released revision triggers are that evidence: only the released 0042 made them.
const released=[
 {table:'contacts',kind:'contact',columns:['owner_id','owner_revision']},
 {table:'companies',kind:'company',columns:['owner_id','owner_revision']},
 {table:'opportunities',kind:'opportunity',columns:['owner_revision']},
] as const;
const trigger=(table:string)=>`record_owner_${table}_revision`;
const releasedTrigger=(table:string)=>`CREATE TRIGGER ${trigger(table)} AFTER UPDATE OF owner_id ON ${table} WHEN OLD.owner_id IS NOT NEW.owner_id AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE ${table} SET owner_revision=OLD.owner_revision+1 WHERE id=NEW.id; END`;
const normalized=(sql:string)=>sql.replace(/\s+/g,' ').trim();
// The graph projection carries an assigned owner, never the revision fence the released 0042 also projected.
const project=(kind:string)=>{const fields=`json_patch(json_remove(fields_json,'$.owner_revision'),json_object('owner_id',(SELECT owner_id FROM record_owners WHERE record_type='${kind}' AND record_id=graph_records.id)))`;return `UPDATE graph_records SET fields_json=${fields} WHERE kind='${kind}' AND fields_json<>${fields}`;};

async function releasedTriggers(db:D1Database){
 return (await db.prepare(`SELECT tbl_name,sql FROM sqlite_master WHERE type='trigger' AND name IN(${released.map(()=>'?').join(',')})`).bind(...released.map(item=>trigger(item.table))).all<{tbl_name:string;sql:string}>()).results;
}

/** Copy the released 0042's owner values into record_owners, then drop its columns, in one transaction.
 * Returns false when there is nothing to reconcile. Every other column, index and value is untouched. */
export async function reconcileReleasedOwnership(db:D1Database):Promise<boolean>{
 const found=await releasedTriggers(db);
 if(!found.length)return false;
 const statements:D1PreparedStatement[]=[];
 for(const item of released){
  const evidence=found.find(row=>row.tbl_name===item.table);
  if(!evidence||normalized(evidence.sql)!==releasedTrigger(item.table))throw new Error(`Ownership reconciliation refuses a changed ${item.kind} predecessor; review ${trigger(item.table)} before upgrading.`);
  const columns=(await db.prepare(`PRAGMA table_info(${item.table})`).all<{name:string}>()).results.map(row=>row.name);
  if(!item.columns.every(name=>columns.includes(name)))throw new Error(`Ownership reconciliation expected the released ${item.table} owner columns.`);
  statements.push(
   db.prepare('DELETE FROM record_owners WHERE record_type=?').bind(item.kind),
   db.prepare(`INSERT INTO record_owners(record_type,record_id,owner_id,owner_revision) SELECT ?,id,owner_id,owner_revision FROM ${item.table}`).bind(item.kind),
   db.prepare(`DROP TRIGGER ${trigger(item.table)}`),
   ...[...item.columns].reverse().map(name=>db.prepare(`ALTER TABLE ${item.table} DROP COLUMN ${name}`)),
  );
 }
 statements.push(
  db.prepare(project('contact')),
  db.prepare(project('company')),
 );
 try{await db.batch(statements);}
 catch(error){
  // Another isolate may have finished the same transaction first.
  if(!(await releasedTriggers(db)).length)return false;
  throw error;
 }
 return true;
}

const reconciled=new WeakMap<D1Database,Promise<unknown>>();
/** Every Worker entry point waits for this once per isolate before touching records. */
export function ensureOwnershipReconciled(db:D1Database):Promise<unknown>{
 let pending=reconciled.get(db);
 if(!pending){pending=reconcileReleasedOwnership(db).catch(error=>{reconciled.delete(db);throw error;});reconciled.set(db,pending);}
 return pending;
}
