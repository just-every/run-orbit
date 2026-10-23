import {AccessService} from '../access/service';
import {AccessError} from '../access/errors';
import {fullOperatorFence,isFullOperator} from '../access/identity-class';
import type {AuthenticatedOperator} from '../identity';
import {audit} from '../records/shared';
import {CaptureError} from './contracts';

export type MailRule='review'|'recent'|'all';
export const mailRuleNames:Record<MailRule,string>={review:'Held for review',recent:'Most recently active open deal',all:'All of the contact’s open deals'};
export async function captureAccess(db:D1Database,operator:AuthenticatedOperator,write=false){
 if(!await isFullOperator(db,operator.operatorId))throw new CaptureError(403,'Capture requires a full operator session.');
 try{const access=new AccessService(db),actor=await access.authorizeLegacy(operator,crypto.randomUUID(),write?'legacy.write':'legacy.read');access.addDependencyFences(actor,fullOperatorFence(actor),'capture-native-class');return access.fence(actor,write?'write':'read').map(statement=>db.prepare(statement.sql).bind(...statement.bindings));}
 catch(error){if(error instanceof AccessError)throw new CaptureError(error.status,error.message);throw error;}
}
export async function readMailRule(db:D1Database){
 const row=await db.prepare("SELECT capture_mail_rule FROM workspace_settings WHERE id='workspace'").first<{capture_mail_rule:MailRule}>();
 if(!row)throw new CaptureError(503,'Initialize the workspace before capturing mail.');
 return row.capture_mail_rule;
}
export async function mailRuleSettings(db:D1Database,operator:AuthenticatedOperator){
 const fence=await captureAccess(db,operator);await db.batch(fence);
 const [rule,owner]=await Promise.all([readMailRule(db),db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(operator.operatorId).first()]);
 return {rule,canEdit:!!owner};
}
export async function saveMailRule(db:D1Database,operator:AuthenticatedOperator,rule:MailRule){
 const fence=await captureAccess(db,operator,true);
 if(!await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(operator.operatorId).first())throw new CaptureError(403,'Only the installation owner can change the workspace mail rule.');
 try{await db.batch([...fence,db.prepare("INSERT INTO runtime_controls(name,value) SELECT 'capture_rule_owner',NULL WHERE NOT EXISTS(SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active')").bind(operator.operatorId),db.prepare("UPDATE workspace_settings SET capture_mail_rule=?,updated_at=? WHERE id='workspace'").bind(rule,new Date().toISOString()),audit(db,operator.operatorId,'capture.mail_rule_changed','workspace','workspace',{rule})]);}
 catch(error){if(/constraint failed/i.test(String(error)))throw new CaptureError(409,'Workspace access changed. Reload before changing the mail rule.');throw error;}
 return {rule,canEdit:true};
}
