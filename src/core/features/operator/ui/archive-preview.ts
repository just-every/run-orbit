import {archiveContentIdentity} from '../../../shared/archive-identity';
import {readArchiveFile} from '../../../shared/archive-transfer-file';
import {isDevPersonaEmail,isTrialOwnerEmail} from '../../../shared/trial-owner';
export type ArchiveOperator={id:string;email:string;display_name:string;status:string;setup_owner?:number;collaborator?:number|boolean;invited?:number|boolean};
export type ArchivePreview={operators:ArchiveOperator[];current:ArchiveOperator[];rows:number;parts:number;contentDigest:string};
export function archiveOperatorAccess(operator:ArchiveOperator,current:ArchiveOperator[]){
 const retained=current.find(target=>(!target.collaborator||target.setup_owner)&&(target.id===operator.id||target.email.toLowerCase()===operator.email.toLowerCase()));
 if(retained)return {status:retained.status,explanation:'Current access kept'};
 const replacedBy=current.some(target=>target.setup_owner&&target.status==='active'&&!isTrialOwnerEmail(target.email)&&target.email.toLowerCase()!==operator.email.toLowerCase());
 if(replacedBy&&isDevPersonaEmail(operator.email))return {status:'removed',explanation:'Local dev persona; not given access here, historical attribution kept'};
 if(replacedBy&&isTrialOwnerEmail(operator.email))return {status:'removed',explanation:'Local trial owner; access removed, historical attribution kept'};
 if(replacedBy&&operator.setup_owner)return {status:'removed',explanation:'Owner of the archived workspace; this installation’s owner replaces it. Access removed, historical attribution kept. Invite this address again if that person still needs access'};
 if(operator.collaborator)return operator.invited?{status:'invited',explanation:'Collaborator who never accepted; invite them again here'}:{status:operator.status,explanation:'Collaborator; needs a new invitation here'};
 return {status:operator.status,explanation:'Imported as operator'};
}
export async function previewArchive(file:File):Promise<ArchivePreview>{
 const response=await fetch('/api/v1/settings',{credentials:'same-origin'});
 if(!response.ok)throw new Error('Current operators could not be read. Restore has not started.');
 const {operators:current}=await response.json() as {operators:ArchiveOperator[]};
 const operators:ArchiveOperator[]=[],collaborators=new Set<string>(),members=new Set<string>();const digests:{index:number;sha256:string}[]=[];let manifest:Parameters<typeof archiveContentIdentity>[0]|undefined;let rows=0,parts=0;
 for await(const entry of readArchiveFile(file.stream())){
  if(entry.kind==='manifest'){manifest=entry.manifest;rows=entry.manifest.rows;parts=entry.manifest.parts;}
  else{digests.push({index:entry.part.index,sha256:entry.part.sha256});for(const record of entry.part.records){if(record.table==='access_collaborators'&&typeof record.row.operator_id==='string')collaborators.add(record.row.operator_id);if(record.table==='access_memberships'&&typeof record.row.operator_id==='string')members.add(record.row.operator_id);if(record.table==='operators'){
   const row=record.row;
   if(typeof row.id!=='string'||typeof row.email!=='string'||typeof row.display_name!=='string'||typeof row.status!=='string')throw new Error('Archive operator details are invalid.');
   operators.push({id:row.id,email:row.email,display_name:row.display_name,status:row.status,setup_owner:row.setup_owner===1?1:0});
  }}}
 }
 const conflict=operators.find(archive=>current.some(target=>target.id!==archive.id&&target.email.toLowerCase()===archive.email.toLowerCase()&&current.some(person=>person.id===archive.id)));
 if(conflict)throw new Error(`Archive operator ${conflict.email} has a different identity here. Change that email in the source workspace before exporting again. Restore has not started.`);
 // A collaborator with no membership was invited but never accepted.
 if(!manifest)throw new Error('Archive contains no manifest.');
 return {contentDigest:await archiveContentIdentity(manifest,digests),operators:operators.map(operator=>({...operator,collaborator:collaborators.has(operator.id),invited:collaborators.has(operator.id)&&!members.has(operator.id)})),current,rows,parts};
}
