import {salesProfile} from '../teams/policy';
import {isFullOperator} from '../access/identity-class';
import {mergeContext} from '../drafts/merge-authority';
import {libraryAudience} from '../drafts/library-repository';
import {WorkbenchError} from '../workbench/repository';
/** Approval fixes bytes, never a lasting grant to use a record, field or team library. */
export async function senderMaySend(db:D1Database,actor:string,draftId:string){
 const profile=await salesProfile(db,actor);
 if(!profile)return isFullOperator(db,actor);
 if(profile.role==='read-only')return false;
 const draft=await db.prepare('SELECT subject,body,library_selection_json FROM drafts WHERE id=?').bind(draftId).first<{subject:string;body:string;library_selection_json:string}>();
 if(!draft)return false;
 try{await mergeContext(db,draftId,actor,draft.subject+'\n'+draft.body);}catch(error){if(error instanceof WorkbenchError)return false;throw error;}
 const audience=libraryAudience(actor),selection=JSON.parse(draft.library_selection_json) as Record<string,{id:string}>;
 for(const entry of Object.values(selection)){
  // A revised or removed template never rewrites or invalidates its approved snapshot.
  // An existing entry whose audience was revoked is a current authority refusal.
  if(await db.prepare('SELECT 1 FROM message_library WHERE id=?').bind(entry.id).first()&&!await db.prepare(`SELECT 1 FROM message_library WHERE id=? AND ${audience.sql}`).bind(entry.id,...audience.args).first())return false;
 }
 return true;
}
