import {record} from './repository';

/** Approvals name their record in words: its title or name, with a link, never its internal ID. */
export async function approvalRecordLabels<T extends {recordId:string;recordType:string}>(db:D1Database,approvals:T[]){
 return Promise.all(approvals.map(async approval=>{
  const row=await record(db,approval.recordType,approval.recordId).catch(()=>null);
  const path=approval.recordType==='opportunity'?'opportunities':approval.recordType==='company'?'companies':'contacts';
  return {...approval,recordLabel:row?String(row.title??row.name):'Record no longer available',recordHref:row?`/app/${path}/${encodeURIComponent(approval.recordId)}`:null};
 }));
}
