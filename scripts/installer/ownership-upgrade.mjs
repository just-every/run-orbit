import {priorOwnershipObjects} from './ownership-predecessor.mjs';
import {splitSqlStatements} from '../delivery/base/sql-statements.mjs';

const migration = '0042_record_ownership.sql';
const introduced = {contacts:['owner_id','owner_revision'],companies:['owner_id','owner_revision'],opportunities:['owner_revision']};
const oldTriggers = ['record_owner_contacts_revision','record_owner_companies_revision','record_owner_opportunities_revision','record_owner_contacts_erasure','record_owner_companies_erasure','record_owner_opportunities_erasure','record_owner_restore_local','fold_graph_contacts_insert','fold_graph_contacts_update','fold_graph_companies_insert','fold_graph_companies_update','fold_restore_projection_release'];
const quote = name => `"${name.replaceAll('"','""')}"`;
const normalized = sql => sql.replace(/\s+/g,' ').trim();

/** One atomic structural upgrade for the single released native-column predecessor.
 * D1 batch and the local adapter both roll back every statement on failure.
 * Applied migration history and every unrelated column, index and FK stay intact.
 */
export async function reconcileOwnershipSchema(db, revisedSql) {
 const inventory=(await db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name IN('d1_migrations','record_owners','record_owner_contacts_revision','record_owner_companies_revision','record_owner_opportunities_revision')").all()).results;
 if(inventory.some(row=>row.name==='record_owners'))return false;
 if(!inventory.some(row=>row.name==='d1_migrations')||!await db.prepare('SELECT 1 FROM d1_migrations WHERE name=?').bind(migration).first())return false;
 // A migration receipt alone never authorizes deleting owner-authored columns.
 for(const table of Object.keys(introduced)){
  const kind=table==='companies'?'company':table==='contacts'?'contact':'opportunity';
  const expected=`CREATE TRIGGER record_owner_${table}_revision AFTER UPDATE OF owner_id ON ${table} WHEN OLD.owner_id IS NOT NEW.owner_id AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE ${table} SET owner_revision=OLD.owner_revision+1 WHERE id=NEW.id; END`;
  const trigger=inventory.find(row=>row.name===`record_owner_${table}_revision`);
  if(!trigger||normalized(trigger.sql)!==expected)throw Error(`Ownership upgrade refuses an unrecognized ${kind} predecessor; preserve the database and review its migration changes.`);
  const columns=(await db.prepare(`PRAGMA table_info(${quote(table)})`).all()).results;
  for(const name of introduced[table]){const column=columns.find(row=>row.name===name);if(!column||column.type.toUpperCase()!==(name==='owner_id'?'TEXT':'INTEGER')||column.notnull!==(name==='owner_id'?0:1)||column.pk!==0||(name==='owner_revision'&&column.dflt_value!=='0'))throw Error(`Ownership predecessor column changed: ${table}.${name}`);}
  if(table!=='opportunities'){const fks=(await db.prepare(`PRAGMA foreign_key_list(${quote(table)})`).all()).results.filter(fk=>fk.from==='owner_id');if(fks.length!==1||fks[0].table!=='operators'||fks[0].to!=='id'||fks[0].on_delete!=='SET NULL')throw Error(`Ownership predecessor foreign key changed: ${table}.owner_id`);}
 }
 const objects=(await db.prepare("SELECT type,name,sql FROM sqlite_master WHERE type IN('trigger','index')").all()).results;
 for(const expected of priorOwnershipObjects.filter(row=>row.type!=='table')){
  const installed=objects.find(row=>row.type===expected.type&&row.name===expected.name);
  if(!installed||normalized(installed.sql??'')!==normalized(expected.sql??''))throw Error(`Ownership upgrade refuses a changed predecessor object: ${expected.name}`);
 }
 const active=await db.prepare("SELECT 1 FROM runtime_controls WHERE name='restore' UNION ALL SELECT 1 FROM archive_jobs WHERE kind='import' AND state NOT IN('complete','aborted','failed') OR kind='export' AND state IN('preparing','snapshotting') LIMIT 1").first();
 if(active)throw Error('Finish or abort the active Records archive transfer before upgrading ownership.');
 const statements=splitSqlStatements(revisedSql),create=statements.find(sql=>/CREATE TABLE(?: IF NOT EXISTS)? record_owners\(/.test(sql));
 if(!create)throw Error('The ownership upgrade requires the current sidecar migration.');
 const commands=[create];
 for(const [table,kind] of [['contacts','contact'],['companies','company'],['opportunities','opportunity']])commands.push(`INSERT INTO record_owners SELECT '${kind}',id,owner_id,owner_revision FROM ${table}`);
 commands.push(...oldTriggers.map(name=>`DROP TRIGGER IF EXISTS ${quote(name)}`),'DROP INDEX IF EXISTS contacts_owner_id','DROP INDEX IF EXISTS companies_owner_id');
 // Retain prior reviewed authority and every portable notice; new undo fences stay nullable.
 const items=(await db.prepare('PRAGMA table_info(record_owner_batch_items)').all()).results;
 if(!items.some(column=>column.name==='applied_record_revision'))commands.push('ALTER TABLE record_owner_batch_items ADD COLUMN applied_record_revision INTEGER');
 for(const [table,columns] of Object.entries(introduced))for(const name of [...columns].reverse())commands.push(`ALTER TABLE ${quote(table)} DROP COLUMN ${quote(name)}`);
 commands.push(...statements.filter(sql=>sql!==create));
 // FK validation participates in the transaction, including owner-created tables.
 commands.push('CREATE TABLE orbit_ownership_upgrade_check(ok INTEGER NOT NULL CHECK(ok=1))','INSERT INTO orbit_ownership_upgrade_check SELECT 0 FROM pragma_foreign_key_check','DROP TABLE orbit_ownership_upgrade_check');
 await db.batch(commands.map(sql=>db.prepare(sql)));
 return true;
}
