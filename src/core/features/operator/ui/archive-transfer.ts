import {sameArchiveManifest} from '../../../shared/archive-identity.ts';
import {archiveTransferError} from '../../../shared/archive-transfer-error.ts';
import {readArchiveFile,validateManifest,type ArchiveManifest} from '../../../shared/archive-transfer-file.ts';
export interface ArchiveStatus {id:string;state:string;phase?:string;completedSteps?:number;totalSteps?:number;completedTables?:number;totalTables?:number;nextPart?:number;manifest?:ArchiveManifest;contentDigest?:string}
const base='/api/v1/records/archive';
export function archiveUrl(kind:'exports'|'imports',id:string,suffix=''){return `${base}/${kind}/${encodeURIComponent(id)}${suffix}`;}
async function request(path:string,method='GET',body?:unknown):Promise<ArchiveStatus>{
 const response=await fetch(path,{method,credentials:'same-origin',redirect:'error',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
 if(!response.ok)throw await archiveTransferError(response,'browser');
 return response.json();
}
export async function prepareArchive(id:string,update:(status:ArchiveStatus)=>void,paused:()=>boolean){
 let status=await request(id?archiveUrl('exports',id):`${base}/exports`,id?'GET':'POST',id?undefined:{});update(status);
 while(status.state==='preparing'&&!paused()){status=await request(archiveUrl('exports',status.id,'/advance'),'POST',{});update(status);}
 if(!['preparing','ready'].includes(status.state))throw new Error(`Export is ${status.state}.`);
 return status;
}
export async function restoreArchive(file:File,id:string,contentDigest:string,update:(status:ArchiveStatus)=>void,validated:(count:number)=>void,paused:()=>boolean){
 let status=id?await request(archiveUrl('imports',id)):undefined;
 if(status){update(status);if(status.contentDigest&&status.contentDigest!==contentDigest)throw new Error('This archive does not match the selected restore transfer. Choose the same unchanged archive.');if(status.state==='complete')return status;}
 for await(const entry of readArchiveFile(file.stream())){
  if(paused())return status;
  if(entry.kind==='manifest'){
   if(status){if(!await sameArchiveManifest(validateManifest(status.manifest),entry.manifest))throw new Error('This archive does not match the selected restore transfer.');}
   else status=await request(`${base}/imports`,'POST',{confirmed:true,manifest:entry.manifest,contentDigest});
   update(status);
  }else{
   if(!status)throw new Error('Missing restore transfer.');
   if(!['uploading','restoring'].includes(status.state))throw new Error(`Restore is ${status.state}.`);
   status=await request(archiveUrl('imports',status.id,`/parts/${entry.part.index}`),'PUT',entry.raw);
   update(status);validated(entry.part.index+1);
  }
 }
 if(!status)throw new Error('Archive contains no manifest.');
 return finishRestore(status.id,update,paused);
}
/** Uploaded archives can finish without asking the browser for the file again. */
export async function finishRestore(id:string,update:(status:ArchiveStatus)=>void,paused:()=>boolean){
 let status=await request(archiveUrl('imports',id));update(status);
 while(['uploading','restoring'].includes(status.state)&&!paused()){status=await request(archiveUrl('imports',status.id,'/finalize'),'POST',{});update(status);}
 if(!['uploading','restoring','complete'].includes(status.state))throw new Error(`Restore is ${status.state}.`);
 return status;
}
export async function abortArchive(kind:'exports'|'imports',id:string,update:(status:ArchiveStatus)=>void){
 let status:ArchiveStatus;
 do{status=await request(archiveUrl(kind,id,'/abort'),'POST',{});status.id??=id;update(status);}while(status.state==='restoring');
 if(status.state!=='aborted')throw new Error(`Archive cancellation is ${status.state}; rollback has not been confirmed complete.`);
}

/** A remembered transfer's current status; undefined once the server no longer holds it, as after a finished restore. */
export async function transferStatus(kind:'exports'|'imports',id:string):Promise<ArchiveStatus|undefined>{
 const response=await fetch(archiveUrl(kind,id),{credentials:'same-origin',redirect:'error'});
 if(response.status===404){await response.body?.cancel();return undefined;}
 if(!response.ok)throw await archiveTransferError(response,'browser');
 return response.json();
}

export async function unfinishedTransfers(kind:'exports'|'imports'):Promise<ArchiveStatus[]>{
 const response=await fetch(base+'/'+kind,{credentials:'same-origin',redirect:'error'});
 if(!response.ok){await response.body?.cancel();throw new Error('Unfinished transfers could not be read.');}
 const result=await response.json() as {jobs:ArchiveStatus[]};return result.jobs;
}
