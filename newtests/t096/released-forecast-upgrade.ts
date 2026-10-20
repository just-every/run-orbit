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
import {validateFoldManifest} from '../../src/core/features/records/archive-fold-validation';

/** Read the actual released schema without assuming forecast tables are installed. */
async function releasedCatalog(db:D1Database){
 const tables=(await archiveCatalog(db)).filter(table=>!foldExcludedTables.has(table.name)) as FoldArchiveTable[];
 const objects=(await db.prepare('SELECT tbl_name,type,name,sql FROM sqlite_master ORDER BY tbl_name,type,name').all<{tbl_name:string;type:string;name:string;sql:string|null}>()).results;
 for(const table of tables){table.objects=objects.filter(object=>object.tbl_name===table.name).map(({tbl_name,...object})=>object);if(table.name==='access_memberships')table.dependencies.push('access_collaborators');}
 const catalog:ArchiveTable[]=[];
 while(catalog.length<tables.length){const ready=tables.filter(table=>!catalog.includes(table)&&table.dependencies.every(name=>catalog.some(previous=>previous.name===name)));assert.ok(ready.length,'released catalog has an acyclic restore order');catalog.push(...ready);}
 (catalog[0] as SchemaObjectTable).schemaObjects=await archiveSchemaObjects(db);
 return catalog;
}

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
  const catalog=await releasedCatalog(db),schemaHash=await foldSchemaHash(catalog);
  const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name<>'d1_migrations' ORDER BY name").all<{name:string}>()).results.map(row=>row.name);
  const rows=async(database:D1Database,name:string)=>(await database.prepare(`SELECT * FROM "${name}"`).all()).results.map(row=>JSON.stringify(row)).sort();
  const before=new Map<string,string[]>();for(const name of names)before.set(name,await rows(db,name));
  await target.upgrade();db=target.db;
  for(const name of names)assert.deepEqual(await rows(db,name),before.get(name),`released rows retained in ${name}`);
  const previous=preForecastCatalog(preOptOutCapabilityCatalog(await foldInstalledCatalog(db)));assert.deepEqual(previous,catalog,'pre-forecast generation retains the exact released columns, objects, triggers and views');assert.equal(await foldSchemaHash(previous),schemaHash);
  const manifest={format:'orbit-export',version:3,generation:'orbit-fold-1',schemaHash,exportedAt:now,tables:catalog.map(table=>({name:table.name,columns:table.columns.map(column=>column.name),rows:before.get(table.name)!.length})),rows:catalog.reduce((sum,table)=>sum+before.get(table.name)!.length,0),parts:1};
  assert.deepEqual((await validateFoldManifest(db,manifest)).inputCatalog,previous);
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
  const upgraded=createApp({database:db,assets:{fetch:async()=>new Response(null,{status:404})}}),response=await upgraded.request(`https://orbit.test/api/v1/records/opportunity/${deal.id}`,{headers:{Cookie:session.cookie}});assert.equal(response.status,200);assert.equal((await response.json() as any).record.value_cents,734567);
 }finally{await target.dispose();}
}
