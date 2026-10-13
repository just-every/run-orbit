import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {getPlatformProxy} from 'wrangler';
const [mode,file]=process.argv.slice(2),platform=await getPlatformProxy<{DB:D1Database}>({configPath:process.env.MIGRATION_CONFIG??'wrangler.jsonc',persist:{path:process.env.MIGRATION_STATE??'.wrangler/state/v3'},remoteBindings:false}),db=platform.env.DB;
try{
 if(mode==='capture'){
  const tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name!='d1_migrations' ORDER BY name").all<{name:string}>()).results;
  const snapshot:Record<string,unknown[]>={};for(const {name}of tables)snapshot[name]=(await db.prepare(`SELECT * FROM ${name}`).all()).results;
  assert.ok(snapshot.contacts.length&&snapshot.opportunities.length&&snapshot.drafts.length&&snapshot.signals.length&&snapshot.audit_entries.length,'Migration fixture must contain realistic related records and audit history');assert.equal(snapshot.outbound_messages.length,4);await writeFile(file,JSON.stringify(snapshot));
 }else{
  const snapshot=JSON.parse(await readFile(file,'utf8')) as Record<string,Record<string,unknown>[]>,stable=(value:any):any=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value,sort=(rows:unknown[])=>rows.map(row=>JSON.stringify(stable(row))).sort();
  for(const [table,rows]of Object.entries(snapshot)){
   const expected=structuredClone(rows);if(mode==='migrated'&&table==='workspace_settings')for(const row of expected){const hours=JSON.parse(String(row.working_hours_json));if(hours.weekdays){hours.days=hours.weekdays;delete hours.weekdays;row.working_hours_json=JSON.stringify(hours);}}
   const current=(await db.prepare(`SELECT * FROM ${table}`).all<Record<string,unknown>>()).results;
   const keys=Object.keys(rows[0]??{}),projected=current.map(row=>Object.fromEntries(keys.map(key=>[key,row[key]])));
   if(table==='workspace_settings'){for(const row of expected)row.working_hours_json=JSON.parse(String(row.working_hours_json));for(const row of projected)row.working_hours_json=JSON.parse(String(row.working_hours_json));}
   assert.deepEqual(sort(projected),sort(expected),`${mode}: ${table} retained every original value`);
  }
  if(mode==='migrated'){
   const messages=(await db.prepare('SELECT m.*,d.recipient_contact_id FROM outbound_messages m JOIN drafts d ON d.id=m.draft_id').all<Record<string,unknown>>()).results;
   assert.equal(messages.length,4);for(const m of messages){assert.equal(m.contact_id,m.recipient_contact_id);assert.equal(m.idempotency_key,m.id);assert.equal(m.message_id,`<${m.id}@orbit.local>`);assert.equal(m.approved_at,m.created_at);assert.equal(m.attempt_count,0);}
   assert.equal(await db.prepare("SELECT name FROM sqlite_master WHERE name='outbound_messages_previous'").first(),null);
  }
  let ownerDataModelPreserved=false;if(snapshot.owner_account_limits_v2){const ownerPolicy=await db.prepare("SELECT * FROM owner_account_limits_v2 WHERE company_id='01J0000000000000000000000Z'").first<Record<string,unknown>>();assert.equal(ownerPolicy?.max_discount_percent,5);assert.equal(ownerPolicy?.max_discount_basis_points,500);ownerDataModelPreserved=true;}assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);console.log(JSON.stringify({ownerDataModelPreserved,mode,tables:Object.keys(snapshot).length,outboundStates:['queued','accepted','failed','delivery-unknown'],allOriginalValuesPreserved:true,foreignKeysValid:true}));
 }
}finally{await platform.dispose();}
