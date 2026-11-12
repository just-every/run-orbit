import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),mode=process.argv[2];
const {validateManifest}=await import(pathToFileURL(root+'/src/core/shared/archive-transfer-file.ts').href);
const {selectedFoldTables,knownNativeAdditions,zoomArchiveTables}=await import(pathToFileURL(root+'/src/core/shared/archive-lineage.ts').href);
const names=[...selectedFoldTables,...knownNativeAdditions];
const manifest=items=>({format:'orbit-export',version:3,generation:'orbit-fold-1',schemaHash:'a'.repeat(64),exportedAt:'2026-11-12T00:00:00.000Z',tables:items.map(name=>({name,columns:['id'],rows:0})),parts:0,rows:0});
const results=[];
function probe(label,items,accepted){
 let error=null;try{validateManifest(manifest(items));}catch(e){error=e.message;}
 assert.equal(error===null,accepted,label+': '+error);
 results.push({label,accepted:error===null,error});
}
probe('complete current generation',names,true);
probe('complete prior generation without Zoom',names.filter(name=>!zoomArchiveTables.includes(name)),mode==='after');
for(let mask=1;mask<7;mask++)probe('incomplete Zoom group '+mask,names.filter(name=>!zoomArchiveTables.includes(name)||Boolean(mask&(1<<zoomArchiveTables.indexOf(name)))),false);
probe('duplicate Zoom table',[...names,zoomArchiveTables[0]],false);
probe('missing mandatory table',names.filter(name=>name!=='form_embed_origins'),false);
const malformed=manifest(names);malformed.rows=1;
assert.throws(()=>validateManifest(malformed));
results.push({label:'inconsistent row totals',accepted:false});
console.log(JSON.stringify({mode,results},null,2));
