// sqlite_master retains these exact published trigger bodies. Matching both
// names and SQL avoids treating an owner's coincidentally named columns as ours.
const native=[
 "CREATE TRIGGER record_owner_contacts_revision AFTER UPDATE OF owner_id ON contacts WHEN OLD.owner_id IS NOT NEW.owner_id AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE contacts SET owner_revision=OLD.owner_revision+1 WHERE id=NEW.id; END",
 "CREATE TRIGGER record_owner_companies_revision AFTER UPDATE OF owner_id ON companies WHEN OLD.owner_id IS NOT NEW.owner_id AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE companies SET owner_revision=OLD.owner_revision+1 WHERE id=NEW.id; END"
];
const sidecar=[
 "CREATE TRIGGER record_owner_revision AFTER UPDATE OF owner_id ON record_owners WHEN OLD.owner_id IS NOT NEW.owner_id AND NOT EXISTS(SELECT 1 FROM runtime_controls WHERE name='restore') BEGIN UPDATE record_owners SET owner_revision=OLD.owner_revision+1 WHERE record_type=NEW.record_type AND record_id=NEW.record_id; END",
 "CREATE TRIGGER record_owner_opportunities_sync AFTER UPDATE OF owner_id ON opportunities BEGIN UPDATE record_owners SET owner_id=NEW.owner_id WHERE record_type='opportunity' AND record_id=NEW.id AND owner_id IS NOT NEW.owner_id; END"
];
const canonical=(sql:string)=>sql.replace(/\s+/g,' ').trim().replace(/;$/,'');
export async function legacyOwnershipSignature(db:D1Database){
 const triggers=(await db.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name IN('record_owner_contacts_revision','record_owner_companies_revision','record_owner_revision','record_owner_opportunities_sync')").all<{sql:string}>()).results.map(row=>canonical(row.sql));
 return {native:native.every(sql=>triggers.includes(canonical(sql))),sidecar:sidecar.every(sql=>triggers.includes(canonical(sql)))};
}
