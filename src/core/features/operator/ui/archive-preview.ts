import {readArchiveFile} from '../../../shared/archive-transfer-file';
export type ArchiveOperator={id:string;email:string;display_name:string;status:string;setup_owner?:number;collaborator?:number|boolean};
export type ArchivePreview={operators:ArchiveOperator[];current:ArchiveOperator[];rows:number;parts:number};
export async function previewArchive(file:File):Promise<ArchivePreview>{
 const response=await fetch('/api/v1/settings',{credentials:'same-origin'});
 if(!response.ok)throw new Error('Current operators could not be read. Restore has not started.');
 const {operators:current}=await response.json() as {operators:ArchiveOperator[]};
 const operators:ArchiveOperator[]=[],collaborators=new Set<string>();let rows=0,parts=0;
 for await(const entry of readArchiveFile(file.stream())){
  if(entry.kind==='manifest'){rows=entry.manifest.rows;parts=entry.manifest.parts;}
  else for(const record of entry.part.records){if(record.table==='access_collaborators'&&typeof record.row.operator_id==='string')collaborators.add(record.row.operator_id);if(record.table==='operators'){
   const row=record.row;
   if(typeof row.id!=='string'||typeof row.email!=='string'||typeof row.display_name!=='string'||typeof row.status!=='string')throw new Error('Archive operator details are invalid.');
   operators.push({id:row.id,email:row.email,display_name:row.display_name,status:row.status});
  }}
 }
 const conflict=operators.find(archive=>current.some(target=>target.id!==archive.id&&target.email.toLowerCase()===archive.email.toLowerCase()&&current.some(person=>person.id===archive.id)));
 if(conflict)throw new Error(`Archive operator ${conflict.email} has a different identity here. Change that email in the source workspace before exporting again. Restore has not started.`);
 return {operators:operators.map(operator=>({...operator,collaborator:collaborators.has(operator.id)})),current,rows,parts};
}
