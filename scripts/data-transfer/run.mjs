import {createReadStream,createWriteStream} from 'node:fs';
import {access,link,readFile,stat,unlink,writeFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {readArchiveFile,validateManifest} from '../../src/core/shared/archive-transfer-file.ts';
const base='/api/v1/records/archive';
const endpoint=(kind,id,suffix='')=>`${base}/${kind}/${encodeURIComponent(id)}${suffix}`;
async function absent(path){try{await access(path);throw new Error(`Refusing to replace existing file: ${path}`);}catch(error){if(error.code!=='ENOENT')throw error;}}
const fileStream=path=>Readable.toWeb(createReadStream(path,{highWaterMark:65_536}));
export async function runTransfer(options,request,report=console.log){
 if(options.operation==='export')return exportArchive(options,request,report);
 return importArchive(options,request,report);
}
async function exportArchive(options,request,report){
 const checkpoint=`${options.file}.transfer.json`,partial=`${options.file}.partial`;
 await absent(options.file);
 let status;
 if(options.resume){
  const saved=JSON.parse(await readFile(checkpoint,'utf8'));
  if(saved.id!==options.resume||saved.origin!==options.origin||saved.file!==options.file||saved.operation!=='export')throw new Error('The export checkpoint does not match this resume request.');
  status=await request(endpoint('exports',options.resume));
 }else{
  await absent(checkpoint);await absent(partial);
  status=await request(`${base}/exports`,{method:'POST',body:{}});
  await writeFile(checkpoint,JSON.stringify({operation:'export',origin:options.origin,file:options.file,id:status.id})+'\n',{mode:0o600,flag:'wx'});
 }
 report(`Export transfer ${status.id}. Resume with --resume ${status.id}. Workspace edits can continue while snapshot parts are prepared.`);
 while(status.state==='preparing'){
  status=await request(endpoint('exports',status.id,'/advance'),{method:'POST',body:{}});
  report(`Prepared ${status.completedTables} of ${status.totalTables} tables.`);
 }
 if(status.state!=='ready')throw new Error(`Export is ${status.state}; no archive was downloaded.`);
 const response=await request(endpoint('exports',status.id,'/download'),{raw:true});
 if(!response.body)throw new Error('Archive download was empty.');
 await pipeline(Readable.fromWeb(response.body),createWriteStream(partial,{flags:options.resume?'w':'wx',mode:0o600}));
 // A truncated successful HTTP response must not become a completed archive file.
 for await(const _entry of readArchiveFile(fileStream(partial))){}
 await link(partial,options.file);await unlink(partial);await unlink(checkpoint);
 report(`Verified archive saved to ${options.file}. The prepared snapshot remains available until discarded in Records.`);
}
async function importArchive(options,request,report){
 if(!(await stat(options.file)).isFile())throw new Error('Choose a regular archive file.');
 let status=options.resume?await request(endpoint('imports',options.resume)):undefined;
 if(status?.state==='complete'){report('Restore already completed. Configure source secrets before ingesting events.');return;}
 for await(const entry of readArchiveFile(fileStream(options.file))){
  if(entry.kind==='manifest'){
   if(status){if(JSON.stringify(validateManifest(status.manifest))!==JSON.stringify(entry.manifest))throw new Error('The archive manifest does not match this restore transfer.');}
   else status=await request(`${base}/imports`,{method:'POST',body:{confirmed:true,manifest:entry.manifest}});
   report(`Restore transfer ${status.id}. Resume with the same archive and --resume ${status.id}.`);
  }else{
   if(!status)throw new Error('Missing restore transfer.');
   // Replaying prior parts verifies the same file, not just the same row counts.
   if(['uploading','restoring'].includes(status.state))status=await request(endpoint('imports',status.id,`/parts/${entry.part.index}`),{method:'PUT',body:entry.raw});
   report(`Validated archive part ${entry.part.index+1}; ${status.nextPart??0} parts stored.`);
  }
 }
 if(!status)throw new Error('Archive contains no manifest.');
 while(status.state==='uploading'||status.state==='restoring'){
  status=await request(endpoint('imports',status.id,'/finalize'),{method:'POST',body:{}});
  report(`Restore ${status.state}: ${status.completedTables??0} of ${status.totalTables??0} tables.`);
 }
 if(status.state!=='complete')throw new Error(`Restore is ${status.state}; completion has not been confirmed.`);
 report('Archive restored into the empty customer database. Sessions were revoked; sign in again and configure source secrets before ingesting events.');
}
