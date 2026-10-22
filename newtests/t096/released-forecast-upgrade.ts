import {preDashboardCatalog} from '../../src/core/features/dashboards/archive';
import {preSlackCatalog} from '../../src/core/features/slack/archive';
import {preReportShareCatalog} from '../../src/core/features/analytics/archive-compatibility';
import assert from 'node:assert/strict';
import {releasedDatabase} from './released-database';
import {createApp} from '../../tests/support/app';
import {emailLinkSignIn} from '../../tests/support/email-link';
import {createId} from '../../src/core/shared/ids';
import {archiveCatalog,type ArchiveTable} from '../../src/core/features/records/archive-schema';
import {archiveSchemaObjects,type SchemaObjectTable} from '../../src/core/features/records/archive-schema-objects';
import {foldExcludedTables,foldInstalledCatalog,foldSchemaHash,type FoldArchiveTable} from '../../src/core/features/records/archive-fold-catalog';
import {preForecastCatalog} from '../../src/core/features/records/forecast-archive-compatibility';
import {preOptOutCapabilityCatalog} from '../../src/core/features/records/archive-generations';
import {preLibraryCatalog} from '../../src/core/features/records/library-archive-compatibility';
import {validateFoldManifest} from '../../src/core/features/records/archive-fold-validation';

/** Read historical schema without requiring the current generation's later tables. */
async function releasedCatalog(db:D1Database){
 const tables=(await archiveCatalog(db)).filter(table=>!foldExcludedTables.has(table.name)) as FoldArchiveTable[];
 const objects=(await db.prepare('SELECT tbl_name,type,name,sql FROM sqlite_master ORDER BY tbl_name,type,name').all<{tbl_name:string;type:string;name:string;sql:string|null}>()).results;
 for(const table of tables){table.objects=objects.filter(object=>object.tbl_name===table.name).map(({tbl_name,...object})=>object);if(table.name==='access_memberships')table.dependencies.push('access_collaborators');}
 const catalog:ArchiveTable[]=[];
 while(catalog.length<tables.length){const ready=tables.filter(table=>!catalog.includes(table)&&table.dependencies.every(name=>catalog.some(previous=>previous.name===name)));assert.ok(ready.length,'released catalog has an acyclic restore order');catalog.push(...ready);}
 (catalog[0] as SchemaObjectTable).schemaObjects=await archiveSchemaObjects(db);
 return catalog;
}

type TableSnapshot={name:string;columns:string[];rows:string[]};
const quote=(name:string)=>'"'+name.replaceAll('"','""')+'"';
async function rows(db:D1Database,table:Pick<TableSnapshot,'name'|'columns'>){return(await db.prepare(`SELECT ${table.columns.map(quote).join(',')} FROM ${quote(table.name)}`).all()).results.map(row=>JSON.stringify(row)).sort();}
async function snapshot(db:D1Database){
 const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name<>'d1_migrations' ORDER BY name").all<{name:string}>()).results;
 const tables:TableSnapshot[]=[];
 for(const {name} of names){const columns=(await db.prepare(`PRAGMA table_info(${quote(name)})`).all<{name:string}>()).results.map(column=>column.name);tables.push({name,columns,rows:await rows(db,{name,columns})});}
 return tables;
}
async function assertRetained(db:D1Database,tables:TableSnapshot[]){for(const table of tables)assert.deepEqual(await rows(db,table),table.rows,`prior rows and every existing field retained in ${table.name}`);}
function manifestFor(catalog:ArchiveTable[],before:TableSnapshot[],schemaHash:string,exportedAt:string){const counts=new Map(before.map(table=>[table.name,table.rows.length]));return{format:'orbit-export',version:3,generation:'orbit-fold-1',schemaHash,exportedAt,tables:catalog.map(table=>({name:table.name,columns:table.columns.map(column=>column.name),rows:counts.get(table.name)!})),rows:catalog.reduce((sum,table)=>sum+counts.get(table.name)!,0),parts:1};}

export async function proveReleasedForecastUpgrade(){
 const target=await releasedDatabase();
 try{
  let db=target.db;const owner=createId(),stage=createId(),now=new Date().toISOString();
  await db.prepare('INSERT INTO owner_bootstrap VALUES(?,?,?,?,?,?,?,?,?)').bind('initial-owner',owner,'released@upgrade.test','Released owner','Released business','UTC','USD',JSON.stringify([{id:stage,name:'Review'}]),now).run();
  await db.prepare("INSERT INTO first_run_setup VALUES('workspace',?)").bind(now).run();
  const session=await emailLinkSignIn(db,'released@upgrade.test');
  const app=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}});
  const call=async(path:string,body?:unknown)=>{const response=await app.request('https://orbit.test/api/v1'+path,{method:body===undefined?'GET':'POST',headers:{Cookie:session.cookie,Origin:'https://orbit.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.ok(response.ok,`${path}: ${response.status} ${await response.clone().text()}`);return response.json() as Promise<any>;};
  const company=await call('/records/company',{name:'Released company',primary_domain:'released.example'}),contact=await call('/records/contact',{name:'Released contact',email:'contact@released.example',company_id:company.id,contactability:'do_not_contact'});
  const deal=await call('/records/opportunity',{title:'Released deal',stage_id:stage,owner_id:owner,company_id:company.id,value_cents:734567,expected_close_at:'2026-11-20T00:00:00.000Z',contact_ids:[contact.id],primary_contact_id:contact.id});
  await call(`/records/opportunity/${deal.id}/entries`,{kind:'note',text:'Released customer commitment',occurredAt:now,contactIds:[contact.id]});
  await call('/tasks',{title:'Released review',recordType:'opportunity',recordId:deal.id,ownerId:owner,dueAt:'2026-11-18T10:00:00.000Z',priority:'high',type:'follow_up',notes:'Keep the reviewed commitment',recurrence:'weekly',timezone:'UTC',reminderMinutes:30});
  const draft=createId(),message=createId();
  await db.prepare('INSERT INTO drafts(id,opportunity_id,author_id,recipient_contact_id,recipient_email,subject,body,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(draft,deal.id,owner,contact.id,'contact@released.example','Released subject','Released reviewed body',now,now).run();
  await db.prepare("INSERT INTO outbound_messages(id,draft_id,revision,opportunity_id,operator_id,contact_id,recipient_email,subject,body,state,created_at,updated_at,idempotency_key,message_id,approved_at) VALUES(?,?,1,?,?,?,?,?,?,'cancelled',?,?,?,?,?)").bind(message,draft,deal.id,owner,contact.id,'contact@released.example','Released subject','Released reviewed body',now,now,message,`<${message}@orbit.test>`,now).run();
  const catalog=await releasedCatalog(db),schemaHash=await foldSchemaHash(catalog);
  const before=await snapshot(db);
  await target.upgrade('0049_opt_out_capabilities.sql');db=target.db;await assertRetained(db,before);
  const preceding=await snapshot(db),precedingCatalog=await releasedCatalog(db),precedingHash=await foldSchemaHash(precedingCatalog);
  await target.upgrade();db=target.db;
  await assertRetained(db,before);await assertRetained(db,preceding);
  const preLibrary=preLibraryCatalog(preSlackCatalog(preReportShareCatalog(preDashboardCatalog(await foldInstalledCatalog(db)))));assert.deepEqual(preLibrary,precedingCatalog,'0049 retains exact columns, objects, triggers and views after stripping the library additions');assert.equal(await foldSchemaHash(preLibrary),precedingHash);
  const previous=preForecastCatalog(preOptOutCapabilityCatalog(preLibrary));assert.deepEqual(previous,catalog,'pre-forecast generation retains the exact released columns, objects, triggers and views');assert.equal(await foldSchemaHash(previous),schemaHash);
  assert.deepEqual((await validateFoldManifest(db,manifestFor(catalog,before,schemaHash,now))).inputCatalog,previous);
  assert.deepEqual((await validateFoldManifest(db,manifestFor(precedingCatalog,preceding,precedingHash,now))).inputCatalog,preLibrary);
  assert.deepEqual(await db.prepare('SELECT library_selection_json,merge_review_json FROM drafts WHERE id=?').bind(draft).first(),{library_selection_json:'{}',merge_review_json:null});
  assert.equal(await db.prepare('SELECT render_snapshot_json FROM outbound_messages WHERE id=?').bind(message).first('render_snapshot_json'),null);
  assert.equal(await db.prepare('SELECT count(*) n FROM message_library').first('n'),0);
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  const upgraded=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}}),response=await upgraded.request(`https://orbit.test/api/v1/records/opportunity/${deal.id}`,{headers:{Cookie:session.cookie}});assert.equal(response.status,200);assert.equal((await response.json() as any).record.value_cents,734567);
  return{released:{tables:before.length,rows:before.reduce((sum,table)=>sum+table.rows.length,0)},preceding:{tables:preceding.length,rows:preceding.reduce((sum,table)=>sum+table.rows.length,0)},foreignKeyViolations:0};
 }finally{await target.dispose();}
}
