import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
const load=(file:string)=>import(pathToFileURL(resolve(file)).href);
const {isolatedDatabase}=await load('tests/support/isolated-database.ts');
const {foldInstalledCatalog,foldSchemaHash}=await load('src/core/features/records/archive-fold-catalog.ts');
const target=await isolatedDatabase();
try{
 const catalog=await foldInstalledCatalog(target.db);
 await writeFile(process.argv[2]!,JSON.stringify(catalog)+'\n');
 console.log(JSON.stringify({tables:catalog.length,schemaHash:await foldSchemaHash(catalog),capturedFromRealMigrations:true}));
}finally{await target.dispose();}
