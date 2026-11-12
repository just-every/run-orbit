import {guard,clearGuards} from '../identity/store';
import {isFullOperator} from '../access/identity-class';
import {requireRecord} from '../records/shared';
import {SupportError,type Actor} from './contracts';
export async function requireActor(db:D1Database,actor:Actor,owner=false){
 if(!await isFullOperator(db,actor.operatorId)||!await db.prepare("SELECT 1 FROM sessions WHERE id=? AND operator_id=? AND revoked_at IS NULL AND expires_at>?").bind(actor.sessionId,actor.operatorId,new Date().toISOString()).first())throw new SupportError(403,'Current full operator access is required.');
 if(owner&&!await db.prepare("SELECT 1 FROM operators WHERE id=? AND setup_owner=1 AND status='active'").bind(actor.operatorId).first())throw new SupportError(403,'Only the installation owner manages the Zendesk connection.');
}
export async function company(db:D1Database,actor:Actor,id:string){await requireActor(db,actor);return requireRecord(db,'company',id);}
export function authorityGuard(db:D1Database,actor:Actor,owner=false){return guard(db,{sql:`EXISTS(SELECT 1 FROM sessions s JOIN operators o ON o.id=s.operator_id WHERE s.id=? AND o.id=? AND s.revoked_at IS NULL AND s.expires_at>? AND o.status='active' ${owner?'AND o.setup_owner=1':''} AND NOT EXISTS(SELECT 1 FROM access_collaborators x WHERE x.operator_id=o.id))`,args:[actor.sessionId,actor.operatorId,new Date().toISOString()]});}
export const endGuard=clearGuards;
