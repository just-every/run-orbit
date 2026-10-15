import {stageCell,type StageLayout,quoteIdentifier} from './archive-stage-layout';
import {stageName} from './archive-storage';
import {RecordError} from './shared';

/** A reused ID and a different current mailbox must not identify two people. */
export async function checkArchiveOperators(db:D1Database,id:string,layout:StageLayout){
 const cell=(name:string)=>stageCell(layout,name,'a');
 const conflict=await db.prepare(`SELECT o.email FROM ${stageName(id,'operators')} a JOIN operators o ON lower(o.email)=lower(${cell('email')}) WHERE o.id<>${cell('id')} AND EXISTS(SELECT 1 FROM operators same_id WHERE same_id.id=${cell('id')}) LIMIT 1`).first<{email:string}>();
 if(conflict)throw new RecordError(409,`Archive operator ${conflict.email} conflicts with a different current identity. Change that email in the source workspace before exporting again. Current operators have not been changed.`);
}

/** Preserve current access. Equal mailboxes use archive IDs to retain attribution. */
export function restoreOperatorStatements(db:D1Database,id:string,backupId:string,layout:StageLayout,columns:string[],rollback:boolean,collaborators?:StageLayout){
 const archived=stageName(rollback?backupId:id,'operators'),retained=stageName(backupId,'operators');
 const cell=(name:string,alias?:string)=>stageCell(layout,name,alias);
 const native=(alias:string)=>collaborators?`(${cell('setup_owner',alias)}=1 OR NOT EXISTS(SELECT 1 FROM ${stageName(backupId,'access_collaborators')} c WHERE ${stageCell(collaborators,'operator_id','c')}=${cell('id',alias)}))`:'1=1';
 const retainedIds=`SELECT ${cell('id','r')} FROM ${retained} r WHERE ${native('r')}`;
 const archivedValue=(name:string)=>`(SELECT ${cell(name)} FROM ${archived} WHERE ${archived}.${cell('id')}=operators.id)`;
 const retainedMatch=`${native('r')} AND (${cell('id','r')}=operators.id OR lower(${cell('email','r')})=lower(${archivedValue('email')}))`;
 const retainedValue=(name:string)=>`(SELECT ${cell(name,'r')} FROM ${retained} r WHERE ${retainedMatch} LIMIT 1)`;
 const currentOwner=`EXISTS(SELECT 1 FROM ${retained} WHERE ${cell('setup_owner')}=1 AND ${cell('status')}='active')`;
 const replacedTrialOwner=`lower(${archivedValue('email')})='owner@orbit.test' AND EXISTS(SELECT 1 FROM ${retained} WHERE ${cell('setup_owner')}=1 AND ${cell('status')}='active' AND lower(${cell('email')})<>'owner@orbit.test')`;
 const restoreArchived=db.prepare(`UPDATE operators SET ${columns.filter(name=>name!=='id').map(name=>{
  const value=archivedValue(name);
  return `${quoteIdentifier(name)}=${!rollback&&name==='setup_owner'?`CASE WHEN ${value}=1 AND ${currentOwner} THEN 0 ELSE ${value} END`:!rollback&&name==='status'?`CASE WHEN ${replacedTrialOwner} THEN 'removed' ELSE ${value} END`:value}`;
 }).join(',')} WHERE id IN(SELECT ${cell('id')} FROM ${archived})`);
 // Expressions read the immutable staged mailbox, never the temporary live one.
 const restoreCurrent=db.prepare(`UPDATE operators SET ${columns.filter(name=>name!=='id').map(name=>`${quoteIdentifier(name)}=${retainedValue(name)}`).join(',')} WHERE EXISTS(SELECT 1 FROM ${retained} r WHERE ${retainedMatch})`);
 return [
  db.prepare(`DELETE FROM operators WHERE id NOT IN(SELECT ${cell('id')} FROM ${archived})${rollback?'':` AND (id NOT IN(${retainedIds}) OR email IN(SELECT ${cell('email')} FROM ${archived}))`}`),
  db.prepare("UPDATE operators SET email='archive-final-'||id||'@invalid',setup_owner=0"),
  restoreArchived,
  ...(!rollback?[restoreCurrent]:[]),
  // Keep the local trial identity for historical attribution, without access or
  // future work assigned to it. Explicit current access still wins above.
  ...(!rollback?[
   db.prepare(`UPDATE opportunities SET owner_id=NULL WHERE lifecycle='open' AND owner_id IN(SELECT id FROM operators WHERE status='removed' AND ${replacedTrialOwner})`),
   db.prepare(`UPDATE outbound_messages SET state='cancelled',failure='Local trial owner replaced after restore' WHERE state='scheduled' AND operator_id IN(SELECT id FROM operators WHERE status='removed' AND ${replacedTrialOwner})`),
  ]:[]),
 ];
}
