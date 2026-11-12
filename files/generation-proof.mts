import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const load=(file:string)=>import(pathToFileURL(resolve(file)).href);
const {isolatedDatabase}=await load('tests/support/isolated-database.ts');
const {foldInstalledCatalog,foldSchemaHash}=await load('src/core/features/records/archive-fold-catalog.ts');
const {nativeCatalogGenerations,preDirectNotificationCatalog}=await load('src/core/features/records/archive-generations.ts');
const {validateFoldManifest}=await load('src/core/features/records/archive-fold-validation.ts');
const target=await isolatedDatabase();
try{
 const current=await foldInstalledCatalog(target.db);
 const generations=await Promise.all(nativeCatalogGenerations(current).map(foldSchemaHash));
 const results=[];
 for(const [label,catalog] of [
  ['Zendesk candidate before graph migration',JSON.parse(await readFile(new URL('./support-only-catalog.json',import.meta.url),'utf8'))],
  ['Main graph migration before Zendesk',JSON.parse(await readFile(new URL('./graph-only-catalog.json',import.meta.url),'utf8'))],
  ['Current merged migrations',current],
  ['Complete pre-direct-notification generation',preDirectNotificationCatalog(current)]
 ] as const){
  const schemaHash=await foldSchemaHash(catalog);
  assert.ok(generations.includes(schemaHash),label+' remains an exact supported source generation');
  const manifest={format:'orbit-export',version:3,generation:'orbit-fold-1',schemaHash,exportedAt:new Date().toISOString(),tables:catalog.map((table:any)=>({name:table.name,columns:table.columns.map((column:any)=>column.name),rows:0})),rows:0,parts:0};
  assert.deepEqual((await validateFoldManifest(target.db,manifest)).inputCatalog,catalog,label+' passes the unchanged manifest validator');
  results.push({label,tables:catalog.length,schemaHash,accepted:true});
 }
 const incomplete=current.filter((table:any)=>table.name!=='support_tickets');
 const invalid={format:'orbit-export',version:3,generation:'orbit-fold-1',schemaHash:await foldSchemaHash(incomplete),exportedAt:new Date().toISOString(),tables:incomplete.map((table:any)=>({name:table.name,columns:table.columns.map((column:any)=>column.name),rows:0})),rows:0,parts:0};
 await assert.rejects(validateFoldManifest(target.db,invalid),{status:400,message:'Invalid complete archive lineage.'});
 console.log(JSON.stringify({results,incompleteNativeInventoryRejected:true,validatorUnchanged:true}));
}finally{await target.dispose();}
