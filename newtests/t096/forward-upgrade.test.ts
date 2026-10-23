import {ownershipStartingUpgrades} from './ownership-upgrade';
import {dashboardStartingUpgrade} from './dashboard-upgrade';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {proveReleasedForecastUpgrade} from './released-forecast-upgrade';
import {exactMainDatabase} from './main-fixture';
import {populatePreservedMain} from './main-population';
import {createDependencies} from '../../tests/support/dependencies';
import {createId} from '../../src/core/shared/ids';
import {RecordsRepository} from '../../src/core/features/records/repository';
import {AccessService} from '../../src/core/features/access/service';
import {GraphRecords} from '../../src/core/features/graph/repository';
import {domainEventStatements} from '../../src/core/features/effects/event-statements';
import {isFullOperator} from '../../src/core/features/access/identity-class';

const quote=(name:string)=>'"'+name.replaceAll('"','""')+'"';

test('RECORD-016 ownership and accepted main and released v0.3.0 advance with every native value, custom DDL, live identity and pre-forecast archive schema intact',async()=>{const target=await exactMainDatabase();try{let db=target.db;const owner=createId(),stage=createId(),company=createId(),contact=createId(),opportunity=createId(),now=new Date().toISOString();await db.prepare('INSERT INTO owner_bootstrap VALUES(?,?,?,?,?,?,?,?,?)').bind('initial-owner',owner,'upgrade@fold.test','Upgrade owner','Existing workspace','UTC','USD',JSON.stringify([{id:stage,name:'Existing stage'}]),now).run();
 await db.batch([db.prepare("CREATE TABLE owner_custom(id TEXT PRIMARY KEY,contact_id TEXT REFERENCES contacts(id),payload BLOB,amount INTEGER,twice INTEGER GENERATED ALWAYS AS(amount*2) STORED) WITHOUT ROWID"),db.prepare('CREATE INDEX owner_custom_amount ON owner_custom(amount)'),db.prepare('ALTER TABLE contacts ADD COLUMN owner_note TEXT')]);
 await db.prepare("INSERT INTO companies(id,name,primary_domain,primary_domain_key,custom_fields_json,created_at,updated_at) VALUES(?,'Original company','original.test','original.test','{\"owner\":true}',?,?)").bind(company,now,now).run();await db.prepare("INSERT INTO contacts(id,name,email,email_key,company_id,contactability,custom_fields_json,created_at,updated_at,owner_note) VALUES(?,'Original contact','native@original.test','native@original.test',?,'do_not_contact','{\"priority\":7}',?,?,'Retain owner column')").bind(contact,company,now,now).run();
 await db.prepare("INSERT INTO opportunities(id,title,lifecycle,stage_id,owner_id,company_id,value_cents,score,band,queue_state,created_at,updated_at) VALUES(?,'Original deal','open',?,?,?,43210,63,'medium','now',?,?)").bind(opportunity,stage,owner,company,now,now).run();await db.prepare('INSERT INTO owner_custom(id,contact_id,payload,amount) VALUES(?,?,?,?)').bind('owned',contact,new Uint8Array([0,255,128,1,13,10]).buffer,7).run();
 await populatePreservedMain(db,{owner,contact,company,opportunity,now});
 const session=await createDependencies(db).auth.legacySession(owner),cookie=`__Host-orbit_session=${session.token}`;
 const tableNames=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'record_search%' AND name NOT LIKE 'timeline_search%' AND name<>'d1_migrations' ORDER BY name").all<{name:string}>()).results.map(t=>t.name),before=new Map<string,{columns:string[];rows:string}>();
 for(const name of tableNames){const columns=(await db.prepare('SELECT name FROM pragma_table_xinfo(?) WHERE hidden<>1 ORDER BY cid').bind(name).all<{name:string}>()).results.map(column=>column.name);before.set(name,{columns,rows:JSON.stringify((await db.prepare(`SELECT ${columns.map(quote).join(',')} FROM ${quote(name)}`).all()).results)});}
 const ddl=(await db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name IN('owner_custom','owner_custom_amount') ORDER BY name").all()).results;
 await target.migrateFold();db=target.db;for(const name of tableNames){const original=before.get(name)!;assert.equal(JSON.stringify((await db.prepare(`SELECT ${original.columns.map(quote).join(',')} FROM ${quote(name)}`).all()).results),original.rows,name);}
 assert.deepEqual((await db.prepare('SELECT library_selection_json,merge_review_json FROM drafts').all()).results,JSON.parse(before.get('drafts')!.rows).map(()=>({library_selection_json:'{}',merge_review_json:null})),'Every prior draft receives the additive metadata defaults');
 assert.deepEqual((await db.prepare('SELECT render_snapshot_json FROM outbound_messages').all()).results,JSON.parse(before.get('outbound_messages')!.rows).map(()=>({render_snapshot_json:null})),'Existing approved messages retain their original bytes without invented render snapshots');
 assert.deepEqual((await db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name IN('owner_custom','owner_custom_amount') ORDER BY name").all()).results,ddl);assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 const auth=await createDependencies(db).auth.authenticate(cookie);assert.ok(auth);assert.equal(auth.operatorId,owner);assert.equal(await isFullOperator(db,owner),true);const access=new AccessService(db),context=await access.resolveOperatorContext(auth,'workspace','forward'),graph=new GraphRecords(db,access,domainEventStatements);assert.equal((await graph.getRecord(context,{...context,type:'opportunity',id:opportunity},['score','value_cents'])).fields.score,63);assert.equal(await db.prepare('SELECT hex(payload) FROM owner_custom').first('hex(payload)'),'00FF80010D0A');assert.equal(await db.prepare('SELECT twice FROM owner_custom').first('twice'),14);assert.equal(await db.prepare("SELECT count(*) n FROM pragma_table_xinfo('contacts') WHERE hidden<>1").first('n'),100);await assert.rejects(db.prepare(`CREATE TABLE refused_101(${Array.from({length:101},(_,i)=>`c_${i} TEXT`).join(',')})`).run());assert.equal(await db.prepare("SELECT name FROM sqlite_master WHERE name='refused_101'").first(),null);
 }finally{await target.dispose();}await proveReleasedForecastUpgrade();await dashboardStartingUpgrade();await ownershipStartingUpgrades();});
