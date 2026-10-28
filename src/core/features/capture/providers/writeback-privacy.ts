import {privacyMatcher} from '../../records/suppression';
import {RecordError} from '../../records/shared';
const epochSql="SELECT COALESCE(MAX(rowid),0) FROM audit_entries WHERE action IN('capture.erased_item','capture.erased_mailbox')";
/** Erasing any attendee fences pending invitations, including those with no provider receipt. */
export async function calendarInvitePrivacy(db:D1Database,attendees:string[]){
 const epoch=await db.prepare(epochSql).first<number>('COALESCE(MAX(rowid),0)');
 if(epoch){
  const match=await privacyMatcher(db),tokens=(await Promise.all(attendees.map(email=>match(email)))).flat();
  if(await db.prepare("SELECT 1 FROM audit_entries WHERE action='capture.erased_mailbox' AND entity_id IN(SELECT value FROM json_each(?)) LIMIT 1").bind(JSON.stringify(tokens)).first())throw new RecordError(409,'An attendee was erased. No invitation can be sent to that address.');
 }
 return {sql:`COALESCE((${epochSql}),0)=?`,args:[epoch??0]};
}
