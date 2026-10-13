import assert from 'node:assert/strict';
import {createPortability,readArchive} from '../../scripts/base-cli/modules/portability/index.mjs';
import {policy} from '../../scripts/installer/portability.mjs';
import {createDependencies} from './dependencies';
import {createApp} from './app';

/** The CLI's actual portability engine and edition policy, against disposable real D1. */
export async function localArchiveRoundTrip(source:D1Database,target:D1Database){
 const exporting=await createPortability({db:source,policy}),restoring=await createPortability({db:target,policy});
 const id=await exporting.exports.create();let status=await exporting.exports.advance(id);
 for(let step=0;step<300&&status.phase==='building';step++)status=await exporting.exports.advance(id);
 assert.equal(status.phase,'complete');
 let imported:string|undefined;
 for await(const record of readArchive(await exporting.exports.download(id))){
  if(record.kind==='manifest')imported=await restoring.imports.create(record);
  else if(record.kind==='part')await restoring.imports.uploadPart(imported!,record.index,record);
  else assert.equal((await restoring.imports.finalize(imported!,{contentHash:record.contentHash,archiveHash:record.archiveHash})).phase,'complete');
 }
 await exporting.exports.abort(id);
}

export async function uploadRestored(db:D1Database,operator:string,raw:string){
 const session=await createDependencies(db).auth.createSession(operator),app=createApp({database:db,assets:{fetch:async()=>new Response('')}}),form=new FormData();
 form.append('files',new File([raw],'replayed.eml'));form.append('includeUnknown','on');
 const response=await app.request('https://orbit.test/api/v1/capture/imports',{method:'POST',headers:{cookie:`__Host-orbit_session=${session.token}`,origin:'https://orbit.test'},body:form});
 assert.equal(response.status,201);return response.json() as Promise<any>;
}
